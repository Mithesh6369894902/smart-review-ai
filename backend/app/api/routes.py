from fastapi import APIRouter, HTTPException, WebSocket, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from typing import Optional
from app.core.ml_pipeline import pipeline
from app.core.cache import analysis_cache
from app.core.database import db
from app.core.export import exporter
from app.core.websocket import manager
from app.core.logging import logger, request_logger
from datetime import datetime
import asyncio
import io
import json

router = APIRouter(prefix="/api", tags=["analysis"])

MAX_REVIEW_LEN = 5000
MAX_BATCH_SIZE = 50

class ReviewRequest(BaseModel):
    text: str
    product_name: Optional[str] = None

    @field_validator("text")
    @classmethod
    def text_must_be_valid(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Review text cannot be empty")
        if len(v) > MAX_REVIEW_LEN:
            raise ValueError(f"Review text too long (max {MAX_REVIEW_LEN} chars)")
        return v.strip()

    @field_validator("product_name")
    @classmethod
    def product_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v[:200] if v else None

class BatchRequest(BaseModel):
    reviews: list[str]
    product_name: Optional[str] = None

    @field_validator("reviews")
    @classmethod
    def reviews_must_be_valid(cls, v: list) -> list:
        if not v:
            raise ValueError("Reviews list cannot be empty")
        if len(v) > MAX_BATCH_SIZE:
            raise ValueError(f"Too many reviews (max {MAX_BATCH_SIZE})")
        cleaned = []
        for r in v:
            if isinstance(r, str) and r.strip():
                cleaned.append(r.strip()[:MAX_REVIEW_LEN])
        if not cleaned:
            raise ValueError("Reviews list cannot be empty")
        return cleaned

class ExportRequest(BaseModel):
    format: str = "csv"
    limit: int = 100

@router.post("/analyze")
async def analyze_review(request: ReviewRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Review text cannot be empty")

    cached = analysis_cache.get_analysis(request.text)
    if cached:
        logger.info(f"Cache hit for analysis: {request.text[:50]}...")
        cached["from_cache"] = True
        return {"status": "success", "data": cached}

    try:
        result = pipeline.analyze(request.text)
        result["product_name"] = request.product_name
        result["timestamp"] = datetime.now().isoformat()
        result["from_cache"] = False

        analysis_id = db.save_analysis(result)
        result["id"] = analysis_id

        analysis_cache.set_analysis(request.text, result)

        logger.info(f"Analysis completed for: {request.text[:50]}...")
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/analyze/stream")
async def analyze_review_stream(request: ReviewRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Review text cannot be empty")

    async def generate():
        def sse(payload: dict) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        yield sse({'stage': 'preprocessing', 'progress': 0, 'message': 'Starting analysis...'})
        await asyncio.sleep(0.1)

        result = pipeline.analyze(request.text)

        yield sse({'stage': 'sentiment', 'progress': 25, 'message': 'Sentiment analyzed'})
        await asyncio.sleep(0.05)

        yield sse({'stage': 'emotion', 'progress': 50, 'message': 'Emotions detected'})
        await asyncio.sleep(0.05)

        yield sse({'stage': 'summary', 'progress': 75, 'message': 'Summary generated'})
        await asyncio.sleep(0.05)

        result["product_name"] = request.product_name
        result["timestamp"] = datetime.now().isoformat()

        yield sse({'stage': 'complete', 'progress': 100, 'message': 'Analysis complete', 'result': result})

    return StreamingResponse(generate(), media_type="text/event-stream")

@router.post("/analyze/batch")
async def analyze_batch(request: BatchRequest):
    results = []
    for review_text in request.reviews:
        try:
            cached = analysis_cache.get_analysis(review_text)
            if cached:
                cached = dict(cached)
                cached["from_cache"] = True
                results.append(cached)
                continue

            result = pipeline.analyze(review_text)
            result["product_name"] = request.product_name
            result["timestamp"] = datetime.now().isoformat()
            result["from_cache"] = False
            analysis_cache.set_analysis(review_text, result)
            results.append(result)
        except Exception as e:
            logger.error(f"Batch item failed: {str(e)}")
            results.append({"text": review_text, "error": str(e)})

    ok_results = [r for r in results if "error" not in r]
    for result in ok_results:
        try:
            saved_id = db.save_analysis(result)
            result["id"] = saved_id
        except Exception as e:
            logger.error(f"Failed to save batch result: {e}")

    ok_sentiments = [r["sentiment"]["sentiment"] for r in ok_results if "sentiment" in r]
    ok_ratings = [r["rating"]["rating"] for r in ok_results if "rating" in r]
    avg_rating = round(sum(ok_ratings) / len(ok_ratings), 2) if ok_ratings else 0.0

    return {
        "status": "success",
        "data": {
            "results": results,
            "summary": {
                "total": len(results),
                "successful": len(ok_results),
                "failed": len(results) - len(ok_results),
                "sentiment_distribution": {
                    "positive": ok_sentiments.count("positive"),
                    "neutral": ok_sentiments.count("neutral"),
                    "negative": ok_sentiments.count("negative")
                },
                "average_rating": avg_rating
            }
        }
    }

@router.get("/history")
async def get_history(limit: int = Query(20, le=100), offset: int = Query(0, ge=0)):
    analyses = db.get_analyses(limit=limit, offset=offset)
    return {
        "status": "success",
        "data": analyses,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": db.get_stats()["total_reviews"]
        }
    }

@router.get("/history/{analysis_id}")
async def get_analysis(analysis_id: int):
    analysis = db.get_analysis_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"status": "success", "data": analysis}

@router.get("/stats")
async def get_stats():
    stats = db.get_stats()
    cache_stats = analysis_cache.get_stats()
    stats["cache"] = cache_stats
    stats["api_usage"] = request_logger.get_stats()
    return {"status": "success", "data": stats}

@router.post("/export")
async def export_data(request: ExportRequest):
    analyses = db.get_analyses(limit=request.limit)
    stats = db.get_stats()

    if request.format == "csv":
        csv_data = exporter.to_csv(analyses)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=analyses.csv"}
        )
    elif request.format == "json":
        json_data = exporter.to_json(analyses)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=analyses.json"}
        )
    elif request.format == "report":
        report = exporter.to_summary_report(analyses, stats)
        return Response(
            content=report,
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=report.txt"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use csv, json, or report")

@router.delete("/history")
async def clear_history():
    deleted = db.clear_analyses()
    analysis_cache.clear()
    return {"status": "success", "message": f"History and cache cleared ({deleted} records removed)"}

@router.get("/cache/stats")
async def get_cache_stats():
    return {"status": "success", "data": analysis_cache.get_stats()}

@router.post("/cache/clear")
async def clear_cache():
    analysis_cache.clear()
    return {"status": "success", "message": "Cache cleared"}
