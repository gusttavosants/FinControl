# FinControl - Controle Financeiro Pessoal

Plataforma web completa de controle financeiro pessoal com **Python (FastAPI)** no backend e **Next.js** no frontend.

## Funcionalidades

- **Dashboard** com KPIs, gráficos de evolução mensal e despesas por categoria
- **Gestão de Receitas** com CRUD completo e categorização
- **Controle de Despesas** com status de pagamento, parcelamento e alertas de vencimento
- **Relatórios** com comparativos mensais, análise por categoria e histórico
- **Alertas** de vencimentos próximos com indicadores visuais

## Tecnologias

### Backend
- Python 3.10+
- FastAPI
- SQLAlchemy + SQLite
- Pydantic

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts (gráficos)
- Lucide React (ícones)

## Como Executar

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

O backend estará disponível em `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:3000`.

### 3. Dados de Exemplo

Na tela de Dashboard, clique em **"Carregar Dados de Exemplo"** para popular o banco com dados fictícios.

## Estrutura do Projeto

```
financial/
├── backend/
│   ├── main.py            # API FastAPI (rotas e endpoints)
│   ├── models.py          # Modelos SQLAlchemy
│   ├── schemas.py         # Schemas Pydantic
│   ├── database.py        # Configuração do banco de dados
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Layout principal
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── receitas/page.tsx
│   │   │   ├── despesas/page.tsx
│   │   │   └── relatorios/page.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── MonthSelector.tsx
│   │   └── lib/
│   │       ├── api.ts           # Cliente API
│   │       └── utils.ts         # Utilitários
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.ts
└── README.md
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/receitas | Listar receitas |
| POST | /api/receitas | Criar receita |
| PUT | /api/receitas/:id | Atualizar receita |
| DELETE | /api/receitas/:id | Deletar receita |
| GET | /api/despesas | Listar despesas |
| POST | /api/despesas | Criar despesa |
| PUT | /api/despesas/:id | Atualizar despesa |
| DELETE | /api/despesas/:id | Deletar despesa |
| PATCH | /api/despesas/:id/pagar | Toggle status pagamento |
| GET | /api/dashboard/resumo | Resumo financeiro |
| GET | /api/dashboard/categorias | Gastos por categoria |
| GET | /api/dashboard/evolucao | Evolução mensal |
| GET | /api/dashboard/vencimentos | Próximos vencimentos |
| GET | /api/relatorios/mensal | Relatório mensal |
| GET | /api/relatorios/comparativo | Comparativo entre meses |
| POST | /api/seed | Carregar dados de exemplo |
