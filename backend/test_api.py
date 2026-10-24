import requests
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_URL = "http://localhost:8000"

def test_health():
    response = requests.get(f"{BASE_URL}/health")
    print("Health Check:", response.json())

def test_analyze():
    review = "This product is amazing! Best purchase I ever made. Highly recommend!"
    response = requests.post(f"{BASE_URL}/api/analyze", json={"text": review})
    print("\nAnalysis Result:")
    result = response.json()
    print(json.dumps(result, indent=2))

def test_batch():
    reviews = [
        "Great product! Love it!",
        "Terrible quality. Want refund.",
        "It's okay, nothing special."
    ]
    response = requests.post(f"{BASE_URL}/api/analyze/batch", json={"reviews": reviews})
    print("\nBatch Analysis:")
    print(json.dumps(response.json(), indent=2))

def test_stats():
    response = requests.get(f"{BASE_URL}/api/stats")
    print("\nStatistics:")
    print(json.dumps(response.json(), indent=2))

def test_history():
    response = requests.get(f"{BASE_URL}/api/history?limit=5")
    print("\nHistory:")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("=" * 50)
    print("SmartReviewAI API Tests")
    print("=" * 50)

    try:
        test_health()
        test_analyze()
        test_batch()
        test_stats()
        test_history()
        print("\n" + "=" * 50)
        print("All tests completed!")
        print("=" * 50)
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to server.")
        print("Make sure the backend is running on http://localhost:8000")
