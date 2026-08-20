"""FastAPI application entry point."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api import coach, config_route, pricing, proposal
from app.core.config import get_settings

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] TS Course Coach backend starting...")
    logger.info("[STARTUP] Debug mode: %s", settings.debug)
    logger.info("[STARTUP] CORS origins: %s", settings.cors_origins)
    yield
    logger.info("[SHUTDOWN] TS Course Coach backend shutting down...")


app = FastAPI(
    title="TS Course Coach API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
if settings.debug:
    for o in [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]:
        if o not in origins:
            origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_V1_PREFIX = "/api/v1"

app.include_router(config_route.router, prefix=API_V1_PREFIX)
app.include_router(coach.router, prefix=API_V1_PREFIX)
app.include_router(pricing.router, prefix=API_V1_PREFIX)
app.include_router(proposal.router, prefix=API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ts-course-coach-backend", "version": "0.1.0"}


@app.get("/api/v1/health")
async def api_health_check():
    return {"status": "healthy", "service": "ts-course-coach-backend", "version": "0.1.0"}
