from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.scopus.exceptions import (
    ScopusAuthError,
    ScopusConnectionError,
    ScopusRateLimitError,
    ScopusResponseError,
)

def init_error_handlers(app):
    """Registrar manejadores de excepciones en FastAPI."""

    @app.exception_handler(ScopusAuthError)
    async def scopus_auth_error_handler(request: Request, exc: ScopusAuthError):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "Authentication Error", "detail": str(exc)},
        )

    @app.exception_handler(ScopusConnectionError)
    async def scopus_connection_error_handler(request: Request, exc: ScopusConnectionError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Connection Error", "detail": str(exc)},
        )

    @app.exception_handler(ScopusRateLimitError)
    async def scopus_rate_limit_handler(request: Request, exc: ScopusRateLimitError):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": "Rate Limit Exceeded", "detail": str(exc)},
        )

    @app.exception_handler(ScopusResponseError)
    async def scopus_response_error_handler(request: Request, exc: ScopusResponseError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "Invalid Response", "detail": str(exc)},
        )
