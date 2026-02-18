# Guia de Migracao SQLite para PostgreSQL

Este guia descreve como migrar o banco de dados de SQLite para PostgreSQL e hospedar o backend na internet.

## Fase 1: Preparacao Local (Desenvolvimento)

### 1.1. Instalar PostgreSQL localmente

**Windows:**
- Baixe o instalador em https://www.postgresql.org/download/windows/
- Instale com a senha padrao (anote a senha do usuario `postgres`)
- Abra pgAdmin (vem com a instalacao) para gerenciar o banco

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 1.2. Criar banco de dados

```bash
psql -U postgres -c "CREATE DATABASE fincontrol;"
```

Ou via pgAdmin:
1. Clique direito em "Databases"
2. Create > Database
3. Nome: `fincontrol`
4. Clique "Save"

### 1.3. Configurar variaveis de ambiente

Crie um arquivo `.env` na pasta `backend/`:

```
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/fincontrol
SECRET_KEY=sua-chave-secreta-super-segura-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=30
ENVIRONMENT=development
```

Substitua:
- `sua_senha` pela senha do usuario `postgres`
- `sua-chave-secreta-super-segura-aqui` por uma chave aleatoria (use `openssl rand -hex 32`)

### 1.4. Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
```

### 1.5. Executar migracao

```bash
python migrate_to_postgres.py
```

Saida esperada:
```
Migrando de SQLite para PostgreSQL...

1. Migrando usuarios...
   X usuarios migrados

2. Migrando receitas...
   X receitas migradas

3. Migrando despesas...
   X despesas migradas

...

MIGRACAO CONCLUIDA COM SUCESSO!
```

### 1.6. Testar localmente

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Acesse http://localhost:8000/docs para testar a API.

---

## Fase 2: Hospedar em Producao

Escolha uma das opcoes abaixo:

### Opcao A: Render (Recomendado para iniciantes)

**Vantagens:**
- Free tier generoso
- Deploy direto do GitHub
- PostgreSQL incluso
- Suporta variaveis de ambiente

**Passos:**

1. Crie conta em https://render.com
2. Clique "New +" > "Web Service"
3. Conecte seu repositorio GitHub (FinControl)
4. Configure:
   - Name: `fincontrol-api`
   - Environment: `Python 3.10`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`
5. Clique "Create Web Service"
6. Apos deploy, vá em "Environment" e adicione variaveis:
   - `DATABASE_URL`: Render fornecera uma URL PostgreSQL (copie de "Internal Database URL")
   - `SECRET_KEY`: Gere uma chave aleatoria
7. Redeploy

**Resultado:** Seu backend estara em `https://fincontrol-api.onrender.com`

### Opcao B: Railway

**Vantagens:**
- Interface intuitiva
- PostgreSQL automatico
- Pricing transparente

**Passos:**

1. Crie conta em https://railway.app
2. Clique "New Project" > "Deploy from GitHub"
3. Selecione o repositorio `FinControl`
4. Railway detectara automaticamente e criara servicos
5. Adicione variavel de ambiente `SECRET_KEY`
6. Deploy automatico

### Opcao C: Fly.io

**Vantagens:**
- Performance global
- Pricing justo
- Suporta Docker

**Passos:**

1. Instale Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
2. Crie conta em https://fly.io
3. Na pasta `backend/`, crie `Dockerfile`:

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

4. Execute:
```bash
fly launch
fly deploy
```

5. Configure variaveis:
```bash
fly secrets set DATABASE_URL=postgresql://...
fly secrets set SECRET_KEY=...
```

---

## Fase 3: Atualizar Frontend para usar Backend em Producao

No arquivo `frontend/next.config.js`, atualize o rewrites:

```javascript
async rewrites() {
  return {
    beforeFiles: [
      {
        source: '/api/:path*',
        destination: 'https://fincontrol-api.onrender.com/api/:path*',
      },
    ],
  };
}
```

Ou use variavel de ambiente:

```javascript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async rewrites() {
  return {
    beforeFiles: [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ],
  };
}
```

---

## Fase 4: Testar Integracao

1. Acesse seu frontend hospedado
2. Registre uma nova conta
3. Crie receitas/despesas
4. Verifique se os dados aparecem no banco PostgreSQL

---

## Troubleshooting

### Erro: "could not connect to server"
- Verifique se PostgreSQL esta rodando
- Confirme a senha no `.env`
- Teste com: `psql -U postgres -d fincontrol`

### Erro: "relation does not exist"
- Execute novamente: `python migrate_to_postgres.py`
- Ou delete o banco e recrie: `psql -U postgres -c "DROP DATABASE fincontrol; CREATE DATABASE fincontrol;"`

### App mobile nao consegue conectar
- Verifique se o backend esta acessivel (teste a URL no navegador)
- Confirme CORS esta habilitado (ja esta em `main.py`)
- Verifique firewall/proxy

---

## Proximos Passos

Apos completar esta fase:
1. O backend estara acessivel pela internet
2. O app mobile conseguira se conectar
3. Dados serao compartilhados em tempo real entre web e mobile
4. Comece a Fase 2: Desenvolvimento do App Mobile
