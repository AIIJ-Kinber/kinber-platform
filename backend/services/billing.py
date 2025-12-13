from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional, Dict, Tuple, List, Any
from datetime import datetime, timezone
import time

import paypalrestsdk

from utils.logger import logger
from utils.config import config, EnvMode
from services.supabase import DBConnection
from utils.auth_utils import get_current_user_id_from_jwt
from pydantic import BaseModel
from utils.constants import MODEL_ACCESS_TIERS, MODEL_NAME_ALIASES
from litellm import cost_per_token

# ─── PayPal SDK setup ────────────────────────────────────────────────────────
paypalrestsdk.configure({
    "mode": config.PAYPAL_MODE,               # "sandbox" or "live"
    "client_id": config.PAYPAL_CLIENT_ID,
    "client_secret": config.PAYPAL_CLIENT_SECRET,
})

# Token price multiplier
TOKEN_PRICE_MULTIPLIER = 1.5

# Initialize router
router = APIRouter(prefix="/billing", tags=["billing"])

# Hardcoded pricing for specific models (prices per million tokens)
HARDCODED_MODEL_PRICES: Dict[str, Dict[str, float]] = {
    "openrouter/deepseek/deepseek-chat": {
        "input_cost_per_million_tokens": 0.38,
        "output_cost_per_million_tokens": 0.89
    },
    # … leave the rest of your pricing dict unchanged …
}

def get_model_pricing(model: str) -> Optional[Tuple[float, float]]:
    pricing = HARDCODED_MODEL_PRICES.get(model)
    if pricing:
        return (
            pricing["input_cost_per_million_tokens"],
            pricing["output_cost_per_million_tokens"],
        )
    return None

# ─── PayPal request/response models ─────────────────────────────────────────
class CreatePaypalPaymentRequest(BaseModel):
    amount: float
    currency: str = "USD"
    return_url: str
    cancel_url: str
    referral_code: Optional[str] = None

class SubscriptionStatus(BaseModel):
    status: str
    plan_name: Optional[str] = None
    payment_id: Optional[str] = None
    next_billing_date: Optional[datetime] = None
    cancel_at_period_end: bool = False
    trial_end: Optional[datetime] = None
    minutes_limit: Optional[int] = None
    cost_limit: Optional[float] = None
    current_usage: Optional[float] = None
    has_schedule: bool = False
    scheduled_plan_name: Optional[str] = None
    scheduled_date: Optional[datetime] = None

# ─── Core billing helpers ──────────────────────────────────────────────────
def create_paypal_payment(req: CreatePaypalPaymentRequest) -> str:
    payment = paypalrestsdk.Payment({
        "intent": "sale",
        "payer": {"payment_method": "paypal"},
        "transactions": [{
            "amount": {
                "total": f"{req.amount:.2f}",
                "currency": req.currency
            },
            "description": "Kinber Platform Purchase"
        }],
        "redirect_urls": {
            "return_url": req.return_url,
            "cancel_url": req.cancel_url
        }
    })
    if not payment.create():
        logger.error(f"PayPal payment failed: {payment.error}")
        raise HTTPException(status_code=500, detail="Failed to create PayPal payment")
    for l in payment.links:
        if l.rel == "approval_url":
            return str(l.href)
    raise HTTPException(status_code=500, detail="No approval URL in PayPal response")

def execute_paypal_payment(payment_id: str, payer_id: str) -> None:
    payment = paypalrestsdk.Payment.find(payment_id)
    if not payment.execute({"payer_id": payer_id}):
        logger.error(f"PayPal payment execution failed: {payment.error}")
        raise HTTPException(status_code=500, detail="Failed to execute PayPal payment")

# ─── Usage & cost calculations ──────────────────────────────────────────────
async def calculate_monthly_usage(client: DBConnection, user_id: str) -> float:
    # Stub: replace with your existing implementation
    return 0.0

def calculate_token_cost(
    prompt_tokens: int, completion_tokens: int, model: str
) -> float:
    # Stub: replace with your existing implementation
    return 0.0

# ─── Billing interface functions ───────────────────────────────────────────
def check_billing_status(user_id: str) -> bool:
    """
    Determine if a user has an active subscription via PayPal.
    """
    # TODO: integrate PayPal Subscriptions API here
    return True

def can_use_model(user_id: str, model_name: str) -> bool:
    """
    Decide if a given user can use a particular model based on their subscription.
    """
    # TODO: implement actual access logic, e.g. check MODEL_ACCESS_TIERS
    return True

# ─── API endpoints ─────────────────────────────────────────────────────────
@router.post("/create-payment")
async def create_payment(
    req: CreatePaypalPaymentRequest,
    current_user_id: str = Depends(get_current_user_id_from_jwt)
):
    return {"approval_url": create_paypal_payment(req)}

@router.get("/execute-payment")
async def execute_payment(
    paymentId: str,
    PayerID: str
):
    execute_paypal_payment(paymentId, PayerID)
    return {"status": "completed"}

@router.get("/subscription", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user_id: str = Depends(get_current_user_id_from_jwt)
):
    return SubscriptionStatus(status="active")
