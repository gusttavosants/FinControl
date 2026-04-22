from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, ChatSession, ChatMessage
from core.security import require_user
from schemas import ChatRequest, ChatResponse, ChatSessionResponse, ChatSessionDetailResponse
from services.ai_service import AIService
from core.config import settings
from datetime import datetime, timedelta
from typing import List

router = APIRouter()

def clean_old_sessions(db: Session, user_id: int):
    # Hard Delete sessions older than 30 dias
    limit_date = datetime.utcnow() - timedelta(days=30)
    db.query(ChatSession).filter(ChatSession.user_id == user_id, ChatSession.updated_at < limit_date).delete(synchronize_session=False)
    db.commit()

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_chat_sessions(user: User = Depends(require_user), db: Session = Depends(get_db)):
    clean_old_sessions(db, user.id)
    return db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.updated_at.desc()).all()

@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
def get_chat_session_detail(session_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return session

@router.delete("/sessions/{session_id}")
def delete_chat_session(session_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if session:
        db.delete(session)
        db.commit()
    return {"status": "success"}

@router.post("", response_model=ChatResponse)
async def chat_with_finbot(
    request: ChatRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    # Admins sempre tem acesso, outros seguem o plano
    if user.role != "admin":
        plan_limits = getattr(settings, f"{user.plan.upper()}_PLAN_LIMITS", settings.FREE_PLAN_LIMITS)
        if not plan_limits.get("ai_chat_enabled", False):
            raise HTTPException(
                status_code=403, 
                detail="O ZenBot inteligente está disponível apenas nos planos Pro e Premium."
            )

    ai_service = AIService(db, user)
    
    # Convert list of ChatMessage (pydantic) to list of dicts for the service
    history_dicts = [{"role": m.role, "content": m.content} for m in request.history]
    
    result = await ai_service.chat(request.message, history=history_dicts, session_id=request.session_id)
    
    return ChatResponse(
        reply=result["reply"],
        session_id=result.get("session_id"),
        actions=result.get("actions", [])
    )
