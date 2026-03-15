import httpx
import asyncio

async def test_brapi():
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get('https://brapi.dev/api/quote/KLBN3F,ITSA4F')
            print(f'Status: {resp.status_code}')
            print(f'Response: {resp.text[:500]}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    asyncio.run(test_brapi())
