from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.config import settings
from app.core.rate_limiter import rate_limit_middleware
from app.core.websocket import manager
from app.core.logging import logger, request_logger

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered E-Commerce Review Analysis Platform",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def logging_middleware(request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    request_logger.log_request(
        endpoint=str(request.url.path),
        method=request.method,
        duration=duration,
        status_code=response.status_code
    )
    return response

app.middleware("http")(rate_limit_middleware)

app.include_router(router)

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message({
                "type": "echo",
                "message": f"Received: {data}"
            }, client_id)
    except WebSocketDisconnect:
        manager.disconnect(client_id)

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "features": [
            "Sentiment Analysis",
            "Emotion Detection",
            "Review Summarization",
            "Star Rating Prediction",
            "Product Improvement Suggestions",
            "Real-time WebSocket Updates",
            "Data Export (CSV/JSON)",
            "Rate Limiting",
            "Caching",
            "Comprehensive Logging"
        ],
        "endpoints": {
            "analyze": "/api/analyze",
            "batch": "/api/analyze/batch",
            "history": "/api/history",
            "stats": "/api/stats",
            "export": "/api/export",
            "websocket": "/ws/{client_id}",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health():
    from app.core.cache import analysis_cache
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "connections": manager.get_connection_count(),
        "cache_stats": analysis_cache.get_stats(),
        "request_stats": request_logger.get_stats()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
