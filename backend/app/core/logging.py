import logging
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
import sys

LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, "extra_data"):
            log_data["data"] = record.extra_data
        return json.dumps(log_data)

class PerformanceFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, "start_time"):
            record.start_time = time.time()
        record.duration = time.time() - record.start_time
        return True

def setup_logging():
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Safe stdout encoding on Windows
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(module)s:%(funcName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    file_handler = logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(file_handler)

    error_handler = logging.FileHandler(LOG_DIR / "errors.log", encoding="utf-8")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(error_handler)

    return root_logger

logger = setup_logging()

class RequestLogger:
    def __init__(self):
        self.request_count = 0
        self.total_time = 0

    def log_request(self, endpoint: str, method: str, duration: float, status_code: int, user_id: Optional[int] = None):
        self.request_count += 1
        self.total_time += duration

        log_data = {
            "endpoint": endpoint,
            "method": method,
            "duration_ms": round(duration * 1000, 2),
            "status_code": status_code,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        if status_code >= 400:
            logger.warning(f"Request failed: {json.dumps(log_data)}")
        else:
            logger.info(f"Request completed: {json.dumps(log_data)}")

    def get_stats(self) -> dict:
        return {
            "total_requests": self.request_count,
            "avg_response_time": round(self.total_time / max(self.request_count, 1) * 1000, 2),
            "total_time_seconds": round(self.total_time, 2)
        }

request_logger = RequestLogger()
