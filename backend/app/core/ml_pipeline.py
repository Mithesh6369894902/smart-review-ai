from app.models.advanced_sentiment import advanced_analyzer
from app.models.emotion import detector as emotion_detector
from app.models.summarizer import summarizer as review_summarizer
from app.models.predictor import predictor as rating_predictor
from app.models.suggestions import generator as suggestion_generator
from app.core.logging import logger

class MLPipeline:
    def __init__(self):
        self.sentiment = advanced_analyzer
        self.emotion = emotion_detector
        self.summarizer = review_summarizer
        self.rating = rating_predictor
        self.suggestions = suggestion_generator

    def analyze(self, text: str) -> dict:
        import time
        started = time.perf_counter()
        logger.info(f"Starting analysis for text: {text[:50]}...")

        sentiment_result = self.sentiment.predict(text)
        logger.debug(f"Sentiment: {sentiment_result['sentiment']} ({sentiment_result['confidence']:.1f}%)")

        emotion_result = self.emotion.detect(text)
        logger.debug(f"Emotion: {emotion_result['primary_emotion']}")

        summary_result = self.summarizer.summarize(text)
        logger.debug(f"Summary generated: {len(summary_result['summary'])} chars")

        rating_result = self.rating.predict(text)
        logger.debug(f"Rating: {rating_result['rating']}/5.0")

        suggestion_result = self.suggestions.generate(
            text, sentiment_result["sentiment"]
        )
        logger.debug(f"Suggestions: {len(suggestion_result['suggestions'])} generated")

        overall_score = self._calculate_overall_score(
            sentiment_result, rating_result, emotion_result
        )

        result = {
            "text": text,
            "sentiment": sentiment_result,
            "emotion": emotion_result,
            "summary": summary_result,
            "rating": rating_result,
            "suggestions": suggestion_result,
            "overall_score": overall_score,
            "analysis_metadata": {
                "engine": "Server AI (FastAPI ML Pipeline)",
                "model_version": "2.0",
                "features_used": [
                    "TF-IDF Vectorization",
                    "Logistic Regression",
                    "Emotion Lexicon",
                    "Extractive Summarization",
                    "Rating Regression",
                    "Topic Disambiguation"
                ],
                "processing_time_ms": round((time.perf_counter() - started) * 1000, 2)
            }
        }

        logger.info(f"Analysis complete: {sentiment_result['sentiment']} | Grade: {overall_score['grade']}")
        return result

    def _calculate_overall_score(self, sentiment: dict, rating: dict, emotion: dict) -> dict:
        sentiment_weight = {"positive": 1.0, "neutral": 0.5, "negative": 0.0}
        sentiment_score = sentiment_weight.get(sentiment["sentiment"], 0.5)

        rating_score = rating["rating"] / 5.0

        primary = emotion["primary_emotion"]
        emotion_weight = {
            "happy": 1.0,
            "surprised": 0.8,
            "neutral": 0.5,
            "sad": 0.2,
            "angry": 0.0,
            "fearful": 0.1,
            "disgusted": 0.0
        }
        emotion_score = emotion_weight.get(primary, 0.5)

        confidence_bonus = (sentiment["confidence"] / 100) * 0.1

        overall = (sentiment_score * 0.4 + rating_score * 0.4 + emotion_score * 0.2 + confidence_bonus) * 100
        overall = min(100, max(0, overall))

        return {
            "score": round(overall, 2),
            "grade": self._get_grade(overall),
            "breakdown": {
                "sentiment": round(sentiment_score * 100, 2),
                "rating": round(rating_score * 100, 2),
                "emotion": round(emotion_score * 100, 2),
                "confidence_bonus": round(confidence_bonus * 100, 2)
            }
        }

    def _get_grade(self, score: float) -> str:
        if score >= 90: return "A+"
        if score >= 80: return "A"
        if score >= 70: return "B+"
        if score >= 60: return "B"
        if score >= 50: return "C+"
        if score >= 40: return "C"
        if score >= 30: return "D"
        return "F"

pipeline = MLPipeline()
