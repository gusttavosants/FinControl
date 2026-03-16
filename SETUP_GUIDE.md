# 🚀 Setup - Desenvolvimento Local vs Produção

## 🏠 Desenvolvimento Local (Localhost)

### Backend (http://localhost:8000)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Arquivo de config:** `.env.local`

- `DATABASE_URL`: Supabase (mesmo que produção)
- `BACKEND_URL`: http://localhost:8000
- `FRONTEND_URL`: http://localhost:3000

### Frontend (http://localhost:3000)

```bash
cd frontend
npm install
npm run dev
```

**Arquivo de config:** `.env.local`

- `NEXT_PUBLIC_API_URL`: http://localhost:8000

---

## 🌐 Produção (Render + Vercel)

### Backend (https://fincontrol-mgrk.onrender.com)

- **Variáveis no Render:**
  - `DATABASE_URL`: `postgresql://postgres:[SENHA]@cnofclwczmlfxosniffj.supabase.co:6543/postgres`
  - `ENVIRONMENT`: production
  - `DEBUG`: False

### Frontend (https://fin-control-fawn.vercel.app)

- **Não precisa de .env.local**
- Usa auto-detecção (`NODE_ENV`) para apontar para Render
- **Variáveis no Vercel:** (opcional)
  - `NEXT_PUBLIC_API_URL`: `https://fincontrol-mgrk.onrender.com` (se quiser override)

---

## 📋 Fluxo de Deployment

1. **Desenvolvimento Local:**

   ```bash
   # Terminal 1
   cd backend
   uvicorn main:app --reload

   # Terminal 2
   cd frontend
   npm run dev
   ```

2. **Push para GitHub:**

   ```bash
   git add .
   git commit -m "message"
   git push origin main
   ```

3. **Render + Vercel fazem redeploy automaticamente**

---

## ✅ Checklist

- [x] Backend rodando em localhost:8000
- [x] Frontend rodando em localhost:3000
- [x] Conseguiu fazer login?
- [x] Banco Supabase funcionando?
- [x] Redeploy automático no Render/Vercel ativado?
