# api/app_factory.py
import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    Routers are imported inside the function to avoid circular imports.
    """
    app = FastAPI(
        title="Complaint Portal API",
        version="1.0.0",
        description="Backend service for Complaint Portal",
    )

    # -------------------------
    # CORS CONFIGURATION
    # -------------------------
    # Fully open during development. Make restrictive in production.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -------------------------
    # REGISTER ROUTES
    # -------------------------
    try:
        from api.routes import router as api_router
        app.include_router(api_router, prefix="/api/v1")
        logger.info("Router registered under /api/v1")
    except Exception as exc:
        logger.error("Failed to import api.routes: %s", exc)

    # -------------------------
    # GLOBAL ERROR HANDLING
    # -------------------------
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled exception at {request.url}: {exc}",
            exc_info=True
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )

    # -------------------------
    # STARTUP & SHUTDOWN HOOKS
    # -------------------------
    @app.on_event("startup")
    async def startup_event():
        logger.info("Complaint Portal API - Startup complete.")

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Complaint Portal API - Shutdown complete.")

    # -------------------------
    # HEALTH ENDPOINT
    # -------------------------
    @app.get("/health")
    async def health_check():
        """Simple health check."""
        return {"status": "healthy"}

    return app
