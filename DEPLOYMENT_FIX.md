# Render Deployment Fix - Database Configuration

## Problem
Your backend on Render is returning a 500 error on the `/api/auth/register` endpoint because:
1. The `DATABASE_URL` environment variable is not set on Render
2. The app falls back to SQLite (`financial.db`), which doesn't work in containerized environments
3. This causes database connection failures before CORS headers are sent

## Solution

### Step 1: Create a PostgreSQL Database on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Fill in the details:
   - **Name**: `fincontrol-db` (or your preferred name)
   - **Database**: `fincontrol`
   - **User**: `fincontrol` (or your preferred user)
   - **Region**: Select the same region as your backend service
   - **PostgreSQL Version**: 15 or higher
4. Click "Create Database"
5. Wait for the database to be created (2-3 minutes)
6. Copy the **Internal Database URL** (not the External one)

### Step 2: Update Backend Environment Variables on Render
1. Go to your backend service on Render (https://dashboard.render.com)
2. Click on your service name
3. Go to **Environment** tab
4. Add/Update the following environment variables:
   ```
   DATABASE_URL=<paste the Internal Database URL from Step 1>
   GEMINI_API_KEY=AIzaSyBMrZSvZvG5LCR096y4W1HDvpKYZFQ1HSY
   JWT_SECRET=your-secret-key-change-in-production
   ALLOWED_ORIGINS=https://fin-control-peach.vercel.app
   ```

### Step 3: Deploy
1. Your backend will automatically redeploy when you save the environment variables
2. Wait for the deployment to complete
3. Test the register endpoint from your frontend

## Verification
After deployment, test with:
```bash
curl -X POST https://fincontrol-mgrk.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "email": "test@example.com",
    "senha": "password123"
  }'
```

You should get a 201 response with a token, not a 500 error.

## CORS Configuration
Your CORS is already correctly configured in `main.py`:
- ✅ `https://fin-control-peach.vercel.app` is in the allowed origins
- ✅ All methods and headers are allowed
- ✅ Credentials are enabled

Once the database is fixed, CORS will work properly.
