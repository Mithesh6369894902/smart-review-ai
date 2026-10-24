"""
SmartReviewAI - Cloud Backend (Single File)
All ML models and API in one deployable file.
"""
import re
import json
import math
import pickle
import os
from pathlib import Path
from datetime import datetime
from collections import defaultdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
import numpy as np

# ==================== TEXT PREPROCESSING ====================
STOP_WORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're",
    "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves',
    'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself',
    'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those',
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
    'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
    'about', 'against', 'between', 'through', 'during', 'before', 'after', 'above',
    'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    's', 't', 'can', 'will', 'just', 'don', "don't", 'should', "should've",
    'now', 'd', 'll', 'm', 'o', 're', 've', 'y'
}

def preprocess(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return ' '.join(w for w in text.split() if w not in STOP_WORDS and len(w) > 2)

# ==================== TRAINING DATA ====================
POSITIVE = [
    "This product is amazing! Best purchase I ever made.",
    "Love it! Highly recommend to everyone.",
    "Excellent quality and fast shipping.",
    "Perfect! Exceeded my expectations.",
    "Great value for money. Very satisfied.",
    "Works perfectly. Very happy with this purchase.",
    "Outstanding product! Will buy again.",
    "Fantastic quality, arrived quickly.",
    "This is exactly what I needed. Perfect!",
    "Wonderful product, great customer service.",
    "Absolutely love this! Five stars!",
    "Superb quality and beautiful design.",
    "Best product in this price range.",
    "Very impressed with the quality.",
    "Highly recommended! Great experience.",
    "Exceeded all my expectations!",
    "This is a game changer! So useful.",
    "Amazing product, works like a charm.",
    "Best investment I have made this year.",
    "Incredible quality for the price.",
    "Love the design and functionality.",
    "Perfect fit and finish. Very pleased.",
    "Fast delivery and great packaging.",
    "This product is a must-have!",
    "Super happy with my purchase!",
    "Top-notch quality and performance.",
    "Absolutely worth every penny.",
    "This product changed my life!",
    "So glad I bought this. Amazing!",
    "Best thing I have bought in years.",
    "Perfect in every way possible.",
    "Could not be happier with this!",
    "Exactly what I was looking for.",
    "Amazing value and great quality.",
    "This product is a masterpiece!",
    "So impressed with the quality.",
    "Worth every single penny!",
    "Best product I have ever used.",
    "Brilliant product, works great!",
    "I am in love with this product!",
    "Superb craftsmanship and design.",
    "Very pleased with my order.",
    "High quality and fast delivery.",
    "Five stars all the way!",
    "Absolutely fantastic purchase.",
    "Great product, highly recommend!",
    "Stunning quality, love it!",
    "Perfect product, no complaints.",
    "Exceeded expectations in every way.",
    "Best online purchase I have made.",
    "Amazing build quality and finish.",
    "Very happy with the results.",
    "Outstanding value and performance.",
    "Great product, great price!",
    "Love everything about this product.",
    "Top quality, highly recommended.",
    "Fantastic experience from start to finish.",
    "Super impressed with the quality.",
    "Absolutely love the design!",
    "Works like a dream, very satisfied.",
    "Premium quality at an affordable price.",
    "Delighted with this purchase!",
    "This product exceeded all my hopes.",
    "Incredibly well made and beautiful.",
    "Love the features and performance.",
    "This product is a winner!",
    "Highly recommend to all my friends.",
    "Beautiful design and great function.",
    "Very satisfied with this buy!",
    "This is the best thing ever!",
    "Quality is outstanding and impressive.",
    "Happy customer here, five stars!",
    "Amazing product, totally worth it!",
    "Exquisite quality and fast shipping.",
    "I am thoroughly impressed!",
    "Best quality I have seen in years.",
    "Wonderful experience, will buy again!",
    "Top rated product, absolutely love it!",
    "Great features and excellent build.",
    "I am very pleased with this product.",
    "Best purchase decision I ever made.",
    "Superb product, no regrets at all!",
    "Quality exceeds the price paid.",
    "I highly recommend this to everyone!",
    "Excellent in every possible way!",
    "Love the attention to detail.",
    "Fastest shipping and great quality.",
    "This is pure gold!",
]

NEUTRAL = [
    "The product is okay, nothing special.",
    "Average quality, does the job.",
    "It is fine, not great but not bad either.",
    "Decent product for the price.",
    "Mediocre at best. Expected more.",
    "Not bad, but could be better.",
    "It works, but nothing to write home about.",
    "Fair product, meets basic needs.",
    "Satisfactory, but room for improvement.",
    "Middle of the road product.",
    "It is alright, nothing too exciting.",
    "Does what it is supposed to do.",
    "Standard product, nothing remarkable.",
    "Acceptable quality for the price.",
    "It is okay, I guess.",
    "Not the best, not the worst.",
    "Meets basic expectations.",
    "Functional but unremarkable.",
    "Adequate for everyday use.",
    "Does the job, nothing more.",
    "It is a standard product.",
    "Nothing special about it.",
    "It is what it is.",
    "Average at everything.",
    "Neither good nor bad really.",
    "Passable quality overall.",
    "Gets the job done adequately.",
    "Nothing to complain about really.",
    "Fair enough for the cost.",
    "It is just an okay product.",
    "Pretty standard, nothing unique.",
    "Decent but not impressive.",
    "Works as expected, nothing more.",
    "It is a basic product.",
    "Slightly above average maybe.",
    "Acceptable but not great.",
    "An ordinary product overall.",
    "Could be better, could be worse.",
    "It is just fine I suppose.",
    "Not remarkable in any way.",
]

NEGATIVE = [
    "This is terrible! Worst purchase ever.",
    "Very disappointed with the quality.",
    "Broken on arrival. Complete waste of money.",
    "Do not buy this! Total scam.",
    "Horrible product, terrible customer service.",
    "Worst experience ever. Want refund.",
    "Product stopped working after one day.",
    "Cheaply made and falls apart easily.",
    "Extremely dissatisfied. Want my money back.",
    "Awful quality. Never buying again.",
    "I hate this product. It is garbage.",
    "Poor quality materials, very flimsy.",
    "Complete junk. Save your money.",
    "Disgusting product. Unacceptable quality.",
    "Frustrated with this purchase. Very poor.",
    "Product is damaged and unusable.",
    "Terrible experience from start to finish.",
    "The worst product I have ever bought.",
    "Absolutely awful. Do not waste your money.",
    "Cheap and poorly made. Very disappointed.",
    "I regret buying this. Total waste.",
    "This product is a complete failure.",
    "Worst quality I have ever seen.",
    "Total disappointment. Want refund.",
    "This product is absolutely useless.",
    "Horrible experience. Never buying again.",
    "The quality is embarrassingly bad.",
    "This is a complete ripoff.",
    "Save your money, do not buy this!",
    "This product is a disaster.",
    "Absolutely hate this product.",
    "Worst thing I have ever purchased.",
    "Total garbage, do not waste money.",
    "Completely broken and defective.",
    "I want my money back immediately.",
    "This is a scam, stay away!",
    "Terrible quality, falls apart instantly.",
    "Do not buy this under any circumstances!",
    "I am extremely unhappy with this.",
    "This product ruined my experience.",
    "The worst purchase I have ever made.",
    "Absolutely dreadful product.",
    "I deeply regret this purchase.",
    "This is the worst thing ever made.",
    "Horrible quality and terrible design.",
    "A complete waste of hard earned money.",
    "This product is an embarrassment.",
    "I feel cheated buying this product.",
    "Absolutely abysmal quality overall.",
    "This is the definition of a bad product.",
    "Worst customer service I have experienced.",
    "Cheap junk that breaks immediately.",
    "I cannot believe how bad this is.",
    "This product should not be sold.",
    "Utterly disappointing in every way.",
    "I am angry about this terrible product.",
    "This is highway robbery, do not buy!",
    "Disgusting quality, absolutely terrible.",
    "This product is a total nightmare.",
    "I would give zero stars if I could.",
    "Absolutely horrendous product quality.",
    "The worst product on the market.",
    "This is junk pure and simple.",
    "Absolutely terrible in every aspect.",
    "This product does not deserve any stars.",
    "I feel scammed by this product.",
    "Worst quality product in existence.",
    "This is a defective piece of junk.",
    "I regret wasting my money on this.",
    "Absolutely horrible product experience.",
    "This product should be recalled immediately.",
]

# ==================== EMOTION DETECTION ====================
EMOTION_LEXICON = {
    "happy": {"words": ["happy", "love", "great", "amazing", "wonderful", "fantastic", "excellent", "awesome", "perfect", "beautiful", "delighted", "pleased", "thrilled", "excited", "grateful", "satisfied", "impressed", "outstanding", "brilliant", "superb"], "intensifiers": ["very", "extremely", "incredibly", "absolutely", "really"]},
    "sad": {"words": ["sad", "unhappy", "disappointed", "depressed", "upset", "regret", "miss", "hurt", "pain", "suffering"], "intensifiers": ["very", "extremely", "so", "really", "deeply"]},
    "angry": {"words": ["angry", "furious", "hate", "disgusted", "frustrated", "annoyed", "irritated", "mad", "livid", "infuriated"], "intensifiers": ["so", "extremely", "absolutely", "totally"]},
    "surprised": {"words": ["surprised", "shocked", "amazed", "astonished", "stunned", "unbelievable", "incredible", "wow", "unreal", "remarkable"], "intensifiers": ["absolutely", "completely", "utterly"]},
    "fearful": {"words": ["afraid", "scared", "terrified", "worried", "anxious", "nervous", "panic", "dread", "frightened", "concerned"], "intensifiers": ["very", "extremely", "really"]},
    "disgusted": {"words": ["disgusting", "gross", "revolting", "vile", "nasty", "horrible", "awful", "terrible", "repulsive", "sickening", "junk", "garbage", "ripoff", "scam", "waste"], "intensifiers": ["absolutely", "completely", "utterly", "totally"]},
}

def detect_emotion(text: str) -> dict:
    text_lower = text.lower()
    words = set(re.findall(r"[a-z']+", text_lower))
    word_list = text_lower.split()
    scores = defaultdict(float)
    for emo, data in EMOTION_LEXICON.items():
        for w in data["words"]:
            if w in words:
                base = len(w) / 10
                for intw in data["intensifiers"]:
                    if intw + " " + w in text_lower:
                        base *= 1.5
                        break
                scores[emo] += base
    has_neg = any(n in word_list for n in ["not", "no", "never", "don't", "doesn't", "didn't", "won't", "can't", "isn't", "aren't", "wasn't"])
    if not scores:
        scores["happy" if not has_neg else "sad"] = 0.3
    total = sum(scores.values()) or 1
    emotions = {k: round(v / total * 100, 2) for k, v in sorted(scores.items(), key=lambda x: x[1], reverse=True)}
    primary = max(scores, key=scores.get) if scores else "neutral"
    return {"primary_emotion": primary, "emotions": emotions, "has_negation": has_neg}

# ==================== STAR RATING ====================
RATING_REVIEWS = [
    ("This product is amazing! Best purchase ever!", 5.0), ("Love it! Highly recommend!", 5.0),
    ("Excellent quality and fast shipping.", 5.0), ("Perfect! Exceeded my expectations.", 5.0),
    ("Great value for money. Very satisfied.", 4.5), ("Works perfectly. Very happy.", 5.0),
    ("Outstanding product! Will buy again.", 5.0), ("Fantastic quality, arrived quickly.", 4.5),
    ("Exactly what I needed. Perfect!", 5.0), ("Wonderful product, great service.", 5.0),
    ("Absolutely love this! Five stars!", 5.0), ("Superb quality and design.", 4.5),
    ("Best in this price range.", 4.5), ("Very impressed with quality.", 4.0),
    ("Highly recommended!", 4.5), ("The product is okay, nothing special.", 3.0),
    ("Average quality, does the job.", 3.0), ("It is fine, not great but not bad.", 3.0),
    ("Decent product for the price.", 3.5), ("Mediocre at best.", 2.5),
    ("Not bad, but could be better.", 3.0), ("It works, but nothing special.", 3.0),
    ("Fair product, meets basic needs.", 3.0), ("Satisfactory, room for improvement.", 3.0),
    ("Middle of the road product.", 3.0), ("This is terrible! Worst purchase.", 1.0),
    ("Very disappointed with quality.", 1.5), ("Broken on arrival. Waste of money.", 1.0),
    ("Do not buy! Total scam.", 1.0), ("Horrible product, terrible service.", 1.0),
    ("Worst experience ever.", 1.0), ("Stopped working after one day.", 1.5),
    ("Cheaply made, falls apart.", 1.0), ("Extremely dissatisfied.", 1.0),
    ("Awful quality. Never again.", 1.0), ("I hate this product.", 1.0),
    ("Poor quality materials.", 1.5), ("Complete junk.", 1.0),
    ("Disgusting product.", 1.0), ("Frustrated with this purchase.", 1.5),
    ("Damaged and unusable.", 1.0), ("Terrible from start to finish.", 1.0),
    ("Worst product ever.", 1.0), ("Absolutely awful.", 1.0),
    ("Cheap and poorly made.", 1.5), ("I regret buying this.", 1.5),
    ("Good product but has issues.", 3.5), ("Works well but needs improvements.", 3.5),
    ("Nice product but shipping slow.", 3.5), ("Good value but quality could improve.", 3.5),
]

class RatingPredictor:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1, 2))
        self.model = LinearRegression()
        texts, ratings = zip(*RATING_REVIEWS)
        X = self.vectorizer.fit_transform([preprocess(t) for t in texts])
        self.model.fit(X, np.array(ratings))

    def predict(self, text: str) -> dict:
        X = self.vectorizer.transform([preprocess(text)])
        rating = max(1.0, min(5.0, float(self.model.predict(X)[0])))
        stars = round(rating)
        return {"rating": round(rating, 2), "stars": stars, "star_display": "★" * stars + "☆" * (5 - stars)}

# ==================== SENTIMENT MODEL ====================
class SentimentModel:
    def __init__(self):
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1, 2), sublinear_tf=True)),
            ('clf', LogisticRegression(max_iter=2000, C=2.0, class_weight='balanced', random_state=42, solver='lbfgs'))
        ])
        self.le = LabelEncoder()
        reviews = POSITIVE + NEUTRAL + NEGATIVE
        labels = ["positive"] * len(POSITIVE) + ["neutral"] * len(NEUTRAL) + ["negative"] * len(NEGATIVE)
        y = self.le.fit_transform(labels)
        X_train, X_test, y_train, y_test = train_test_split([preprocess(r) for r in reviews], y, test_size=0.2, random_state=42, stratify=y)
        Xtr = self.pipeline.named_steps['tfidf'].fit_transform(X_train)
        self.pipeline.named_steps['clf'].fit(Xtr, y_train)
        Xte = self.pipeline.named_steps['tfidf'].transform(X_test)
        self.accuracy = accuracy_score(y_test, self.pipeline.named_steps['clf'].predict(Xte))

    def predict(self, text: str) -> dict:
        X = self.pipeline.named_steps['tfidf'].transform([preprocess(text)])
        pred = self.pipeline.named_steps['clf'].predict(X)[0]
        pred_label = str(self.le.inverse_transform([pred])[0])
        probs = self.pipeline.named_steps['clf'].predict_proba(X)[0]
        confidence = float(max(probs)) * 100
        prob_dict = {str(c): round(float(p) * 100, 2) for c, p in zip(self.le.classes_, probs)}
        return {"sentiment": pred_label, "confidence": round(confidence, 2), "probabilities": prob_dict, "model_accuracy": round(self.accuracy * 100, 2)}

# ==================== SUMMARIZER ====================
def summarize(text: str, n: int = 3) -> dict:
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    if len(sentences) <= n:
        return {"summary": text, "original_length": len(text), "summary_length": len(text), "compression_ratio": 100.0, "key_sentences": sentences}
    vec = TfidfVectorizer(max_features=1000)
    processed = [preprocess(s) for s in sentences]
    try:
        tfidf = vec.fit_transform(processed)
        scores = np.array(tfidf.sum(axis=1)).flatten()
    except Exception:
        scores = np.ones(len(sentences))
    pos_bonus = np.linspace(1.0, 0.5, len(sentences))
    combined = scores * pos_bonus
    top_idx = sorted(np.argsort(combined)[-n:])
    key = [sentences[i] for i in top_idx]
    summary = '. '.join(key) + '.'
    return {"summary": summary, "original_length": len(text), "summary_length": len(summary), "compression_ratio": round(len(summary) / max(len(text), 1) * 100, 2), "key_sentences": key}

# ==================== SUGGESTIONS ====================
TOPIC_KW = {
    "quality": ["quality", "material", "build", "durable", "flimsy", "cheap", "premium"],
    "price": ["price", "cost", "expensive", "cheap", "value", "money", "worth"],
    "shipping": ["shipping", "delivery", "arrived", "package", "fast", "slow", "damaged"],
    "service": ["service", "support", "customer", "help", "response"],
    "design": ["design", "look", "style", "beautiful", "ugly"],
    "feature": ["feature", "function", "works", "easy", "difficult", "interface"],
}
SUGGESTIONS = {
    "quality": {"negative": ["Use higher-grade materials", "Implement stricter quality control", "Offer warranty for confidence"], "positive": ["Maintain current quality", "Highlight quality in marketing"]},
    "price": {"negative": ["Review pricing strategy", "Offer bundle deals", "Improve perceived value"], "positive": ["Price point is well-received"]},
    "shipping": {"negative": ["Partner with faster shipping providers", "Improve packaging", "Offer tracking updates"], "positive": ["Maintain shipping standards"]},
    "service": {"negative": ["Train customer service team", "Implement 24/7 chat support", "Offer hassle-free returns"], "positive": ["Maintain excellent service"]},
    "design": {"negative": ["Conduct user research for improvements", "A/B test design variations"], "positive": ["Design is well-received"]},
    "feature": {"negative": ["Prioritize most requested features", "Improve user documentation"], "positive": ["Feature set meets needs"]},
}

def get_suggestions(text: str, sentiment: str) -> dict:
    words = set(re.findall(r"[a-z']+", text.lower()))
    topics = [t for t, kws in TOPIC_KW.items() if any(k in words for k in kws)]
    suggs = []
    for t in set(topics):
        suggs.extend(SUGGESTIONS[t].get(sentiment, [])[:2])
    if not suggs:
        suggs = {"negative": ["Gather more customer feedback", "Implement feedback loop", "Consider product replacement"], "positive": ["Encourage satisfied customers to leave reviews", "Consider referral programs"]}.get(sentiment, ["Gather more feedback", "Consider product enhancements"])[:3]
    return {"suggestions": suggs[:5], "topics_detected": list(set(topics))}

# ==================== OVERALL SCORE ====================
SENT_W = {"positive": 1.0, "neutral": 0.5, "negative": 0.0}
EMO_W = {"happy": 1.0, "surprised": 0.8, "neutral": 0.5, "sad": 0.2, "angry": 0.0, "fearful": 0.1, "disgusted": 0.0}

def overall_score(sentiment: dict, rating: dict, emotion: dict) -> dict:
    ss = SENT_W.get(sentiment["sentiment"], 0.5)
    rs = rating["rating"] / 5.0
    es = EMO_W.get(emotion["primary_emotion"], 0.5)
    cb = (sentiment["confidence"] / 100) * 0.1
    score = min(100, max(0, (ss * 0.4 + rs * 0.4 + es * 0.2 + cb) * 100))
    if score >= 90: grade = "A+"
    elif score >= 80: grade = "A"
    elif score >= 70: grade = "B+"
    elif score >= 60: grade = "B"
    elif score >= 50: grade = "C+"
    elif score >= 40: grade = "C"
    elif score >= 30: grade = "D"
    else: grade = "F"
    return {"score": round(score, 2), "grade": grade, "breakdown": {"sentiment": round(ss * 100, 2), "rating": round(rs * 100, 2), "emotion": round(es * 100, 2), "confidence_bonus": round(cb * 100, 2)}}

# ==================== FASTAPI APP ====================
app = FastAPI(title="SmartReviewAI", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

sentiment_model = SentimentModel()
rating_model = RatingPredictor()

history: list = []

class ReviewReq(BaseModel):
    text: str
    product_name: Optional[str] = None

class BatchReq(BaseModel):
    reviews: list[str]
    product_name: Optional[str] = None

@app.get("/")
async def root():
    return {"name": "SmartReviewAI", "version": "2.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "2.0", "model_accuracy": round(sentiment_model.accuracy * 100, 1)}

@app.post("/api/analyze")
async def analyze(req: ReviewReq):
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Review text cannot be empty")
    if len(req.text) > 5000:
        raise HTTPException(400, "Review text too long (max 5000 chars)")
    sent = sentiment_model.predict(req.text)
    emo = detect_emotion(req.text)
    rat = rating_model.predict(req.text)
    sugg = get_suggestions(req.text, sent["sentiment"])
    summ = summarize(req.text)
    osc = overall_score(sent, rat, emo)
    result = {
        "id": len(history) + 1, "text": req.text, "product_name": req.product_name,
        "sentiment": sent, "emotion": emo, "rating": rat,
        "suggestions": sugg, "summary": summ, "overall_score": osc,
        "timestamp": datetime.now().isoformat()
    }
    history.append(result)
    return {"status": "success", "data": result}

@app.post("/api/analyze/batch")
async def analyze_batch(req: BatchReq):
    if not req.reviews:
        raise HTTPException(400, "Reviews list cannot be empty")
    if len(req.reviews) > 50:
        raise HTTPException(400, "Too many reviews (max 50)")
    results = []
    for text in req.reviews:
        if not isinstance(text, str) or not text.strip():
            results.append({"text": text, "error": "Empty review text"})
            continue
        sent = sentiment_model.predict(text)
        emo = detect_emotion(text)
        rat = rating_model.predict(text)
        sugg = get_suggestions(text, sent["sentiment"])
        summ = summarize(text)
        osc = overall_score(sent, rat, emo)
        item = {"text": text, "product_name": req.product_name, "sentiment": sent,
                "emotion": emo, "rating": rat, "suggestions": sugg,
                "summary": summ, "overall_score": osc,
                "timestamp": datetime.now().isoformat()}
        results.append(item)
        history.append({"id": len(history) + 1, **item})
    sentiments = [r["sentiment"]["sentiment"] for r in results]
    avg_r = sum(r["rating"]["rating"] for r in results) / max(len(results), 1)
    return {"status": "success", "data": {"results": results, "summary": {"total": len(results), "sentiment_distribution": {"positive": sentiments.count("positive"), "neutral": sentiments.count("neutral"), "negative": sentiments.count("negative")}, "average_rating": round(avg_r, 2)}}}

@app.get("/api/history")
async def get_history(limit: int = 20):
    return {"status": "success", "data": history[-limit:][::-1]}

@app.get("/api/stats")
async def get_stats():
    if not history:
        return {"status": "success", "data": {"total_reviews": 0, "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0}, "average_rating": 0, "average_confidence": 0, "recent_trend": "neutral"}}
    total = len(history)
    sents = [h["sentiment"]["sentiment"] for h in history if "sentiment" in h]
    rats = [h["rating"]["rating"] for h in history if "rating" in h]
    confs = [h["sentiment"]["confidence"] for h in history if "sentiment" in h]
    recent = sents[-5:] if sents else []
    trend = max(set(recent), key=recent.count) if recent else "neutral"
    return {"status": "success", "data": {"total_reviews": total, "sentiment_distribution": {"positive": sents.count("positive"), "neutral": sents.count("neutral"), "negative": sents.count("negative")}, "average_rating": round(sum(rats) / max(len(rats), 1), 2), "average_confidence": round(sum(confs) / max(len(confs), 1), 2), "recent_trend": trend}}

@app.delete("/api/history")
async def clear_history():
    history.clear()
    return {"status": "success", "message": "History cleared"}

class ExportReq(BaseModel):
    format: str = "csv"
    limit: int = 100

@app.post("/api/export")
async def export_data(req: ExportReq):
    import csv
    import io
    rows = history[-req.limit:][::-1]
    if req.format == "csv":
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(["id", "text", "product_name", "sentiment", "confidence", "rating", "emotion", "timestamp"])
        for r in rows:
            w.writerow([r.get("id"), (r.get("text") or "")[:200], r.get("product_name"),
                        (r.get("sentiment") or {}).get("sentiment"), (r.get("sentiment") or {}).get("confidence"),
                        (r.get("rating") or {}).get("rating"), (r.get("emotion") or {}).get("primary_emotion"),
                        r.get("timestamp")])
        return Response(content=out.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=analyses.csv"})
    elif req.format == "json":
        return Response(content=json.dumps({"export_date": datetime.now().isoformat(),
                                            "total_analyses": len(rows), "analyses": rows}, indent=2),
                        media_type="application/json",
                        headers={"Content-Disposition": "attachment; filename=analyses.json"})
    elif req.format == "report":
        lines = ["SMARTREVIEW AI - ANALYSIS REPORT", f"Generated: {datetime.now().isoformat()}",
                 f"Total: {len(rows)}", ""]
        for i, r in enumerate(rows[:50], 1):
            lines.append(f"{i}. [{((r.get('sentiment') or {}).get('sentiment') or 'N/A').upper()}] {str(r.get('text',''))[:100]}")
            lines.append(f"   Rating: {(r.get('rating') or {}).get('rating', 'N/A')}/5 | Emotion: {(r.get('emotion') or {}).get('primary_emotion', 'N/A')}")
        return Response(content="\n".join(lines), media_type="text/plain",
                        headers={"Content-Disposition": "attachment; filename=report.txt"})
    raise HTTPException(400, "Invalid format. Use csv, json, or report")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
