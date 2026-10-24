import re
from collections import defaultdict

EMOTION_LEXICON = {
    "happy": {
        "words": ["happy", "joy", "love", "great", "amazing", "wonderful", "fantastic", "excellent",
                  "awesome", "perfect", "beautiful", "delighted", "pleased", "glad", "cheerful",
                  "thrilled", "excited", "blessed", "grateful", "satisfied", "impressed",
                  "outstanding", "brilliant", "superb", "magnificent", "stellar"],
        "intensifiers": ["very", "extremely", "incredibly", "absolutely", "totally", "really"],
        "emoji": ["😊", "😍", "🥰", "😄", "😁", "🎉", "❤️", "👍", "✨", "💯"]
    },
    "sad": {
        "words": ["sad", "unhappy", "disappointed", "depressed", "miserable", "heartbroken",
                  "upset", "gloomy", "down", "melancholy", "sorrowful", "grief", "regret",
                  "miss", "lost", "alone", "lonely", "hurt", "pain", "suffering"],
        "intensifiers": ["very", "extremely", "so", "really", "deeply"],
        "emoji": ["😢", "😭", "💔", "😔", "🥺", "😞"]
    },
    "angry": {
        "words": ["angry", "furious", "rage", "hate", "disgusted", "outraged", "frustrated",
                  "annoyed", "irritated", "mad", "hostile", "bitter", "livid", "infuriated",
                  "enraged", "appalled", "offended", "insulted", "betrayed", "cheated"],
        "intensifiers": ["so", "extremely", "incredibly", "absolutely", "totally", "really"],
        "emoji": ["😠", "😡", "🤬", "💢", "😤", "👿"]
    },
    "surprised": {
        "words": ["surprised", "shocked", "amazed", "astonished", "stunned", "unexpected",
                  "unbelievable", "incredible", "wow", "whoa", "unreal", "remarkable",
                  "extraordinary", "mind-blowing", "breathtaking", "speechless"],
        "intensifiers": ["absolutely", "completely", "totally", "utterly", "really"],
        "emoji": ["😲", "😮", "🤯", "😱", "⁉️", "❗"]
    },
    "fearful": {
        "words": ["afraid", "scared", "terrified", "worried", "anxious", "nervous", "panic",
                  "dread", "frightened", "alarmed", "concerned", "uneasy", "tense", "stressed",
                  "paranoid", "threatened", "vulnerable", "helpless"],
        "intensifiers": ["very", "extremely", "so", "really", "absolutely"],
        "emoji": ["😨", "😰", "😱", "🫣", "😟"]
    },
    "disgusted": {
        "words": ["disgusting", "gross", "revolting", "vile", "nasty", "horrible", "awful",
                  "terrible", "repulsive", "sickening", "nauseating", "repugnant", "foul",
                  "putrid", "abhorrent", "loathsome", "despicable", "junk", "garbage", "waste", "scam"],
        "intensifiers": ["absolutely", "completely", "utterly", "totally", "really"],
        "emoji": ["🤢", "🤮", "😬", "👎", "💔"]
    },
    "neutral": {
        "words": ["okay", "ok", "fine", "average", "normal", "standard", "basic", "regular",
                  "plain", "expected", "moderate", "passable", "typical", "decent", "ordinary", "unremarkable"],
        "intensifiers": ["quite", "fairly", "pretty", "relatively", "somewhat"],
        "emoji": ["😐", "😶", "🤷"]
    }
}

EMOTION_DESCRIPTIONS = {
    "happy": "Customer expresses delight, satisfaction, and positive enthusiasm.",
    "sad": "Customer expresses disappointment, regret, or discontent.",
    "angry": "Customer expresses frustration, anger, or strong annoyance.",
    "surprised": "Customer expresses astonishment or unexpected delight.",
    "fearful": "Customer expresses worry, anxiety, or hesitation.",
    "disgusted": "Customer expresses strong disapproval, revulsion, or feeling cheated.",
    "neutral": "Customer expresses objective, matter-of-fact, or balanced feedback."
}

class EmotionDetector:
    def __init__(self):
        self.lexicon = EMOTION_LEXICON

    def detect(self, text: str) -> dict:
        text_lower = text.lower()
        words = re.findall(r"[a-z']+", text_lower)
        word_set = set(words)
        emotion_scores = defaultdict(float)

        for emotion, data in self.lexicon.items():
            for word in data["words"]:
                if word in word_set:
                    base_score = len(word) / 10
                    for intensifier in data["intensifiers"]:
                        if intensifier + " " + word in text_lower:
                            base_score *= 1.5
                            break
                    emotion_scores[emotion] += base_score

            for emoji_char in data["emoji"]:
                if emoji_char in text:
                    emotion_scores[emotion] += 0.3

        negations = ["not", "no", "never", "neither", "cannot", "can't", "don't", "doesn't", "didn't", "won't",
                     "wouldn't", "shouldn't", "couldn't", "isn't", "aren't", "wasn't"]

        has_negation = any(neg in words for neg in negations)

        if not emotion_scores:
            if has_negation:
                # Review has negation but no specific emotion words
                emotion_scores["sad"] = 0.4
                emotion_scores["neutral"] = 0.6
            else:
                emotion_scores["neutral"] = 1.0

        total = sum(emotion_scores.values()) or 1
        emotions = {}
        for emotion, score in sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True):
            emotions[emotion] = round((score / total) * 100, 2)

        primary_emotion = max(emotion_scores, key=emotion_scores.get) if emotion_scores else "neutral"

        return {
            "primary_emotion": primary_emotion,
            "emotions": emotions,
            "has_negation": has_negation,
            "description": EMOTION_DESCRIPTIONS.get(primary_emotion, "Balanced customer feedback.")
        }

detector = EmotionDetector()
