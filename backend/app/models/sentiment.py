import pickle
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from app.utils.preprocessor import preprocess_text

MODEL_PATH = Path(__file__).parent / "saved" / "sentiment_model.pkl"
VECTORIZER_PATH = Path(__file__).parent / "saved" / "sentiment_vectorizer.pkl"

class SentimentAnalyzer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        self.model = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
        self.is_trained = False
        self._load_or_train()

    def _get_training_data(self):
        reviews = [
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
            "The product is okay, nothing special.",
            "Average quality, does the job.",
            "It's fine, not great but not bad either.",
            "Decent product for the price.",
            "Mediocre at best. Expected more.",
            "Not bad, but could be better.",
            "It works, but nothing to write home about.",
            "Fair product, meets basic needs.",
            "Satisfactory, but room for improvement.",
            "Middle of the road product.",
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
            "I hate this product. It's garbage.",
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
            "This product is good but has some issues.",
            "Works well but could use some improvements.",
            "Nice product but shipping was slow.",
            "Good value but quality could be better.",
            "Decent product, some minor problems.",
            "It's alright, nothing too exciting.",
            "Pretty good overall, minor issues.",
            "Satisfied but not thrilled.",
            "Good but not perfect.",
            "Meets expectations, nothing more.",
        ]
        labels = (
            ["positive"] * 25 +
            ["neutral"] * 15 +
            ["negative"] * 15
        )
        return reviews, labels

    def _load_or_train(self):
        if MODEL_PATH.exists() and VECTORIZER_PATH.exists():
            try:
                with open(MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
                with open(VECTORIZER_PATH, 'rb') as f:
                    self.vectorizer = pickle.load(f)
                self.is_trained = True
                return
            except Exception:
                pass
        self.train()

    def train(self):
        reviews, labels = self._get_training_data()
        processed = [preprocess_text(r) for r in reviews]
        X = self.vectorizer.fit_transform(processed)
        X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=0.2, random_state=42)
        self.model.fit(X_train, y_train)
        predictions = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, predictions)
        self.is_trained = True
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(self.model, f)
        with open(VECTORIZER_PATH, 'wb') as f:
            pickle.dump(self.vectorizer, f)
        return accuracy

    def predict(self, text: str) -> dict:
        if not self.is_trained:
            self.train()
        processed = preprocess_text(text)
        X = self.vectorizer.transform([processed])
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        classes = self.model.classes_
        confidence = float(max(probabilities)) * 100
        prob_dict = {cls: float(prob) * 100 for cls, prob in zip(classes, probabilities)}
        return {
            "sentiment": prediction,
            "confidence": round(confidence, 2),
            "probabilities": prob_dict
        }

analyzer = SentimentAnalyzer()
