from app.utils.preprocessor import preprocess_text, extract_keywords
import re

TOPIC_SUGGESTIONS = {
    "quality": {
        "negative": [
            "Use higher-grade industrial materials for enhanced durability",
            "Implement stricter automated QA checks before packaging",
            "Provide extended warranty coverage to restore customer trust"
        ],
        "neutral": [
            "Refine component tolerances and improve surface finish",
            "Provide clear material specification disclosures in product details"
        ],
        "positive": [
            "Highlight premium build quality and craftsmanship in marketing",
            "Maintain rigorous supplier quality standards"
        ]
    },
    "price": {
        "negative": [
            "Re-evaluate pricing strategy against direct market competitors",
            "Introduce value bundles or promotional introductory discounts",
            "Enhance perceived value through premium unboxing and accessories"
        ],
        "neutral": [
            "Highlight cost-per-use value and long-term savings in product copy",
            "Consider offering tiered package options at varying price points"
        ],
        "positive": [
            "Leverage strong price-to-performance ratio in ad campaigns",
            "Explore premium edition variations for power users"
        ]
    },
    "shipping": {
        "negative": [
            "Partner with premium expedited courier services",
            "Upgrade protective internal packaging to prevent transit damage",
            "Implement real-time SMS/WhatsApp delivery tracking updates"
        ],
        "neutral": [
            "Provide transparent estimated delivery timeframes at checkout",
            "Offer optional express delivery upgrades"
        ],
        "positive": [
            "Maintain current high-efficiency fulfillment network",
            "Promote same-day or next-day dispatch reliability"
        ]
    },
    "service": {
        "negative": [
            "Streamline customer support escalations with 24/7 live assistance",
            "Institute a zero-hassle instant return or replacement policy",
            "Conduct agent empathy training and reduce resolution turnaround time"
        ],
        "neutral": [
            "Proactively check in with customers post-delivery to assist with setup",
            "Expand searchable self-service help center and video guides"
        ],
        "positive": [
            "Feature glowing customer support testimonials prominently",
            "Reward frontline support representatives for outstanding service"
        ]
    },
    "design": {
        "negative": [
            "Conduct ergonomic user research to address discomfort pain points",
            "A/B test revised dimensions, button layouts, and tactile finishes",
            "Offer more aesthetic colorway options"
        ],
        "neutral": [
            "Provide dimensional guides and fit comparisons on the product page",
            "Gather user feedback on weight balance and daily carry comfort"
        ],
        "positive": [
            "Showcase award-worthy design and sleek aesthetics in hero imagery",
            "Consider complementary lifestyle accessory lines"
        ]
    },
    "battery": {
        "negative": [
            "Optimize power management firmware to reduce standby battery drain",
            "Include a higher wattage fast-charger in the standard package",
            "Upgrade battery cell capacity and cycle longevity ratings"
        ],
        "neutral": [
            "Publish realistic battery endurance benchmarks under mixed usage",
            "Include battery optimization tips in the user manual"
        ],
        "positive": [
            "Advertise all-day battery life and rapid charging capabilities",
            "Highlight efficient power performance in marketing"
        ]
    },
    "performance": {
        "negative": [
            "Release a firmware/software patch addressing lag and latency",
            "Optimize thermal dissipation to prevent performance throttling",
            "Improve connectivity stability and reduce connection drops"
        ],
        "neutral": [
            "Ensure system requirements and recommended use cases are clear",
            "Provide quick performance calibration tools"
        ],
        "positive": [
            "Promote high-speed responsive performance in promotional specs",
            "Target power users seeking top-tier productivity"
        ]
    },
    "features": {
        "negative": [
            "Prioritize top requested customer features in the upcoming release",
            "Revamp user manual and onboarding tutorial for complex functions",
            "Refine controls to make everyday operation intuitive"
        ],
        "neutral": [
            "Create interactive interactive feature walkthroughs and demo clips",
            "Survey users on which supplementary features they desire most"
        ],
        "positive": [
            "Highlight versatile, rich feature suite in comparison charts",
            "Build user community around advanced feature tips & tricks"
        ]
    }
}

DEFAULT_SUGGESTIONS = {
    "negative": [
        "Conduct targeted customer satisfaction outreach to resolve dissatisfaction",
        "Implement rapid feedback loop with product engineering",
        "Offer straightforward replacement or refund options to retain loyalty"
    ],
    "neutral": [
        "Collect deeper customer feedback on expectations vs actual experience",
        "Provide detailed product guides and FAQs to elevate user experience",
        "Monitor recurring feedback trends to prioritize next enhancements"
    ],
    "positive": [
        "Encourage satisfied brand advocates to leave verified reviews",
        "Implement customer referral and loyalty reward incentives",
        "Maintain current high standards across product and fulfillment"
    ]
}

class SuggestionGenerator:
    def __init__(self):
        self.topic_suggestions = TOPIC_SUGGESTIONS
        self.default_suggestions = DEFAULT_SUGGESTIONS

    def generate(self, text: str, sentiment: str) -> dict:
        text_lower = text.lower()
        keywords = extract_keywords(text, top_n=8)
        words = set(re.findall(r"[a-z']+", text_lower))

        topics_found = []

        # Multi-word phrase & keyword matching with disambiguation
        # E.g. "fast charging" -> battery/performance, NOT shipping
        if any(w in words for w in ["battery", "charger", "charging", "drain", "standby", "recharge", "watt", "mah"]):
            topics_found.append("battery")

        if any(w in words for w in ["shipping", "delivery", "arrived", "courier", "transit", "package", "packaging", "dispatch"]):
            topics_found.append("shipping")
        elif "fast" in words and any(w in words for w in ["ship", "delivered", "arrival", "box"]):
            topics_found.append("shipping")

        if any(w in words for w in ["quality", "material", "build", "durable", "sturdy", "flimsy", "broken", "cheap", "craftsmanship", "defect"]):
            topics_found.append("quality")

        if any(w in words for w in ["price", "cost", "expensive", "value", "money", "worth", "affordable", "overpriced", "bargain"]):
            topics_found.append("price")

        if any(w in words for w in ["service", "support", "customer", "agent", "refund", "return", "warranty", "help", "staff"]):
            topics_found.append("service")

        if any(w in words for w in ["design", "look", "style", "appearance", "color", "size", "beautiful", "ugly", "ergonomic", "sleek"]):
            topics_found.append("design")

        if any(w in words for w in ["lag", "slow", "fast", "speed", "smooth", "crash", "freeze", "performance", "responsive", "latency"]):
            if "shipping" not in topics_found or "battery" in topics_found or any(w in words for w in ["lag", "slow", "speed", "performance"]):
                topics_found.append("performance")

        if any(w in words for w in ["feature", "function", "works", "use", "interface", "app", "bluetooth", "sound", "screen", "display", "wifi"]):
            topics_found.append("features")

        # Deduplicate preserving order
        unique_topics = []
        for t in topics_found:
            if t not in unique_topics:
                unique_topics.append(t)

        suggestions = []
        sentiment_key = sentiment if sentiment in ["positive", "negative", "neutral"] else "neutral"

        for topic in unique_topics:
            if topic in self.topic_suggestions:
                topic_data = self.topic_suggestions[topic]
                if sentiment_key in topic_data:
                    suggestions.extend(topic_data[sentiment_key][:2])

        if not suggestions:
            suggestions = self.default_suggestions.get(sentiment_key, self.default_suggestions["neutral"])[:3]

        # Determine priority / urgency
        if sentiment == "negative":
            priority = "Critical" if any(t in ["quality", "service"] for t in unique_topics) else "High"
        elif sentiment == "neutral":
            priority = "Medium"
        else:
            priority = "Low"

        return {
            "suggestions": suggestions[:5],
            "topics_detected": unique_topics,
            "keywords": keywords,
            "sentiment": sentiment,
            "priority": priority
        }

generator = SuggestionGenerator()
