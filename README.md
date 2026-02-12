# FinControl - Controle Financeiro Pessoal

Plataforma web completa para controle financeiro pessoal, desenvolvida com **Python (FastAPI)** no backend e **Next.js (React)** no frontend. O sistema permite gerenciar receitas, despesas, metas financeiras e orcamentos, com suporte a contas compartilhadas entre dois usuarios (plano casal), parcelamento automatico de despesas, notificacoes inteligentes e um agente de IA integrado via chat.

---

## Indice

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pre-requisitos](#pre-requisitos)
- [Instalacao e Execucao](#instalacao-e-execucao)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Arquitetura](#arquitetura)
- [API Endpoints](#api-endpoints)
- [Autenticacao](#autenticacao)
- [Conta Compartilhada (Plano Casal)](#conta-compartilhada-plano-casal)
- [Parcelamento Automatico](#parcelamento-automatico)
- [Agente de IA](#agente-de-ia)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Scripts Uteis](#scripts-uteis)

---

## Funcionalidades

### Dashboard

- Resumo financeiro mensal com total de receitas, despesas e saldo
- Grafico de evolucao mensal (ultimos 6 meses)
- Distribuicao de gastos por categoria
- Lista de proximos vencimentos

### Receitas

- Cadastro, edicao e exclusao de receitas
- Categorizacao (Salario, Freelance, Investimentos, Bonus, entre outras)
- Filtro por mes, ano e categoria

### Despesas

- Cadastro, edicao e exclusao de despesas
- Controle de status de pagamento (pago/pendente)
- Parcelamento automatico com geracao de parcelas futuras
- Suporte a despesas recorrentes (mensal, semanal, anual)
- Filtro por mes, ano, categoria e status de pagamento

### Planejamento

- Orcamento por categoria com acompanhamento de gastos
- Metas financeiras com progresso visual
- Indicadores de limite atingido

### Relatorios

- Relatorio mensal detalhado
- Comparativo entre meses
- Analise por categoria com percentuais

### Notificacoes

- Alertas automaticos de vencimentos proximos (7 dias)
- Alertas de despesas vencidas e nao pagas
- Alertas de orcamento excedido
- Centro de notificacoes com marcacao de leitura

### Conta Compartilhada (Plano Casal)

- Convite por email para compartilhar dados financeiros
- Fluxo de aceite/rejeicao de convite
- Dados sincronizados entre os dois usuarios em tempo real
- Remocao de vinculo a qualquer momento

### Outros

- Autenticacao JWT com registro e login
- Busca global por descricao em receitas e despesas
- Exportacao de dados em Excel (.xlsx) e CSV
- Importacao de planilhas com mapeamento automatico de colunas
- Chat com agente de IA para consultas financeiras
- Interface dark mode com design responsivo
- Sidebar colapsavel com interacao hover

---

## Tecnologias

### Backend

- **Python 3.10+** - Linguagem principal
- **FastAPI** - Framework web assincrono
- **SQLAlchemy** - ORM para acesso ao banco de dados
- **SQLite** - Banco de dados relacional (arquivo local)
- **Pydantic** - Validacao de dados e schemas
- **Passlib + Bcrypt** - Hash de senhas
- **Python-JOSE** - Geracao e validacao de tokens JWT
- **Pandas + OpenPyXL** - Importacao/exportacao de planilhas
- **Python-Dateutil** - Manipulacao avancada de datas

### Frontend

- **Next.js 14** - Framework React com App Router
- **React 18** - Biblioteca de interface
- **TypeScript** - Tipagem estatica
- **Tailwind CSS 3.4** - Estilizacao utilitaria
- **Recharts** - Graficos e visualizacoes
- **Lucide React** - Biblioteca de icones
- **Date-fns** - Utilitarios de data

---

## Pre-requisitos

- **Python** 3.10 ou superior
- **Node.js** 18 ou superior
- **npm** 9 ou superior

---

## Instalacao e Execucao

### 1. Clonar o repositorio

```bash
git clone https://github.com/gusttavosants/FinControl.git
cd FinControl
```

### 2. Configurar e iniciar o backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

O backend estara disponivel em `http://localhost:8000`. A documentacao interativa da API (Swagger) pode ser acessada em `http://localhost:8000/docs`.

### 3. Configurar e iniciar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend estara disponivel em `http://localhost:3000`. As requisicoes para `/api/*` sao automaticamente redirecionadas para o backend via proxy configurado no `next.config.js`.

### 4. Primeiro acesso

1. Acesse `http://localhost:3000/register` para criar uma conta
2. Apos o registro, voce sera redirecionado ao dashboard
3. Acesse **Configuracoes** para carregar dados de exemplo, se desejar

---

## Estrutura do Projeto

```
FinControl/
├── backend/
│   ├── main.py                      # Aplicacao FastAPI, rotas e logica de negocios
│   ├── models.py                    # Modelos SQLAlchemy (User, Receita, Despesa, etc.)
│   ├── schemas.py                   # Schemas Pydantic para validacao de request/response
│   ├── database.py                  # Configuracao do engine e sessao do banco de dados
│   ├── agent.py                     # Agente de IA para chat e processamento de recorrencias
│   ├── cli.py                       # Interface de linha de comando
│   ├── migrate_shared_accounts.py   # Script de migracao para contas compartilhadas
│   └── requirements.txt             # Dependencias Python
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Layout raiz da aplicacao
│   │   │   ├── page.tsx             # Pagina do Dashboard
│   │   │   ├── login/page.tsx       # Pagina de login
│   │   │   ├── register/page.tsx    # Pagina de registro
│   │   │   ├── receitas/page.tsx    # Gestao de receitas
│   │   │   ├── despesas/page.tsx    # Gestao de despesas
│   │   │   ├── planejamento/page.tsx # Orcamento e metas
│   │   │   ├── relatorios/page.tsx  # Relatorios financeiros
│   │   │   ├── configuracoes/page.tsx # Configuracoes e plano casal
│   │   │   └── globals.css          # Estilos globais e variaveis CSS
│   │   ├── components/
│   │   │   ├── AppShell.tsx         # Shell da aplicacao (sidebar + conteudo)
│   │   │   ├── Sidebar.tsx          # Barra lateral com navegacao
│   │   │   ├── ThemeProvider.tsx    # Provedor de tema (dark mode)
│   │   │   ├── ChatWidget.tsx       # Widget de chat com IA
│   │   │   ├── GlobalSearch.tsx     # Busca global
│   │   │   ├── Modal.tsx            # Componente modal reutilizavel
│   │   │   ├── MonthSelector.tsx    # Seletor de mes/ano
│   │   │   └── NotificationCenter.tsx # Centro de notificacoes
│   │   └── lib/
│   │       ├── api.ts               # Cliente HTTP para comunicacao com o backend
│   │       └── utils.ts             # Funcoes utilitarias (formatacao, etc.)
│   ├── package.json
│   ├── next.config.js               # Configuracao do Next.js (proxy para backend)
│   ├── tailwind.config.ts           # Configuracao do Tailwind CSS
│   └── tsconfig.json                # Configuracao do TypeScript
│
├── .gitignore
└── README.md
```

---

## Arquitetura

O projeto segue uma arquitetura cliente-servidor com separacao clara entre frontend e backend.

**Frontend (Next.js)** se comunica com o **Backend (FastAPI)** exclusivamente via API REST. O proxy do Next.js redireciona todas as chamadas `/api/*` para `http://localhost:8000`, eliminando problemas de CORS em desenvolvimento.

**Banco de dados** utiliza SQLite com arquivo local (`backend/financial.db`), gerenciado pelo SQLAlchemy ORM. O caminho do banco e absoluto, garantindo consistencia independente do diretorio de execucao.

**Autenticacao** e feita via JWT (JSON Web Token). O token e armazenado no `localStorage` do navegador e enviado no header `Authorization: Bearer <token>` em todas as requisicoes autenticadas.

**Dados compartilhados** entre usuarios sao gerenciados pela tabela `shared_accounts`. Quando dois usuarios possuem uma conta compartilhada ativa, todas as queries de dados financeiros filtram por ambos os `user_id`.

---

## API Endpoints

### Autenticacao

| Metodo | Endpoint             | Descricao                     |
| ------ | -------------------- | ----------------------------- |
| POST   | `/api/auth/register` | Registrar novo usuario        |
| POST   | `/api/auth/login`    | Autenticar usuario            |
| GET    | `/api/auth/me`       | Obter dados do usuario logado |

### Receitas

| Metodo | Endpoint            | Descricao                                      |
| ------ | ------------------- | ---------------------------------------------- |
| GET    | `/api/receitas`     | Listar receitas (filtros: mes, ano, categoria) |
| GET    | `/api/receitas/:id` | Obter receita por ID                           |
| POST   | `/api/receitas`     | Criar nova receita                             |
| PUT    | `/api/receitas/:id` | Atualizar receita                              |
| DELETE | `/api/receitas/:id` | Deletar receita                                |

### Despesas

| Metodo | Endpoint                  | Descricao                                            |
| ------ | ------------------------- | ---------------------------------------------------- |
| GET    | `/api/despesas`           | Listar despesas (filtros: mes, ano, categoria, pago) |
| GET    | `/api/despesas/:id`       | Obter despesa por ID                                 |
| POST   | `/api/despesas`           | Criar despesa (com geracao automatica de parcelas)   |
| PUT    | `/api/despesas/:id`       | Atualizar despesa                                    |
| DELETE | `/api/despesas/:id`       | Deletar despesa                                      |
| PATCH  | `/api/despesas/:id/pagar` | Alternar status de pagamento                         |

### Dashboard

| Metodo | Endpoint                     | Descricao                                         |
| ------ | ---------------------------- | ------------------------------------------------- |
| GET    | `/api/dashboard/resumo`      | Resumo financeiro do mes                          |
| GET    | `/api/dashboard/categorias`  | Gastos agrupados por categoria                    |
| GET    | `/api/dashboard/evolucao`    | Evolucao de receitas e despesas (ultimos N meses) |
| GET    | `/api/dashboard/vencimentos` | Despesas com vencimento proximo                   |

### Notificacoes

| Metodo | Endpoint                      | Descricao                          |
| ------ | ----------------------------- | ---------------------------------- |
| GET    | `/api/notifications`          | Listar todas as notificacoes       |
| GET    | `/api/notifications/unread`   | Listar notificacoes nao lidas      |
| PATCH  | `/api/notifications/:id/read` | Marcar notificacao como lida       |
| DELETE | `/api/notifications/:id`      | Deletar notificacao                |
| POST   | `/api/notifications/generate` | Gerar notificacoes automaticamente |

### Relatorios

| Metodo | Endpoint                      | Descricao                    |
| ------ | ----------------------------- | ---------------------------- |
| GET    | `/api/relatorios/mensal`      | Relatorio detalhado do mes   |
| GET    | `/api/relatorios/comparativo` | Comparativo entre dois meses |

### Orcamento e Metas

| Metodo | Endpoint             | Descricao                       |
| ------ | -------------------- | ------------------------------- |
| GET    | `/api/orcamento`     | Listar orcamentos por categoria |
| POST   | `/api/orcamento`     | Criar/atualizar orcamento       |
| DELETE | `/api/orcamento/:id` | Deletar orcamento               |
| GET    | `/api/metas`         | Listar metas financeiras        |
| POST   | `/api/metas`         | Criar meta                      |
| PUT    | `/api/metas/:id`     | Atualizar meta                  |
| DELETE | `/api/metas/:id`     | Deletar meta                    |

### Conta Compartilhada

| Metodo | Endpoint                         | Descricao                     |
| ------ | -------------------------------- | ----------------------------- |
| GET    | `/api/shared-account/status`     | Status da conta compartilhada |
| POST   | `/api/shared-account/invite`     | Enviar convite para parceiro  |
| POST   | `/api/shared-account/:id/accept` | Aceitar convite               |
| POST   | `/api/shared-account/:id/reject` | Rejeitar convite              |
| DELETE | `/api/shared-account/:id`        | Remover conta compartilhada   |

### Outros

| Metodo | Endpoint                  | Descricao                              |
| ------ | ------------------------- | -------------------------------------- |
| GET    | `/api/categorias/receita` | Listar categorias de receita           |
| GET    | `/api/categorias/despesa` | Listar categorias de despesa           |
| GET    | `/api/search`             | Busca global por descricao             |
| GET    | `/api/export/excel`       | Exportar dados em Excel                |
| GET    | `/api/export/csv`         | Exportar dados em CSV                  |
| POST   | `/api/import/spreadsheet` | Importar planilha de despesas/receitas |
| POST   | `/api/chat`               | Enviar mensagem ao agente de IA        |
| POST   | `/api/seed`               | Carregar dados de exemplo              |
| POST   | `/api/recurring/process`  | Processar despesas recorrentes         |
| DELETE | `/api/clear-all`          | Limpar todos os dados                  |

---

## Autenticacao

O sistema utiliza JWT para autenticacao. O fluxo e o seguinte:

1. O usuario se registra via `POST /api/auth/register` ou faz login via `POST /api/auth/login`
2. O backend retorna um `access_token` JWT
3. O frontend armazena o token no `localStorage`
4. Todas as requisicoes subsequentes incluem o header `Authorization: Bearer <token>`
5. Endpoints protegidos utilizam o decorator `Depends(require_user)` para validar o token

O token contem o `user_id` no campo `sub` e tem validade de 30 dias.

---

## Conta Compartilhada (Plano Casal)

Permite que dois usuarios compartilhem os mesmos dados financeiros:

1. **Usuario A** envia um convite informando o email do **Usuario B**
2. **Usuario B** visualiza o convite pendente na pagina de Configuracoes
3. **Usuario B** aceita ou rejeita o convite
4. Se aceito, ambos os usuarios passam a ver e editar os mesmos dados
5. Qualquer um dos dois pode remover o vinculo a qualquer momento

Tecnicamente, a funcao `get_account_user_ids()` retorna os IDs de ambos os usuarios quando existe uma conta compartilhada ativa. Todas as queries de dados financeiros utilizam essa funcao para filtrar registros.

---

## Parcelamento Automatico

Ao criar uma despesa com `parcela_atual` e `parcela_total` preenchidos, o sistema gera automaticamente todas as parcelas restantes com datas de vencimento incrementadas mensalmente.

Exemplo: uma despesa com `parcela_atual=1` e `parcela_total=5` criada com vencimento em 15/03/2026 gera automaticamente as parcelas 2/5 (15/04), 3/5 (15/05), 4/5 (15/06) e 5/5 (15/07).

---

## Agente de IA

O sistema inclui um agente de IA acessivel via chat que pode:

- Consultar saldo, receitas e despesas do mes
- Listar proximos vencimentos
- Informar gastos por categoria
- Responder perguntas sobre a situacao financeira do usuario

O agente e acionado via `POST /api/chat` e processa as mensagens utilizando o contexto financeiro do usuario.

---

## Variaveis de Ambiente

O backend utiliza as seguintes configuracoes (definidas em `main.py`):

| Variavel                   | Valor Padrao                                 | Descricao                         |
| -------------------------- | -------------------------------------------- | --------------------------------- |
| `SECRET_KEY`               | `fincontrol-secret-key-change-in-production` | Chave secreta para assinatura JWT |
| `ALGORITHM`                | `HS256`                                      | Algoritmo de assinatura JWT       |
| `ACCESS_TOKEN_EXPIRE_DAYS` | `30`                                         | Validade do token em dias         |
| `DATABASE_URL`             | `sqlite:///<backend_dir>/financial.db`       | URL de conexao com o banco        |

Para producao, altere o `SECRET_KEY` para um valor seguro e aleatorio.

---

## Scripts Uteis

### Executar migracao de contas compartilhadas

```bash
cd backend
python migrate_shared_accounts.py
```

Adiciona a tabela `shared_accounts` e a coluna `user_id` nas tabelas financeiras. Seguro para executar multiplas vezes, nao apaga dados existentes.

### Iniciar backend em modo desenvolvimento

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Iniciar frontend em modo desenvolvimento

```bash
cd frontend
npm run dev
```

### Build de producao do frontend

```bash
cd frontend
npm run build
npm start
```
