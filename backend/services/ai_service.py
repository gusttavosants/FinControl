import google.generativeai as genai
import httpx
import json
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from models import Receita, Despesa, User
from core.config import settings

# Configure Gemini (only if key is there)
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class AIService:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.user_id = user.id
        
        from datetime import datetime
        hj = datetime.now().strftime("%d/%m/%Y")
        self.system_instruction = (
            f"Você é o ZenBot, assistente financeiro do ZenCash. Você ajuda usuários a "
            f"gerenciar suas finanças pessoais de forma sofisticada e direta.\n"
            f"[CONTEXTO TEMPORAL: Hoje é {hj}]\n\n"
            f"REGRAS:\n"
            f"1. Responda SEMPRE em Português do Brasil\n"
            f"2. NUNCA use emojis (nenhum emoji deve aparecer no texto)\n"
            f"3. NUNCA utilize negrito (**) ou formatações Markdown ruidosas nas respostas. Mantenha o texto limpo, elegante e direto (plain text puro).\n"
            f"4. Valores monetários SEMPRE no formato R$ X.XXX,XX\n"
            f"5. Datas SEMPRE no formato DD/MM/YYYY. Use o CONTEXTO TEMPORAL acima para calcular 'hoje', 'ontem', etc.\n"
            f"6. Seja extremamente conciso — máximo 2 parágrafos curtos por resposta\n"
            f"7. Nunca invente dados — use apenas as functions disponíveis\n"
            f"8. Se não souber a categoria, use 'Diversos' (despesa) ou 'Outros' (receita)\n"
            f"9. Se faltar informação, PERGUNTE ao usuário de forma educada\n"
            f"10. Sempre confirme a ação realizada com os dados exatos, de forma limpa"
        )

    # --- Tool Definitions (Shared) ---
    
    def get_tools_schema(self):
        """Returns tools schema in OpenAI format (standard for OpenRouter)."""
        return [
            {
                "type": "function",
                "function": {
                    "name": "criar_receita",
                    "description": "Cria uma nova receita (entrada de dinheiro).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "descricao": {"type": "string"},
                            "categoria": {"type": "string"},
                            "valor": {"type": "number"},
                            "data": {"type": "string", "description": "Formato YYYY-MM-DD"},
                            "observacoes": {"type": "string"}
                        },
                        "required": ["descricao", "categoria", "valor", "data"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "criar_despesa",
                    "description": "Cria uma nova despesa (conta a pagar).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "descricao": {"type": "string"},
                            "categoria": {"type": "string"},
                            "valor": {"type": "number"},
                            "data_vencimento": {"type": "string", "description": "Formato YYYY-MM-DD"},
                            "pago": {"type": "boolean"},
                            "observacoes": {"type": "string"}
                        },
                        "required": ["descricao", "categoria", "valor", "data_vencimento"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "obter_resumo_financeiro",
                    "description": "Calcula o resumo (total receitas, despesas, saldo) de um período.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "mes": {"type": "integer"},
                            "ano": {"type": "integer"}
                        },
                        "required": ["mes", "ano"]
                    }
                }
            }
        ]

    # --- Tool Execution Logic ---

    def execute_tool(self, name: str, args: Dict[str, Any]) -> Any:
        """Dispatches tool execution to the correct local method."""
        if name == "criar_receita":
            return self.criar_receita(**args)
        elif name == "criar_despesa":
            return self.criar_despesa(**args)
        elif name == "obter_resumo_financeiro":
            return self.obter_resumo_financeiro(**args)
        return {"error": f"Tool {name} not found"}

    def criar_receita(self, descricao: str, categoria: str, valor: float, data: str, observacoes: Optional[str] = None):
        try:
            data_obj = datetime.strptime(data, "%Y-%m-%d").date()
            nova = Receita(user_id=self.user_id, descricao=descricao, categoria=categoria, valor=valor, data=data_obj, observacoes=observacoes)
            self.db.add(nova); self.db.commit(); self.db.refresh(nova)
            return {"status": "success", "id": nova.id, "message": "Receita criada"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def criar_despesa(self, descricao: str, categoria: str, valor: float, data_vencimento: str, pago: bool = False, observacoes: Optional[str] = None):
        try:
            data_obj = datetime.strptime(data_vencimento, "%Y-%m-%d").date()
            nova = Despesa(user_id=self.user_id, descricao=descricao, categoria=categoria, valor=valor, data_vencimento=data_obj, pago=pago, data_pagamento=data_obj if pago else None, observacoes=observacoes)
            self.db.add(nova); self.db.commit(); self.db.refresh(nova)
            return {"status": "success", "id": nova.id, "message": "Despesa criada"}
        except Exception as e: return {"status": "error", "message": str(e)}

    def obter_resumo_financeiro(self, mes: int, ano: int):
        r = self.db.query(func.sum(Receita.valor)).filter(Receita.user_id == self.user_id, extract('month', Receita.data) == mes, extract('year', Receita.data) == ano).scalar() or 0
        d = self.db.query(func.sum(Despesa.valor)).filter(Despesa.user_id == self.user_id, extract('month', Despesa.data_vencimento) == mes, extract('year', Despesa.data_vencimento) == ano).scalar() or 0
        return {"total_receitas": float(r), "total_despesas": float(d), "saldo": float(r - d)}

    # --- Chat Implementation (OpenRouter) ---

    async def _chat_openrouter(self, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Main chat logic via OpenRouter (OpenAI Compatible)."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://zencash.com",
            "X-Title": "ZenCash",
            "Content-Type": "application/json"
        }
        
        messages = [{"role": "system", "content": self.system_instruction}]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})
        
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "tools": self.get_tools_schema(),
            "tool_choice": "auto"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload, timeout=60.0)
            if resp.status_code != 200:
                return {"reply": f"❌ Erro OpenRouter ({resp.status_code}): {resp.text}", "actions": []}
            
            data = resp.json()
            choice = data["choices"][0]["message"]
            
            # Handle Tool Calls
            if "tool_calls" in choice:
                actions = []
                for tool_call in choice["tool_calls"]:
                    name = tool_call["function"]["name"]
                    args = json.loads(tool_call["function"]["arguments"])
                    result = self.execute_tool(name, args)
                    
                    # Add to tracking
                    if "receita" in name: actions.append({"type": "receita_added", "data": result})
                    if "despesa" in name: actions.append({"type": "despesa_added", "data": result})

                # Call again with tool results to get final reply
                messages.append(choice)
                for tool_call in choice["tool_calls"]:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": tool_call["function"]["name"],
                        "content": json.dumps(result)
                    })
                
                # Second hop
                resp2 = await client.post(url, headers=headers, json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": messages
                }, timeout=30.0)
                final_text = resp2.json()["choices"][0]["message"]["content"]
                return {"reply": final_text, "actions": actions}
            
            return {"reply": choice["content"], "actions": []}

    # --- Chat Implementation (Gemini) ---

    async def _chat_gemini(self, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Fallback chat logic via Google Gemini."""
        # Simple implementation since the primary goal is helping with OpenRouter
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            tools=[self.criar_receita, self.criar_despesa, self.obter_resumo_financeiro],
            system_instruction=self.system_instruction
        )
        gemini_history = []
        for h in history:
            gemini_history.append({"role": "user" if h["role"] == "user" else "model", "parts": [h["content"]]})
        
        chat = model.start_chat(history=gemini_history, enable_automatic_function_calling=True)
        resp = await chat.send_message_async(message)
        
        actions = []
        for part in resp.candidates[0].content.parts:
            if part.function_call:
                name = part.function_call.name
                if "receita" in name: actions.append({"type": "receita_added", "data": {}})
                if "despesa" in name: actions.append({"type": "despesa_added", "data": {}})
        
        return {"reply": resp.text, "actions": actions}

    # --- Public API ---

    async def chat(self, message: str, history: List[Dict[str, str]] = None, session_id: int = None) -> Dict[str, Any]:
        from models import ChatSession, ChatMessage
        from sqlalchemy.sql import func
        
        # 1. Obter ou Criar Sessão
        if session_id:
            session = self.db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == self.user_id).first()
            if not session:
                session = ChatSession(user_id=self.user_id, title=message[:40] + "...")
                self.db.add(session); self.db.commit(); self.db.refresh(session)
        else:
            session = ChatSession(user_id=self.user_id, title=message[:40] + "...")
            self.db.add(session); self.db.commit(); self.db.refresh(session)
            
        session_id = session.id
        session.updated_at = func.now() # Atualiza data p/ não cair na lixeira
        
        # 2. Salvar Mensagem do Usuário
        user_msg = ChatMessage(session_id=session_id, role="user", content=message)
        self.db.add(user_msg)
        self.db.commit()
        
        # 3. Carregar Histórico Confiável do Banco
        db_messages = self.db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id.asc()).all()
        history_from_db = [{"role": m.role, "content": m.content} for m in db_messages[:-1]]
        
        # 4. Chamar IA
        result = {"reply": "⚠️ Nenhuma IA configurada.", "actions": []}
        if settings.OPENROUTER_API_KEY:
            result = await self._chat_openrouter(message, history_from_db)
        elif settings.GEMINI_API_KEY:
            result = await self._chat_gemini(message, history_from_db)
            
        # 5. Salvar Resposta da IA
        assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=result["reply"])
        self.db.add(assistant_msg)
        self.db.commit()
        
        result["session_id"] = session_id
        return result

