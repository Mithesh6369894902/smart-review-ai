import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict
from contextlib import contextmanager

DB_PATH = Path(__file__).parent.parent / "data" / "smartreview.db"

class Database:
    def __init__(self):
        self.db_path = DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    product_name TEXT,
                    sentiment TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    probabilities TEXT NOT NULL,
                    emotion TEXT NOT NULL,
                    emotions TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    rating REAL NOT NULL,
                    stars INTEGER NOT NULL,
                    suggestions TEXT NOT NULL,
                    topics TEXT NOT NULL,
                    overall_score REAL NOT NULL,
                    grade TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    api_key TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS api_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    endpoint TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    response_time REAL,
                    status_code INTEGER,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_analyses_sentiment ON analyses(sentiment)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage(user_id, timestamp)
            """)
            conn.commit()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def save_analysis(self, analysis: Dict, user_id: Optional[int] = None) -> int:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO analyses (
                    text, product_name, sentiment, confidence, probabilities,
                    emotion, emotions, summary, rating, stars,
                    suggestions, topics, overall_score, grade, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analysis.get("text"),
                analysis.get("product_name"),
                analysis["sentiment"]["sentiment"],
                analysis["sentiment"]["confidence"],
                json.dumps(analysis["sentiment"]["probabilities"]),
                analysis["emotion"]["primary_emotion"],
                json.dumps(analysis["emotion"]["emotions"]),
                analysis["summary"]["summary"],
                analysis["rating"]["rating"],
                analysis["rating"]["stars"],
                json.dumps(analysis["suggestions"]["suggestions"]),
                json.dumps(analysis["suggestions"]["topics_detected"]),
                analysis["overall_score"]["score"],
                analysis["overall_score"]["grade"],
                user_id
            ))
            conn.commit()
            return cursor.lastrowid

    def get_analyses(self, limit: int = 50, offset: int = 0, user_id: Optional[int] = None) -> List[Dict]:
        with self._get_connection() as conn:
            query = "SELECT * FROM analyses"
            params = []
            if user_id:
                query += " WHERE user_id = ?"
                params.append(user_id)
            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_dict(row) for row in rows]

    def get_analysis_by_id(self, analysis_id: int) -> Optional[Dict]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
            return self._row_to_dict(row) if row else None

    def clear_analyses(self, user_id: Optional[int] = None) -> int:
        with self._get_connection() as conn:
            if user_id:
                cursor = conn.execute("DELETE FROM analyses WHERE user_id = ?", (user_id,))
            else:
                cursor = conn.execute("DELETE FROM analyses")
            conn.commit()
            return cursor.rowcount or 0

    def get_stats(self, user_id: Optional[int] = None) -> Dict:
        with self._get_connection() as conn:
            query = "SELECT COUNT(*) as total, sentiment, AVG(confidence) as avg_confidence, AVG(rating) as avg_rating FROM analyses"
            params = []
            if user_id:
                query += " WHERE user_id = ?"
                params.append(user_id)
            query += " GROUP BY sentiment"

            rows = conn.execute(query, params).fetchall()

            stats = {
                "total_reviews": 0,
                "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
                "average_confidence": 0,
                "average_rating": 0
            }

            total_confidence = 0
            total_rating = 0
            total_count = 0

            for row in rows:
                stats["total_reviews"] += row["total"]
                stats["sentiment_distribution"][row["sentiment"]] = row["total"]
                total_confidence += row["avg_confidence"] * row["total"]
                total_rating += row["avg_rating"] * row["total"]
                total_count += row["total"]

            if total_count > 0:
                stats["average_confidence"] = round(total_confidence / total_count, 2)
                stats["average_rating"] = round(total_rating / total_count, 2)

            # Recent trend: most common sentiment among last 5 analyses
            try:
                recent_rows = conn.execute(
                    "SELECT sentiment FROM analyses ORDER BY created_at DESC LIMIT 5"
                ).fetchall()
                recent = [r["sentiment"] for r in recent_rows]
                stats["recent_trend"] = max(set(recent), key=recent.count) if recent else "neutral"
            except Exception:
                stats["recent_trend"] = "neutral"

            return stats

    def log_api_usage(self, user_id: Optional[int], endpoint: str, response_time: float, status_code: int):
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO api_usage (user_id, endpoint, response_time, status_code)
                VALUES (?, ?, ?, ?)
            """, (user_id, endpoint, response_time, status_code))
            conn.commit()

    def get_api_usage_stats(self, user_id: Optional[int] = None) -> Dict:
        with self._get_connection() as conn:
            query = """
                SELECT
                    COUNT(*) as total_requests,
                    AVG(response_time) as avg_response_time,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
                FROM api_usage
            """
            params = []
            if user_id:
                query += " WHERE user_id = ?"
                params.append(user_id)

            row = conn.execute(query, params).fetchone()
            return {
                "total_requests": row["total_requests"],
                "avg_response_time": round(row["avg_response_time"] or 0, 3),
                "error_count": row["error_count"],
                "success_rate": round((1 - (row["error_count"] or 0) / max(row["total_requests"], 1)) * 100, 2)
            }

    def _row_to_dict(self, row) -> Dict:
        stars = int(row["stars"] or 0)
        summary_text = row["summary"] or ""
        sentiment_val = row["sentiment"] or "neutral"
        conf = float(row["confidence"] or 0)
        rating_val = float(row["rating"] or 0)
        primary_emo = row["emotion"] or "neutral"

        polarity = "Strongly Positive" if sentiment_val == "positive" and conf >= 70 else "Moderately Positive" if sentiment_val == "positive" else "Critical Negative" if sentiment_val == "negative" and conf >= 70 else "Moderately Negative" if sentiment_val == "negative" else "Neutral / Balanced"

        tier_map = {5: "Outstanding", 4: "Good / Recommended", 3: "Average / Acceptable", 2: "Below Expectations", 1: "Unacceptable"}
        satisfaction = "Delighted" if rating_val >= 4.5 else "Satisfied" if rating_val >= 3.8 else "Neutral / Mixed" if rating_val >= 2.8 else "Unsatisfied" if rating_val >= 1.8 else "Extremely Frustrated"

        emo_desc_map = {
            "happy": "Customer expresses delight, satisfaction, and positive enthusiasm.",
            "sad": "Customer expresses disappointment, regret, or discontent.",
            "angry": "Customer expresses frustration, anger, or strong annoyance.",
            "surprised": "Customer expresses astonishment or unexpected delight.",
            "fearful": "Customer expresses worry, anxiety, or hesitation.",
            "disgusted": "Customer expresses strong disapproval, revulsion, or feeling cheated.",
            "neutral": "Customer expresses objective, matter-of-fact, or balanced feedback."
        }

        sent_w = {"positive": 100.0, "neutral": 50.0, "negative": 0.0}.get(sentiment_val, 50.0)
        rat_w = round(min(1.0, max(0.0, rating_val / 5.0)) * 100.0, 1)
        emo_w = {"happy": 100.0, "surprised": 80.0, "neutral": 50.0, "sad": 20.0, "angry": 0.0, "fearful": 10.0, "disgusted": 0.0}.get(primary_emo, 50.0)
        cb = round((conf / 100.0) * 10.0, 1)

        breakdown = {
            "sentiment": sent_w,
            "rating": rat_w,
            "emotion": emo_w,
            "confidence_bonus": cb
        }

        topics = []
        try:
            topics = json.loads(row["topics"] or "[]")
        except Exception:
            pass

        suggestions = []
        try:
            suggestions = json.loads(row["suggestions"] or "[]")
        except Exception:
            pass

        priority = "Critical" if sentiment_val == "negative" and any(t in ["quality", "service"] for t in topics) else "High" if sentiment_val == "negative" else "Medium" if sentiment_val == "neutral" else "Low"

        return {
            "id": row["id"],
            "text": row["text"],
            "product_name": row["product_name"],
            "sentiment": {
                "sentiment": sentiment_val,
                "confidence": conf,
                "probabilities": json.loads(row["probabilities"] or "{}"),
                "polarity": polarity
            },
            "emotion": {
                "primary_emotion": primary_emo,
                "emotions": json.loads(row["emotions"] or "{}"),
                "has_negation": False,
                "description": emo_desc_map.get(primary_emo, "Balanced customer feedback.")
            },
            "summary": {
                "summary": summary_text,
                "original_length": len(row["text"] or ""),
                "summary_length": len(summary_text),
                "compression_ratio": round(len(summary_text) / max(len(row["text"] or ""), 1) * 100, 2),
                "key_sentences": [s.strip() for s in summary_text.split('.') if len(s.strip()) > 5] or ([summary_text] if summary_text else [])
            },
            "rating": {
                "rating": rating_val,
                "stars": stars,
                "star_display": "★" * stars + "☆" * (5 - stars),
                "tier": tier_map.get(stars, "Moderate"),
                "satisfaction": satisfaction
            },
            "suggestions": {
                "suggestions": suggestions,
                "topics_detected": topics,
                "keywords": [],
                "priority": priority
            },
            "overall_score": {
                "score": float(row["overall_score"] or 0),
                "grade": row["grade"] or "—",
                "breakdown": breakdown
            },
            "analysis_metadata": {
                "engine": "Database Archive (Saved Analysis)",
                "model_version": "2.0"
            },
            "timestamp": row["created_at"],
            "created_at": row["created_at"]
        }

db = Database()
