#!/usr/bin/env python3
"""
CLI para manutenção do sistema financeiro
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal
from agent import process_recurring_expenses

def process_recurring():
    """Processa despesas recorrentes"""
    db = SessionLocal()
    try:
        result = process_recurring_expenses(db)
        print(f"✅ {result['message']}")
        if result['errors']:
            print("⚠️ Erros:")
            for error in result['errors']:
                print(f"  - {error}")
    finally:
        db.close()

def generate_notifications():
    """Gera notificações automaticamente"""
    db = SessionLocal()
    try:
        result = generate_notifications(db)
        print(f"✅ {result['message']}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python cli.py <comando>")
        print("Comandos:")
        print("  process-recurring  - Processa despesas recorrentes")
        print("  generate-notifications - Gera notificações automaticamente")
        sys.exit(1)

    comando = sys.argv[1]

    if comando == "process-recurring":
        process_recurring()
    elif comando == "generate-notifications":
        generate_notifications()
    else:
        print(f"Comando desconhecido: {comando}")
        sys.exit(1)
