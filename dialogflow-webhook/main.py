from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncpg
import os

app = FastAPI()

# Database configuration
DATABASE_URL = "postgresql://postgres:Ss520520@localhost:5432/mama_ios"

# Connection pool
pool: asyncpg.Pool = None


async def init_pool():
    global pool
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=1,
        max_size=5,
        command_timeout=60
    )


@app.on_event("startup")
async def startup():
    await init_pool()
    print("Database connection pool initialized")


@app.on_event("shutdown")
async def shutdown():
    if pool:
        await pool.close()


async def get_address_by_phone(phone: str) -> str | None:
    """Query customers table for address by phone number"""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT address FROM customers WHERE phone = $1',
            phone
        )
        return row["address"] if row else None


@app.post("/webhook/dialogflow")
async def dialogflow_webhook(request: dict):
    """
    Dialogflow CX Webhook Endpoint
    Expected input format from Dialogflow CX:
    {
        "intentInfo": {
            "parameters": {
                "phone": {
                    "originalValue": "0912345678"
                }
            }
        }
    }
    """
    try:
        # Extract phone number from Dialogflow request
        intent_info = request.get("intentInfo", {})
        parameters = intent_info.get("parameters", {})
        phone_param = parameters.get("phone", {})
        phone = phone_param.get("originalValue")

        if not phone:
            return {
                "fulfillment_response": {
                    "messages": [
                        {
                            "text": {
                                "text": ["抱歉，請提供電話號碼"]
                            }
                        }
                    ]
                }
            }

        # Query database
        address = await get_address_by_phone(phone)

        if address:
            message = f"會員電話 {phone} 的地址是：{address}"
        else:
            message = f"找不到電話號碼 {phone} 的會員資料"

        return {
            "fulfillment_response": {
                "messages": [
                    {
                        "text": {
                            "text": [message]
                        }
                    }
                ]
            }
        }

    except Exception as e:
        print(f"Error processing request: {e}")
        return {
            "fulfillment_response": {
                "messages": [
                    {
                        "text": {
                            "text": ["系統發生錯誤，請稍後再試"]
                        }
                    }
                ]
            }
        }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
