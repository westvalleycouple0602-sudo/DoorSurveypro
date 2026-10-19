from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from .observability import init_logging, init_sentry, init_tracing, log
from .health import router as health_router
from .rum_router import router as rum_router
from app.validation import validate_scan as validation_app
init_logging(); init_sentry(); init_tracing()
app = FastAPI(title="DoorSurvey API")
app.include_router(health_router)
app.include_router(rum_router)
app.mount("/validate", validation_app.app)
app.mount("/", StaticFiles(directory="public", html=True), name="static")
@app.middleware("http")
async def add_logging(request: Request, call_next):
    response = await call_next(request)
    log("http", path=str(request.url.path), status=response.status_code)
    return response
@app.get("/")
def root():
    return {"service": "doorsurvey", "ok": True}
