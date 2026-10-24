import pickle
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LinearRegression
from app.utils.preprocessor import preprocess_text

MODEL_PATH = Path(__file__).parent / "saved" / "rating_model.pkl"
VECTORIZER_PATH = Path(__file__).parent / "saved" / "rating_vectorizer.pkl"

class RatingPredictor:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1, 2))
        self.model = LinearRegression()
        self.is_trained = False
        self._load_or_train()

    def _get_training_data(self):
        reviews = [
            ("This product is amazing! Best purchase ever!", 5.0),
            ("Love it! Highly recommend to everyone.", 5.0),
            ("Excellent quality and fast shipping.", 5.0),
            ("Perfect! Exceeded my expectations.", 5.0),
            ("Great value for money. Very satisfied.", 4.5),
            ("Works perfectly. Very happy.", 5.0),
            ("Outstanding product! Will buy again.", 5.0),
            ("Fantastic quality, arrived quickly.", 4.5),
            ("Exactly what I needed. Perfect!", 5.0),
            ("Wonderful product, great service.", 5.0),
            ("Absolutely love this! Five stars!", 5.0),
            ("Superb quality and design.", 4.5),
            ("Best in this price range.", 4.5),
            ("Very impressed with quality.", 4.0),
            ("Highly recommended!", 4.5),
            ("The product is okay, nothing special.", 3.0),
            ("Average quality, does the job.", 3.0),
            ("It's fine, not great but not bad.", 3.0),
            ("Decent product for the price.", 3.5),
            ("Mediocre at best.", 2.5),
            ("Not bad, but could be better.", 3.0),
            ("It works, but nothing special.", 3.0),
            ("Fair product, meets basic needs.", 3.0),
            ("Satisfactory, room for improvement.", 3.0),
            ("Middle of the road product.", 3.0),
            ("This is terrible! Worst purchase.", 1.0),
            ("Very disappointed with quality.", 1.5),
            ("Broken on arrival. Waste of money.", 1.0),
            ("Do not buy! Total scam.", 1.0),
            ("Horrible product, terrible service.", 1.0),
            ("Worst experience ever.", 1.0),
            ("Stopped working after one day.", 1.5),
            ("Cheaply made, falls apart.", 1.0),
            ("Extremely dissatisfied.", 1.0),
            ("Awful quality. Never again.", 1.0),
            ("I hate this product.", 1.0),
            ("Poor quality materials.", 1.5),
            ("Complete junk.", 1.0),
            ("Disgusting product.", 1.0),
            ("Frustrated with this purchase.", 1.5),
            ("Damaged and unusable.", 1.0),
            ("Terrible from start to finish.", 1.0),
            ("Worst product ever.", 1.0),
            ("Absolutely awful.", 1.0),
            ("Cheap and poorly made.", 1.5),
            ("I regret buying this.", 1.5),
            ("Good product but has issues.", 3.5),
            ("Works well but needs improvements.", 3.5),
            ("Nice product but shipping slow.", 3.5),
            ("Good value but quality could improve.", 3.5),
            ("Decent with minor problems.", 3.0),
        ]
        texts, ratings = zip(*reviews)
        return list(texts), list(ratings)

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
        texts, ratings = self._get_training_data()
        processed = [preprocess_text(t) for t in texts]
        X = self.vectorizer.fit_transform(processed)
        y = np.array(ratings)
        self.model.fit(X, y)
        self.is_trained = True
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(self.model, f)
        with open(VECTORIZER_PATH, 'wb') as f:
            pickle.dump(self.vectorizer, f)

    def predict(self, text: str) -> dict:
        if not self.is_trained:
            self.train()
        processed = preprocess_text(text)
        X = self.vectorizer.transform([processed])
        rating = float(self.model.predict(X)[0])
        rating = max(1.0, min(5.0, rating))
        stars = int(round(rating))

        tier_map = {
            5: "Outstanding",
            4: "Good / Recommended",
            3: "Average / Acceptable",
            2: "Below Expectations",
            1: "Unacceptable"
        }

        if rating >= 4.5:
            satisfaction = "Delighted"
        elif rating >= 3.8:
            satisfaction = "Satisfied"
        elif rating >= 2.8:
            satisfaction = "Neutral / Mixed"
        elif rating >= 1.8:
            satisfaction = "Unsatisfied"
        else:
            satisfaction = "Extremely Frustrated"

        return {
            "rating": round(rating, 2),
            "stars": stars,
            "star_display": "★" * stars + "☆" * (5 - stars),
            "tier": tier_map.get(stars, "Moderate"),
            "satisfaction": satisfaction
        }

predictor = RatingPredictor()
