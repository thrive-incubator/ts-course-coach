"""FastAPI application entry point."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.config import get_settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: runs on startup and shutdown."""
    logger.info("[STARTUP] TS Course Coach backend starting...")
    logger.info("[STARTUP] Debug mode: %s", settings.debug)
    logger.info("[STARTUP] CORS origins: %s", settings.cors_origins)
    yield
    logger.info("[SHUTDOWN] TS Course Coach backend shutting down...")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="TS Course Coach API",
    version="0.1.0",
    lifespan=lifespan,
)

# Trust Cloud Run's reverse proxy so redirect URLs use https:// not http://
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

if settings.debug:
    debug_origins = [
        "http://localhost:5173",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5173",
    ]
    for o in debug_origins:
        if o not in origins:
            origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

API_V1_PREFIX = "/api/v1"

# Mount your routers here:
# from app.api import my_router
# app.include_router(my_router.router, prefix=API_V1_PREFIX)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ts-ts-course-coach-backend",
        "version": "0.1.0",
    }
