# 💳 Configuração de Pagamentos - FinControl

## 🎯 Visão Geral

Sistema de pagamentos integrado com **Stripe** (internacional) e **Mercado Pago** (Brasil) para monetização do SaaS.

---

## 🔧 Configuração Inicial

### 1. Criar Contas nos Gateways

#### Stripe
1. Acesse: https://dashboard.stripe.com/register
2. Complete o cadastro
3. Ative o modo de teste
4. Copie as chaves da API

#### Mercado Pago
1. Acesse: https://www.mercadopago.com.br/developers
2. Crie uma aplicação
3. Copie o Access Token de teste

---

### 2. Configurar Produtos/Preços

#### Stripe Dashboard
1. Vá em **Products** → **Add Product**
2. Crie 2 produtos:
   - **FinControl Pro**: R$ 19,90/mês
   - **FinControl Premium**: R$ 39,90/mês
3. Para cada produto, copie o **Price ID** (começa com `price_`)

#### Mercado Pago
1. Use a API para criar planos de assinatura
2. Ou configure pagamentos únicos (recomendado para começar)

---

### 3. Variáveis de Ambiente

Adicione ao `.env`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_PRICE_ID=price_xxxxx

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx
MERCADOPAGO_PRO_PLAN_ID=xxxxx
MERCADOPAGO_PREMIUM_PLAN_ID=xxxxx

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

---

### 4. Criar Tabelas no Banco

```bash
cd backend
python alembic_migration.py
```

Isso criará as tabelas:
- `subscriptions` - Assinaturas dos usuários
- `payments` - Histórico de pagamentos

---

### 5. Configurar Webhooks

#### Stripe Webhooks
1. Dashboard → **Developers** → **Webhooks**
2. **Add endpoint**: `https://seudominio.com/api/payment/webhooks/stripe`
3. Eventos para ouvir:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copie o **Signing secret** → `STRIPE_WEBHOOK_SECRET`

#### Mercado Pago Webhooks
1. Aplicação → **Webhooks**
2. URL: `https://seudominio.com/api/payment/webhooks/mercadopago`
3. Eventos: `payment`, `subscription`

---

## 🚀 Testando Localmente

### 1. Instalar Stripe CLI (para webhooks locais)

```bash
# Windows (com Scoop)
scoop install stripe

# Ou baixe de: https://stripe.com/docs/stripe-cli
```

### 2. Login no Stripe CLI

```bash
stripe login
```

### 3. Encaminhar webhooks para localhost

```bash
stripe listen --forward-to localhost:8000/api/payment/webhooks/stripe
```

Copie o webhook secret que aparece e adicione ao `.env`

### 4. Testar Pagamento

```bash
# Usar cartão de teste do Stripe
Número: 4242 4242 4242 4242
Data: Qualquer data futura
CVC: Qualquer 3 dígitos
```

---

## 📊 Fluxo de Pagamento

### Stripe (Cartão de Crédito)

```
1. Usuário clica "Assinar com Cartão"
   ↓
2. Backend cria Checkout Session
   ↓
3. Usuário é redirecionado para Stripe
   ↓
4. Preenche dados do cartão
   ↓
5. Stripe processa pagamento
   ↓
6. Webhook notifica backend
   ↓
7. Backend ativa assinatura
   ↓
8. Usuário redirecionado para /checkout/success
```

### Mercado Pago (PIX, Boleto, Cartão)

```
1. Usuário clica "Pagar com Mercado Pago"
   ↓
2. Backend cria Preference
   ↓
3. Usuário é redirecionado para Mercado Pago
   ↓
4. Escolhe método (PIX/Boleto/Cartão)
   ↓
5. Mercado Pago processa
   ↓
6. Webhook notifica backend
   ↓
7. Backend ativa assinatura
```

---

## 🧪 Testes

```bash
# Rodar testes de pagamento
pytest tests/test_payment.py -v

# Com coverage
pytest tests/test_payment.py --cov=services.payment_service
```

---

## 📱 Páginas Frontend

### `/pricing`
- Exibe planos disponíveis
- Botões de checkout para Stripe e Mercado Pago
- Destaca plano atual do usuário

### `/subscription`
- Detalhes da assinatura ativa
- Histórico de pagamentos
- Botão para cancelar

### `/checkout/success`
- Confirmação de pagamento
- Redirecionamento automático

### `/checkout/cancel`
- Mensagem de cancelamento
- Opção de tentar novamente

---

## 🔒 Segurança

### Validação de Webhooks
- ✅ Stripe: Verifica assinatura HMAC
- ✅ Mercado Pago: Valida origem da requisição

### Dados Sensíveis
- ❌ Nunca armazene dados de cartão
- ✅ Use tokens dos gateways
- ✅ Secrets em variáveis de ambiente

---

## 💰 Pricing Recomendado

| Plano | Preço | Margem | Custo Stripe | Lucro Líquido |
|-------|-------|--------|--------------|---------------|
| Pro | R$ 19,90 | - | R$ 1,49 (7.5%) | R$ 18,41 |
| Premium | R$ 39,90 | - | R$ 2,99 (7.5%) | R$ 36,91 |

**Taxas Stripe Brasil**: 3.99% + R$ 0,39 por transação
**Taxas Mercado Pago**: 4.99% + R$ 0,39 por transação

---

## 📈 Métricas Importantes

### Acompanhar no Dashboard

1. **MRR** (Monthly Recurring Revenue)
   ```sql
   SELECT SUM(amount) FROM payments 
   WHERE status = 'succeeded' 
   AND created_at >= DATE_TRUNC('month', NOW());
   ```

2. **Churn Rate**
   ```sql
   SELECT COUNT(*) FROM subscriptions 
   WHERE status = 'canceled' 
   AND updated_at >= DATE_TRUNC('month', NOW());
   ```

3. **Conversion Rate**
   ```
   (Assinaturas Pagas / Total Usuários) * 100
   ```

---

## 🐛 Troubleshooting

### Webhook não está chegando
```bash
# Verificar logs do Stripe CLI
stripe logs tail

# Testar webhook manualmente
stripe trigger checkout.session.completed
```

### Pagamento aprovado mas assinatura não ativa
1. Verificar logs do backend
2. Checar se webhook está configurado
3. Validar se `STRIPE_WEBHOOK_SECRET` está correto

### Erro de CORS
- Adicionar domínio do Stripe/MP em `ALLOWED_ORIGINS`

---

## 🚀 Deploy em Produção

### Checklist

- [ ] Trocar chaves de teste por produção
- [ ] Configurar webhooks em produção
- [ ] Ativar HTTPS (obrigatório)
- [ ] Configurar domínio personalizado
- [ ] Testar fluxo completo
- [ ] Configurar alertas de falha de pagamento
- [ ] Implementar retry de webhooks

### Variáveis de Produção

```env
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx
FRONTEND_URL=https://app.fincontrol.com
BACKEND_URL=https://api.fincontrol.com
```

---

## 📞 Suporte

**Stripe**: https://support.stripe.com
**Mercado Pago**: https://www.mercadopago.com.br/developers/pt/support

**Documentação**:
- Stripe: https://stripe.com/docs
- Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs
