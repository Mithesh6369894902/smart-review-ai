import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from app.utils.preprocessor import preprocess_text

class ReviewSummarizer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000)

    def summarize(self, text: str, num_sentences: int = 3) -> dict:
        import re
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        if len(sentences) <= num_sentences:
            return {
                "summary": text,
                "original_length": len(text),
                "summary_length": len(text),
                "compression_ratio": 100.0,
                "key_sentences": sentences
            }

        processed = [preprocess_text(s) for s in sentences]
        try:
            tfidf_matrix = self.vectorizer.fit_transform(processed)
            sentence_scores = np.array(tfidf_matrix.sum(axis=1)).flatten()
        except Exception:
            sentence_scores = np.ones(len(sentences))

        position_bonus = np.linspace(1.0, 0.5, len(sentences))
        combined_scores = sentence_scores * position_bonus

        top_indices = np.argsort(combined_scores)[-num_sentences:][::-1]
        top_indices = sorted(top_indices)

        key_sentences = [sentences[i] for i in top_indices]
        summary = '. '.join(key_sentences) + '.'

        return {
            "summary": summary,
            "original_length": len(text),
            "summary_length": len(summary),
            "compression_ratio": round((len(summary) / len(text)) * 100, 2),
            "key_sentences": key_sentences
        }

summarizer = ReviewSummarizer()
