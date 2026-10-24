import requests
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE = "http://localhost:8000"

print("=" * 50)
print("SMARTREVIEWAI - FULL FEATURE TEST")
print("=" * 50)

# 1. Health
r = requests.get(f"{BASE}/health")
print("\n[1] HEALTH:", r.json()["status"])

# 2. Positive
r = requests.post(f"{BASE}/api/analyze", json={"text": "This product is amazing! Best purchase ever. Love it!"})
d = r.json()["data"]
print(f"\n[2] POSITIVE REVIEW")
print(f"    Sentiment: {d['sentiment']['sentiment']} ({d['sentiment']['confidence']}%)")
print(f"    Rating: {d['rating']['rating']}/5.0 {d['rating']['star_display']}")
print(f"    Emotion: {d['emotion']['primary_emotion']}")
print(f"    Grade: {d['overall_score']['grade']} ({d['overall_score']['score']})")
print(f"    Summary: {d['summary']['summary'][:80]}...")
print(f"    Suggestion: {d['suggestions']['suggestions'][0]}")

# 3. Negative
r = requests.post(f"{BASE}/api/analyze", json={"text": "Terrible product! Broke after one day. Waste of money. Want refund."})
d = r.json()["data"]
print(f"\n[3] NEGATIVE REVIEW")
print(f"    Sentiment: {d['sentiment']['sentiment']} ({d['sentiment']['confidence']}%)")
print(f"    Rating: {d['rating']['rating']}/5.0 {d['rating']['star_display']}")
print(f"    Emotion: {d['emotion']['primary_emotion']}")
print(f"    Grade: {d['overall_score']['grade']} ({d['overall_score']['score']})")
print(f"    Suggestion: {d['suggestions']['suggestions'][0]}")

# 4. Neutral
r = requests.post(f"{BASE}/api/analyze", json={"text": "The product is okay, nothing special. Average quality."})
d = r.json()["data"]
print(f"\n[4] NEUTRAL REVIEW")
print(f"    Sentiment: {d['sentiment']['sentiment']} ({d['sentiment']['confidence']}%)")
print(f"    Rating: {d['rating']['rating']}/5.0 {d['rating']['star_display']}")
print(f"    Emotion: {d['emotion']['primary_emotion']}")

# 5. Batch
r = requests.post(f"{BASE}/api/analyze/batch", json={"reviews": ["Great product!", "Terrible quality", "It is okay"]})
d = r.json()["data"]
print(f"\n[5] BATCH ({d['summary']['total']} reviews)")
print(f"    Distribution: {d['summary']['sentiment_distribution']}")
print(f"    Avg Rating: {d['summary']['average_rating']}")

# 6. Stats
r = requests.get(f"{BASE}/api/stats")
s = r.json()["data"]
print(f"\n[6] STATS")
print(f"    Total: {s['total_reviews']} | Avg Rating: {s['average_rating']} | Avg Confidence: {s['average_confidence']}")

# 7. History
r = requests.get(f"{BASE}/api/history?limit=3")
print(f"\n[7] HISTORY: {len(r.json()['data'])} records returned")

print("\n" + "=" * 50)
print("ALL 7 FEATURES WORKING!")
print("=" * 50)
