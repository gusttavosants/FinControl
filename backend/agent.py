import io
import re
import unicodedata
import pandas as pd
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from models import Receita, Despesa, Meta

CATEGORIAS_RECEITA = [
    "Salário", "Freelance", "Investimentos", "Aluguel Recebido",
    "Comissão", "Bônus", "Outros"
]

CATEGORIAS_DESPESA = [
    "Alimentação", "Aluguel", "Carne", "Crédito", "Débito",
    "Diversos", "Empréstimo", "Financiamento", "Gás",
    "Hipermercado", "Locação", "Uber/Transporte", "Vestuário"
]

# Mapeamento de palavras-chave para categorias de despesa
KEYWORDS_DESPESA = {
    "alimentação": "Alimentação", "alimentacao": "Alimentação", "comida": "Alimentação",
    "restaurante": "Alimentação", "lanche": "Alimentação", "ifood": "Alimentação",
    "mercado": "Hipermercado", "hipermercado": "Hipermercado", "supermercado": "Hipermercado",
    "compras": "Hipermercado",
    "aluguel": "Aluguel", "moradia": "Aluguel", "condominio": "Aluguel", "condomínio": "Aluguel",
    "carne": "Carne", "açougue": "Carne", "acougue": "Carne",
    "credito": "Crédito", "crédito": "Crédito", "cartao": "Crédito", "cartão": "Crédito",
    "debito": "Débito", "débito": "Débito",
    "emprestimo": "Empréstimo", "empréstimo": "Empréstimo",
    "financiamento": "Financiamento", "parcela": "Financiamento",
    "gas": "Gás", "gás": "Gás", "botijao": "Gás", "botijão": "Gás",
    "uber": "Uber/Transporte", "transporte": "Uber/Transporte", "onibus": "Uber/Transporte",
    "ônibus": "Uber/Transporte", "gasolina": "Uber/Transporte", "combustivel": "Uber/Transporte",
    "combustível": "Uber/Transporte", "99": "Uber/Transporte",
    "roupa": "Vestuário", "vestuario": "Vestuário", "vestuário": "Vestuário",
    "calçado": "Vestuário", "calcado": "Vestuário", "tênis": "Vestuário", "tenis": "Vestuário",
    "locação": "Locação", "locacao": "Locação",
    "luz": "Diversos", "agua": "Diversos", "água": "Diversos", "internet": "Diversos",
    "telefone": "Diversos", "celular": "Diversos", "conta": "Diversos",
}

# Mapeamento de palavras-chave para categorias de receita
KEYWORDS_RECEITA = {
    "salario": "Salário", "salário": "Salário", "holerite": "Salário", "pagamento": "Salário",
    "freelance": "Freelance", "freela": "Freelance", "bico": "Freelance", "extra": "Freelance",
    "investimento": "Investimentos", "investimentos": "Investimentos", "rendimento": "Investimentos",
    "dividendo": "Investimentos", "juros": "Investimentos",
    "aluguel recebido": "Aluguel Recebido", "inquilino": "Aluguel Recebido",
    "comissao": "Comissão", "comissão": "Comissão",
    "bonus": "Bônus", "bônus": "Bônus", "bonificacao": "Bônus", "bonificação": "Bônus",
    "13": "Bônus", "décimo": "Bônus", "decimo": "Bônus",
}


def _normalize(text: str) -> str:
    """Remove acentos e converte para minúsculo."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def _format_currency(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _extract_value(text: str) -> float | None:
    """Extrai valor monetário do texto."""
    text = text.replace("R$", "").replace("r$", "")
    # Formato brasileiro: 1.900,00 ou 1900,50
    m = re.search(r"(\d{1,3}(?:\.\d{3})*,\d{1,2})", text)
    if m:
        return float(m.group(1).replace(".", "").replace(",", "."))
    # Formato simples: 1900 ou 1900.50
    m = re.search(r"(\d+(?:\.\d{1,2})?)", text)
    if m:
        return float(m.group(1))
    return None


def _extract_date(text: str) -> date | None:
    """Extrai data do texto em vários formatos."""
    # DD/MM/YYYY
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    # DD/MM (assume ano atual)
    m = re.search(r"(\d{1,2})/(\d{1,2})(?!\d)", text)
    if m:
        try:
            return date(date.today().year, int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    # YYYY-MM-DD
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    return None


def _guess_categoria_despesa(text: str) -> str:
    """Tenta adivinhar a categoria de despesa pelo texto."""
    lower = _normalize(text)
    for keyword, cat in KEYWORDS_DESPESA.items():
        if _normalize(keyword) in lower:
            return cat
    return "Diversos"


def _guess_categoria_receita(text: str) -> str:
    """Tenta adivinhar a categoria de receita pelo texto."""
    lower = _normalize(text)
    for keyword, cat in KEYWORDS_RECEITA.items():
        if _normalize(keyword) in lower:
            return cat
    return "Outros"


def _extract_description(text: str, tipo: str) -> str:
    """Extrai a descrição removendo palavras de comando e valores."""
    desc = text
    # Remove palavras de comando
    remove_patterns = [
        r"(?i)^(adicionar?|incluir?|lançar?|lancar?|registrar?|colocar?|por|bota[r]?|nova?|novo?)\s+",
        r"(?i)(despesa|receita|gasto|conta|entrada|renda)\s*(de|do|da)?\s*",
        r"(?i)(no valor de|valor|de)\s*r?\$?\s*[\d.,]+",
        r"(?i)r?\$\s*[\d.,]+",
        r"[\d.,]+\s*(?:reais|real)?",
        r"(?i)(por favor|pf|pfv|please)",
        r"(?i)(vencimento|vence|para|em|dia)\s*\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?",
        r"\d{1,2}/\d{1,2}(?:/\d{2,4})?",
        r"\d{4}-\d{2}-\d{2}",
    ]
    for pattern in remove_patterns:
        desc = re.sub(pattern, " ", desc)
    desc = re.sub(r"\s+", " ", desc).strip()
    desc = desc.strip("- ,;:.!?")
    if not desc:
        desc = tipo.capitalize()
    return desc.capitalize()


def _detect_intent(text: str) -> str | None:
    """Detecta a intenção do usuário."""
    lower = _normalize(text)

    # Adicionar receita
    receita_words = ["receita", "entrada", "renda", "ganho", "ganhei", "recebi", "receber"]
    despesa_words = ["despesa", "gasto", "gastei", "conta", "pagar", "pagamento", "paguei", "boleto", "fatura"]
    add_words = ["adicionar", "adiciona", "incluir", "inclui", "lancar", "lanca", "registrar", "registra",
                 "colocar", "coloca", "botar", "bota", "nova", "novo", "por"]
    list_words = ["listar", "lista", "mostrar", "mostra", "ver", "quais", "minhas", "meus"]
    delete_words = ["deletar", "deleta", "remover", "remove", "excluir", "exclui", "apagar", "apaga"]
    paid_words = ["pagar", "paga", "paguei", "marcar", "marca", "quitar", "quitei"]
    summary_words = ["resumo", "saldo", "balanco", "balanço", "quanto", "total", "como estou", "situacao", "situação"]
    meta_words = ["meta", "objetivo", "guardar", "juntar", "economizar", "poupar"]
    help_words = ["ajuda", "help", "comandos", "o que voce faz", "o que você faz", "como funciona", "oi", "ola", "olá"]

    # Prioridade: detectar tipo + ação
    has_add = any(w in lower for w in add_words)
    has_list = any(w in lower for w in list_words)
    has_delete = any(w in lower for w in delete_words)
    has_paid = any(w in lower for w in paid_words)
    has_receita = any(w in lower for w in receita_words)
    has_despesa = any(w in lower for w in despesa_words)
    has_summary = any(w in lower for w in summary_words)
    has_meta = any(w in lower for w in meta_words)
    has_help = any(w in lower for w in help_words)

    if has_help and not (has_add or has_list or has_delete or has_paid or has_receita or has_despesa):
        return "ajuda"
    if has_summary:
        return "resumo"
    if has_meta and has_list:
        return "listar_metas"
    if has_meta and has_add:
        return "adicionar_meta"
    if has_delete and has_receita:
        return "deletar_receita"
    if has_delete and has_despesa:
        return "deletar_despesa"
    if has_paid:
        return "marcar_paga"
    if has_list and has_receita:
        return "listar_receitas"
    if has_list and has_despesa:
        return "listar_despesas"
    if has_list:
        return "listar_despesas"
    if has_receita:
        return "adicionar_receita"
    if has_despesa or has_add:
        return "adicionar_despesa"

    # Se tem valor numérico, provavelmente quer adicionar algo
    if _extract_value(text) is not None:
        return "adicionar_despesa"

    return None


def chat_with_agent(message: str, history: list, db: Session) -> dict:
    """Process a chat message through the rule-based agent."""
    hoje = date.today()
    intent = _detect_intent(message)

    if intent == "ajuda":
        return {
            "reply": (
                "👋 Olá! Eu sou o **FinBot**, seu assistente financeiro!\n\n"
                "Aqui está o que eu posso fazer por você:\n\n"
                "💰 **Adicionar receita** — Ex: *\"receita salário 3500\"*\n"
                "💸 **Adicionar despesa** — Ex: *\"despesa aluguel 1200\"*\n"
                "📋 **Listar despesas** — Ex: *\"listar despesas\"*\n"
                "📋 **Listar receitas** — Ex: *\"listar receitas\"*\n"
                "📊 **Ver resumo** — Ex: *\"resumo\"* ou *\"saldo\"*\n"
                "✅ **Marcar paga** — Ex: *\"pagar despesa 5\"*\n"
                "🗑️ **Deletar** — Ex: *\"deletar despesa 3\"*\n"
                "🎯 **Metas** — Ex: *\"adicionar meta viagem 5000\"*\n\n"
                "Pode me dizer o que precisa! 😊"
            ),
            "actions": [],
        }

    elif intent == "adicionar_receita":
        valor = _extract_value(message)
        if valor is None:
            return {"reply": "💰 Qual o valor da receita? Ex: *\"receita salário 3500\"*", "actions": []}

        categoria = _guess_categoria_receita(message)
        descricao = _extract_description(message, "receita")
        data_val = _extract_date(message) or hoje

        receita = Receita(
            descricao=descricao,
            categoria=categoria,
            valor=valor,
            data=data_val,
        )
        db.add(receita)
        db.commit()
        db.refresh(receita)

        return {
            "reply": (
                f"✅ Receita adicionada com sucesso!\n\n"
                f"📝 **{receita.descricao}**\n"
                f"📂 Categoria: {receita.categoria}\n"
                f"💰 Valor: {_format_currency(receita.valor)}\n"
                f"📅 Data: {receita.data.strftime('%d/%m/%Y')}"
            ),
            "actions": [{"type": "receita_added", "data": {"id": receita.id}}],
        }

    elif intent == "adicionar_despesa":
        valor = _extract_value(message)
        if valor is None:
            return {"reply": "💸 Qual o valor da despesa? Ex: *\"despesa luz 150\"*", "actions": []}

        categoria = _guess_categoria_despesa(message)
        descricao = _extract_description(message, "despesa")
        data_val = _extract_date(message) or hoje

        despesa = Despesa(
            descricao=descricao,
            categoria=categoria,
            valor=valor,
            data_vencimento=data_val,
            pago=False,
        )
        db.add(despesa)
        db.commit()
        db.refresh(despesa)

        return {
            "reply": (
                f"✅ Despesa adicionada com sucesso!\n\n"
                f"📝 **{despesa.descricao}**\n"
                f"📂 Categoria: {despesa.categoria}\n"
                f"💸 Valor: {_format_currency(despesa.valor)}\n"
                f"📅 Vencimento: {despesa.data_vencimento.strftime('%d/%m/%Y')}\n"
                f"⏳ Status: Pendente"
            ),
            "actions": [{"type": "despesa_added", "data": {"id": despesa.id}}],
        }

    elif intent == "listar_despesas":
        despesas = db.query(Despesa).filter(
            extract("month", Despesa.data_vencimento) == hoje.month,
            extract("year", Despesa.data_vencimento) == hoje.year,
        ).order_by(Despesa.data_vencimento.asc()).all()

        if not despesas:
            return {"reply": "📋 Nenhuma despesa encontrada neste mês.", "actions": []}

        total = sum(d.valor for d in despesas)
        lines = [f"📋 **Despesas de {hoje.strftime('%m/%Y')}:**\n"]
        for d in despesas:
            status = "✅" if d.pago else "⏳"
            lines.append(f"{status} **#{d.id}** {d.descricao} — {_format_currency(d.valor)} ({d.categoria})")
        lines.append(f"\n💰 **Total: {_format_currency(total)}**")

        return {"reply": "\n".join(lines), "actions": []}

    elif intent == "listar_receitas":
        receitas = db.query(Receita).filter(
            extract("month", Receita.data) == hoje.month,
            extract("year", Receita.data) == hoje.year,
        ).order_by(Receita.data.desc()).all()

        if not receitas:
            return {"reply": "📋 Nenhuma receita encontrada neste mês.", "actions": []}

        total = sum(r.valor for r in receitas)
        lines = [f"📋 **Receitas de {hoje.strftime('%m/%Y')}:**\n"]
        for r in receitas:
            lines.append(f"💰 **#{r.id}** {r.descricao} — {_format_currency(r.valor)} ({r.categoria})")
        lines.append(f"\n💰 **Total: {_format_currency(total)}**")

        return {"reply": "\n".join(lines), "actions": []}

    elif intent == "resumo":
        total_receitas = db.query(func.coalesce(func.sum(Receita.valor), 0)).filter(
            extract("month", Receita.data) == hoje.month,
            extract("year", Receita.data) == hoje.year,
        ).scalar()

        total_despesas = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
            extract("month", Despesa.data_vencimento) == hoje.month,
            extract("year", Despesa.data_vencimento) == hoje.year,
        ).scalar()

        despesas_pagas = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
            extract("month", Despesa.data_vencimento) == hoje.month,
            extract("year", Despesa.data_vencimento) == hoje.year,
            Despesa.pago == True,
        ).scalar()

        saldo = float(total_receitas) - float(total_despesas)
        pendentes = float(total_despesas) - float(despesas_pagas)
        emoji_saldo = "🟢" if saldo >= 0 else "🔴"

        return {
            "reply": (
                f"📊 **Resumo de {hoje.strftime('%m/%Y')}:**\n\n"
                f"💰 Receitas: {_format_currency(float(total_receitas))}\n"
                f"💸 Despesas: {_format_currency(float(total_despesas))}\n"
                f"✅ Pagas: {_format_currency(float(despesas_pagas))}\n"
                f"⏳ Pendentes: {_format_currency(pendentes)}\n"
                f"{emoji_saldo} **Saldo: {_format_currency(saldo)}**"
            ),
            "actions": [],
        }

    elif intent == "marcar_paga":
        m = re.search(r"(\d+)", message)
        if not m:
            return {"reply": "🔢 Qual o ID da despesa? Ex: *\"pagar despesa 5\"*", "actions": []}
        despesa_id = int(m.group(1))
        despesa = db.query(Despesa).filter(Despesa.id == despesa_id).first()
        if not despesa:
            return {"reply": f"❌ Despesa #{despesa_id} não encontrada.", "actions": []}
        despesa.pago = not despesa.pago
        despesa.data_pagamento = hoje if despesa.pago else None
        db.commit()
        db.refresh(despesa)
        status = "paga ✅" if despesa.pago else "pendente ⏳"
        return {
            "reply": f"{'✅' if despesa.pago else '⏳'} Despesa **#{despesa.id} — {despesa.descricao}** marcada como **{status}**!",
            "actions": [{"type": "despesa_updated", "data": {"id": despesa.id}}],
        }

    elif intent == "deletar_despesa":
        m = re.search(r"(\d+)", message)
        if not m:
            return {"reply": "🔢 Qual o ID da despesa? Ex: *\"deletar despesa 3\"*", "actions": []}
        despesa_id = int(m.group(1))
        despesa = db.query(Despesa).filter(Despesa.id == despesa_id).first()
        if not despesa:
            return {"reply": f"❌ Despesa #{despesa_id} não encontrada.", "actions": []}
        desc = despesa.descricao
        db.delete(despesa)
        db.commit()
        return {
            "reply": f"🗑️ Despesa **#{despesa_id} — {desc}** removida com sucesso!",
            "actions": [{"type": "despesa_deleted", "data": {"id": despesa_id}}],
        }

    elif intent == "deletar_receita":
        m = re.search(r"(\d+)", message)
        if not m:
            return {"reply": "🔢 Qual o ID da receita? Ex: *\"deletar receita 2\"*", "actions": []}
        receita_id = int(m.group(1))
        receita = db.query(Receita).filter(Receita.id == receita_id).first()
        if not receita:
            return {"reply": f"❌ Receita #{receita_id} não encontrada.", "actions": []}
        desc = receita.descricao
        db.delete(receita)
        db.commit()
        return {
            "reply": f"🗑️ Receita **#{receita_id} — {desc}** removida com sucesso!",
            "actions": [{"type": "receita_deleted", "data": {"id": receita_id}}],
        }

    elif intent == "adicionar_meta":
        valor = _extract_value(message)
        if valor is None:
            return {"reply": "🎯 Qual o valor da meta? Ex: *\"meta viagem 5000\"*", "actions": []}
        descricao = _extract_description(message, "meta")
        meta = Meta(
            descricao=descricao,
            valor_alvo=valor,
            valor_atual=0,
        )
        db.add(meta)
        db.commit()
        db.refresh(meta)
        return {
            "reply": (
                f"🎯 Meta criada com sucesso!\n\n"
                f"📝 **{meta.descricao}**\n"
                f"💰 Valor alvo: {_format_currency(meta.valor_alvo)}\n"
                f"📊 Progresso: 0%"
            ),
            "actions": [{"type": "meta_added", "data": {"id": meta.id}}],
        }

    elif intent == "listar_metas":
        metas = db.query(Meta).order_by(Meta.concluida.asc(), Meta.prazo.asc()).all()
        if not metas:
            return {"reply": "🎯 Nenhuma meta cadastrada.", "actions": []}
        lines = ["🎯 **Suas metas:**\n"]
        for m in metas:
            pct = (m.valor_atual / m.valor_alvo * 100) if m.valor_alvo > 0 else 0
            status = "✅" if m.concluida else f"{pct:.0f}%"
            lines.append(f"**#{m.id}** {m.descricao} — {_format_currency(m.valor_atual)}/{_format_currency(m.valor_alvo)} ({status})")
        return {"reply": "\n".join(lines), "actions": []}

    # Não entendeu
    return {
        "reply": (
            "🤔 Não entendi o que você quer fazer. Tente algo como:\n\n"
            "💰 *\"receita salário 3500\"*\n"
            "💸 *\"despesa aluguel 1200\"*\n"
            "📋 *\"listar despesas\"*\n"
            "📊 *\"resumo\"*\n"
            "📎 Ou **anexe uma planilha** Excel para importar despesas/receitas!\n"
            "❓ *\"ajuda\"* — para ver todos os comandos"
        ),
        "actions": [],
    }


# --- Mapeamento de categorias da planilha para categorias do sistema ---
CATEGORIA_MAP = {
    "carne": "Carne",
    "divida": "Crédito", "dívida": "Crédito",
    "emprestimo": "Empréstimo", "empréstimo": "Empréstimo",
    "consorcio": "Financiamento", "consórcio": "Financiamento",
    "locacao": "Locação", "locação": "Locação",
    "credito": "Crédito", "crédito": "Crédito",
    "financiamento": "Financiamento",
    "alimentacao": "Alimentação", "alimentação": "Alimentação",
    "veiculo": "Uber/Transporte", "veículo": "Uber/Transporte",
    "moto": "Uber/Transporte",
    "utilidades": "Diversos",
    "saude": "Diversos", "saúde": "Diversos",
    "outros": "Diversos",
    "aluguel": "Aluguel",
    "hipermercado": "Hipermercado",
    "supermercado": "Hipermercado",
    "gas": "Gás", "gás": "Gás",
    "vestuario": "Vestuário", "vestuário": "Vestuário",
    "transporte": "Uber/Transporte",
    "debito": "Débito", "débito": "Débito",
    # Receitas
    "salario": "Salário", "salário": "Salário",
    "freelance": "Freelance",
    "investimentos": "Investimentos", "investimento": "Investimentos",
    "aluguel recebido": "Aluguel Recebido",
    "comissao": "Comissão", "comissão": "Comissão",
    "bonus": "Bônus", "bônus": "Bônus",
}


def _map_categoria(cat_raw: str) -> str:
    """Mapeia categoria da planilha para categoria do sistema."""
    normalized = _normalize(cat_raw)
    for key, val in CATEGORIA_MAP.items():
        if _normalize(key) == normalized:
            return val
    # Tenta match parcial
    for key, val in CATEGORIA_MAP.items():
        if _normalize(key) in normalized or normalized in _normalize(key):
            return val
    return "Diversos"


def _parse_valor(val) -> float | None:
    """Converte valor da planilha para float."""
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    s = s.replace("R$", "").replace("r$", "").strip()
    # Formato brasileiro: 1.234,56
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _parse_date(val) -> date | None:
    """Converte data da planilha para date."""
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_parcelas(val) -> tuple[int | None, int | None]:
    """Extrai parcela_atual e parcela_total de texto como '4/4', '2/12'."""
    if pd.isna(val):
        return None, None
    s = str(val).strip()
    m = re.match(r"(\d+)\s*/\s*(\d+)", s)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def _find_header_row(df: pd.DataFrame) -> int | None:
    """Encontra a linha que contém os cabeçalhos (Descrição, Categoria, Valor, Data)."""
    for idx, row in df.iterrows():
        row_text = " ".join(str(c).lower() for c in row.values if pd.notna(c))
        if "descri" in row_text and ("valor" in row_text or "r$" in row_text):
            return idx
    return None


def _detect_section(df: pd.DataFrame, start_row: int) -> str:
    """Detecta se a seção acima do header é RECEITAS ou DESPESAS."""
    for idx in range(start_row - 1, max(start_row - 5, -1), -1):
        if idx < 0:
            break
        row_text = " ".join(str(c).lower() for c in df.iloc[idx].values if pd.notna(c))
        if "receita" in row_text:
            return "receita"
        if "despesa" in row_text:
            return "despesa"
    return "despesa"


def import_spreadsheet(file_bytes: bytes, filename: str, db: Session) -> dict:
    """Parse and import a spreadsheet (xlsx/xls/csv) into the database."""
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes), header=None)
        else:
            df = pd.read_excel(io.BytesIO(file_bytes), header=None)
    except Exception as e:
        return {
            "reply": f"❌ Erro ao ler o arquivo: {str(e)}",
            "actions": [],
        }

    if df.empty:
        return {"reply": "❌ A planilha está vazia.", "actions": []}

    # Encontrar seções de RECEITAS e DESPESAS
    receitas_added = 0
    despesas_added = 0
    errors = []
    actions = []
    hoje = date.today()

    # Procurar todas as seções com headers
    sections = []
    for idx, row in df.iterrows():
        row_text = " ".join(str(c).lower() for c in row.values if pd.notna(c))
        if "descri" in row_text and ("valor" in row_text or "r$" in row_text):
            tipo = _detect_section(df, idx)
            # Mapear colunas
            col_map = {}
            for col_idx, cell in enumerate(row.values):
                if pd.isna(cell):
                    continue
                cell_lower = str(cell).lower().strip()
                if "descri" in cell_lower:
                    col_map["descricao"] = col_idx
                elif "categori" in cell_lower:
                    col_map["categoria"] = col_idx
                elif "valor" in cell_lower:
                    col_map["valor"] = col_idx
                elif "data" in cell_lower or "vencimento" in cell_lower:
                    col_map["data"] = col_idx
                elif "parcela" in cell_lower:
                    col_map["parcelas"] = col_idx
                elif "observa" in cell_lower or "obs" in cell_lower:
                    col_map["observacoes"] = col_idx
            sections.append({"start": idx + 1, "tipo": tipo, "cols": col_map})

    if not sections:
        return {
            "reply": "❌ Não encontrei cabeçalhos na planilha. Certifique-se que ela tenha colunas como **Descrição**, **Categoria**, **Valor** e **Data**.",
            "actions": [],
        }

    # Definir limites de cada seção
    for i, sec in enumerate(sections):
        if i + 1 < len(sections):
            sec["end"] = sections[i + 1]["start"] - 2
        else:
            sec["end"] = len(df)

    for sec in sections:
        cols = sec["cols"]
        if "descricao" not in cols or "valor" not in cols:
            continue

        for idx in range(sec["start"], sec["end"]):
            if idx >= len(df):
                break
            row = df.iloc[idx]

            # Pegar descrição
            desc_val = row.iloc[cols["descricao"]] if "descricao" in cols else None
            if pd.isna(desc_val) or str(desc_val).strip() == "":
                continue

            descricao = str(desc_val).strip()

            # Pegar valor
            valor = _parse_valor(row.iloc[cols["valor"]]) if "valor" in cols else None
            if valor is None or valor <= 0:
                continue

            # Pegar categoria
            cat_raw = str(row.iloc[cols["categoria"]]).strip() if "categoria" in cols and pd.notna(row.iloc[cols["categoria"]]) else ""
            categoria = _map_categoria(cat_raw) if cat_raw else "Diversos"

            # Pegar data
            data_val = _parse_date(row.iloc[cols["data"]]) if "data" in cols else None
            if data_val is None:
                data_val = hoje

            # Pegar observações
            obs = None
            if "observacoes" in cols and pd.notna(row.iloc[cols["observacoes"]]):
                obs_text = str(row.iloc[cols["observacoes"]]).strip()
                if obs_text and obs_text.lower() not in ("nan", "none"):
                    obs = obs_text

            # Detectar se está pago (pela coluna observações)
            pago = False
            if obs and "pago" in obs.lower():
                pago = True

            try:
                if sec["tipo"] == "receita":
                    receita = Receita(
                        descricao=descricao,
                        categoria=categoria if categoria in CATEGORIAS_RECEITA else "Outros",
                        valor=valor,
                        data=data_val,
                        observacoes=obs,
                    )
                    db.add(receita)
                    receitas_added += 1
                else:
                    parcela_atual, parcela_total = None, None
                    if "parcelas" in cols and pd.notna(row.iloc[cols["parcelas"]]):
                        parcela_atual, parcela_total = _parse_parcelas(row.iloc[cols["parcelas"]])

                    despesa = Despesa(
                        descricao=descricao,
                        categoria=categoria if categoria in CATEGORIAS_DESPESA else "Diversos",
                        valor=valor,
                        data_vencimento=data_val,
                        pago=pago,
                        data_pagamento=data_val if pago else None,
                        parcela_atual=parcela_atual,
                        parcela_total=parcela_total,
                        observacoes=obs,
                    )
                    db.add(despesa)
                    despesas_added += 1
            except Exception as e:
                errors.append(f"Linha {idx + 1}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"reply": f"❌ Erro ao salvar no banco: {str(e)}", "actions": []}

    # Montar resposta
    lines = ["📎 **Importação concluída!**\n"]
    if receitas_added > 0:
        lines.append(f"💰 **{receitas_added}** receita(s) importada(s)")
        actions.append({"type": "receita_added", "data": {}})
    if despesas_added > 0:
        lines.append(f"💸 **{despesas_added}** despesa(s) importada(s)")
        actions.append({"type": "despesa_added", "data": {}})
    if receitas_added == 0 and despesas_added == 0:
        lines.append("⚠️ Nenhum registro encontrado na planilha.")
    if errors:
        lines.append(f"\n⚠️ {len(errors)} erro(s) durante a importação.")

    return {"reply": "\n".join(lines), "actions": actions}


def process_recurring_expenses(db: Session) -> dict:
    """Process recurring expenses and create new ones as needed."""
    from dateutil.relativedelta import relativedelta
    from datetime import timedelta

    hoje = date.today()
    processed = 0
    errors = []

    try:
        # Buscar despesas recorrentes ativas
        recurring_expenses = db.query(Despesa).filter(
            Despesa.recorrente == True
        ).all()

        for expense in recurring_expenses:
            try:
                # Calcular próxima data de vencimento baseada na frequência
                if expense.frequencia_recorrencia == "mensal":
                    next_date = expense.data_vencimento + relativedelta(months=1)
                elif expense.frequencia_recorrencia == "semanal":
                    next_date = expense.data_vencimento + timedelta(days=7)
                elif expense.frequencia_recorrencia == "anual":
                    next_date = expense.data_vencimento + relativedelta(years=1)
                else:
                    continue  # Frequência inválida

                # Só criar se a próxima data já passou ou é hoje
                # E se ainda não existe uma despesa futura para essa recorrência
                if next_date <= hoje:
                    # Verificar se já existe uma despesa futura para essa recorrência
                    future_expense = db.query(Despesa).filter(
                        Despesa.descricao == expense.descricao,
                        Despesa.recorrente == True,
                        Despesa.frequencia_recorrencia == expense.frequencia_recorrencia,
                        Despesa.data_vencimento == next_date
                    ).first()

                    if not future_expense:
                        # Criar nova despesa recorrente
                        new_expense = Despesa(
                            descricao=expense.descricao,
                            categoria=expense.categoria,
                            valor=expense.valor,
                            data_vencimento=next_date,
                            pago=False,
                            observacoes=f"Recorrente - {expense.frequencia_recorrencia}",
                            recorrente=True,
                            frequencia_recorrencia=expense.frequencia_recorrencia,
                            parcelas_restantes=None,  # Ilimitado para recorrências automáticas
                            user_id=expense.user_id,
                        )

                        db.add(new_expense)
                        processed += 1

            except Exception as e:
                errors.append(f"Erro na despesa {expense.id}: {str(e)}")

        db.commit()

    except Exception as e:
        db.rollback()
        return {"message": f"Erro ao processar recorrentes: {str(e)}", "processed": 0, "errors": errors}

    return {"message": f"{processed} despesas recorrentes processadas", "processed": processed, "errors": errors}
