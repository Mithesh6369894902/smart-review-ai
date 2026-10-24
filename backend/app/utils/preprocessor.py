import re

# Stop words without negation words (negations are critical for sentiment!)
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
    'only', 'own', 'same', 'so', 'than', 'too', 'very',
    's', 't', 'can', 'will', 'just', 'should', "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y'
}

NEGATION_MAP = {
    "don't": "not", "dont": "not", "didn't": "not", "didnt": "not",
    "doesn't": "not", "doesnt": "not", "wasn't": "not", "wasnt": "not",
    "weren't": "not", "werent": "not", "can't": "cannot", "cant": "cannot",
    "won't": "not", "wont": "not", "isn't": "not", "isnt": "not",
    "aren't": "not", "arent": "not", "couldn't": "not", "couldnt": "not",
    "shouldn't": "not", "shouldnt": "not", "wouldn't": "not", "wouldnt": "not"
}

def preprocess_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'http\S+|www\S+', '', text)
    for word, replacement in NEGATION_MAP.items():
        text = re.sub(r'\b' + re.escape(word) + r'\b', replacement, text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = text.split()
    tokens = [w for w in tokens if w not in STOP_WORDS and len(w) > 1]
    return ' '.join(tokens)

def extract_keywords(text: str, top_n: int = 8) -> list:
    processed = preprocess_text(text)
    words = processed.split()
    # Filter out pure negation markers and short tokens from keywords
    non_kw = {'not', 'no', 'never', 'cannot', 'neither'}
    freq = {}
    for word in words:
        if word not in non_kw and len(word) > 2:
            freq[word] = freq.get(word, 0) + 1
    sorted_words = sorted(freq.items(), key=lambda x: (x[1], len(x[0])), reverse=True)
    return [w[0] for w in sorted_words[:top_n]]
