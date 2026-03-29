import os
import stripe
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

print(f"Testing with key: {stripe.api_key[:10]}...")

try:
    # Test 1: Key validity
    account = stripe.Account.retrieve()
    print(f"✅ Stripe Key is VALIDA! Account: {account.email}")
    
    # Test 2: Price IDs
    pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")
    premium_price_id = os.getenv("STRIPE_PREMIUM_PRICE_ID")
    
    for pid in [pro_price_id, premium_price_id]:
        try:
            p = stripe.Price.retrieve(pid)
            print(f"✅ Price ID {pid} ENCONTRADO! Value: {p.unit_amount/100} {p.currency}")
        except Exception as e:
            print(f"❌ Price ID {pid} FALHOU: {str(e)}")

except Exception as e:
    print(f"❌ Erro Geral: {str(e)}")
