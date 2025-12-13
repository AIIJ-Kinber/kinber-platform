from fastapi import APIRouter
from fastapi.responses import JSONResponse
import traceback

# ----------------------------------------------------
# IMPORTANT:
# Prefix MUST be /accounts
# so final path becomes /api/accounts
# ----------------------------------------------------
router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("/")
async def get_accounts():
    """
    Temporary stub route to satisfy frontend.
    Returns an empty array as `accounts`
    exactly how the frontend expects it.
    """
    try:
        print("ℹ️ /api/accounts called — returning empty accounts array.")

        return JSONResponse(
            {
                "status": "success",
                "accounts": []  # <-- Frontend expects empty array
            }
        )

    except Exception as e:
        print("❌ accounts route error:", e)
        traceback.print_exc()
        return JSONResponse(
            {"status": "error", "message": str(e)},
            status_code=500
        )
