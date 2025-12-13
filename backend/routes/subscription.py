from fastapi import APIRouter, HTTPException, Header

router = APIRouter()

@router.get("/")
def get_subscription(authorization: str = Header(None)):
    """
    Placeholder subscription endpoint.
    Frontend expects: GET /api/subscription with a Bearer token.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    # ✅ Stubbed subscription data — replace with real logic later
    return {
        "plan": "free",
        "status": "inactive",
        "renewal_date": None,
        "message": "Subscription endpoint placeholder working fine ✅"
    }
