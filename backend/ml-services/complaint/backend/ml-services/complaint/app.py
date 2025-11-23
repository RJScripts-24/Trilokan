# app.py - FastAPI launcher (simplified)
import os
import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Helper: attempt to auto-create DB tables on startup when requested.
# Controlled by env var AUTO_CREATE_TABLES=true (opt-in).
AUTO_CREATE_TABLES = os.environ.get("AUTO_CREATE_TABLES", "false").lower() in ("1", "true", "yes")


def register_optional_db_startup(app: FastAPI) -> None:
    """
    If models.complaint exports `engine` and `Base`, add a startup handler that
    will create the tables using the async engine. This is opt-in via
    AUTO_CREATE_TABLES and is safe (no-op if models package missing).
    """
    if not AUTO_CREATE_TABLES:
        logger.debug("AUTO_CREATE_TABLES not enabled; skipping auto table creation.")
        return

    try:
        # import inside function so missing module doesn't break imports
        import models.complaint as mcomplaint  # type: ignore
        engine = getattr(mcomplaint, "engine", None)
        Base = getattr(mcomplaint, "Base", None)
        if engine is None or Base is None:
            logger.warning("models.complaint missing 'engine' or 'Base'; cannot auto-create tables.")
            return
    except Exception:
        logger.exception("Failed to import models.complaint; skipping auto table creation.")
        return

    @app.on_event("startup")
    async def _create_tables_if_needed():
        """
        Create DB tables using SQLAlchemy async engine run_sync(Base.metadata.create_all).
        This is only called when AUTO_CREATE_TABLES is enabled and models.complaint exists.
        """
        try:
            logger.info("AUTO_CREATE_TABLES enabled — creating DB tables if they do not exist.")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("DB table creation (if any) completed successfully.")
        except Exception:
            logger.exception("Error while creating DB tables (AUTO_CREATE_TABLES).")


# Try to use an app factory if you've scaffolded one in api.app_factory.
# If not present, we'll create an app inline so the file runs standalone.
try:
    from api.app_factory import create_app  # type: ignore
    app: FastAPI = create_app()
    logger.info("Using api.app_factory.create_app()")
    # Register optional DB startup step (if requested)
    register_optional_db_startup(app)
except Exception:
    logger.info("api.app_factory.create_app() not found — creating inline FastAPI app")

    app = FastAPI(title="Complaint Portal API (FastAPI)", version="1.0.0")

    # CORS - allow all origins for now (adjust in production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", response_class=JSONResponse)
    async def index():
        """Root endpoint to verify service is running and show basic info."""
        return {
            "service": "Complaint Portal API",
            "status": "active",
            "version": "1.0.0",
        }

    @app.get("/health", response_class=JSONResponse)
    async def health_check():
        """Simple health check."""
        return {"status": "healthy"}

    # If the user opted in to auto-create tables and models.complaint is available, attach startup handler
    register_optional_db_startup(app)


# If this module is run directly, start uvicorn (development convenience).
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    debug_env = os.environ.get("DEBUG", "false").lower() in ("1", "true", "yes")
    logger.info("Starting FastAPI app on port %d (debug=%s)", port, debug_env)

    # Use --reload only if DEBUG is true to mimic Flask debug behavior in dev.
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=debug_env)
