import csv
import json
import io
from typing import List, Dict
from datetime import datetime

class DataExporter:
    def to_csv(self, analyses: List[Dict]) -> str:
        output = io.StringIO()
        if not analyses:
            return ""

        fieldnames = [
            "id", "text", "product_name", "sentiment", "confidence",
            "rating", "stars", "emotion", "grade", "created_at"
        ]

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for analysis in analyses:
            writer.writerow({
                "id": analysis.get("id"),
                "text": analysis.get("text", "")[:200],
                "product_name": analysis.get("product_name", ""),
                "sentiment": analysis.get("sentiment", {}).get("sentiment"),
                "confidence": analysis.get("sentiment", {}).get("confidence"),
                "rating": analysis.get("rating", {}).get("rating"),
                "stars": analysis.get("rating", {}).get("stars"),
                "emotion": analysis.get("emotion", {}).get("primary_emotion"),
                "grade": analysis.get("overall_score", {}).get("grade"),
                "created_at": analysis.get("created_at")
            })

        return output.getvalue()

    def to_json(self, analyses: List[Dict]) -> str:
        export_data = {
            "export_date": datetime.utcnow().isoformat(),
            "total_analyses": len(analyses),
            "analyses": analyses
        }
        return json.dumps(export_data, indent=2)

    def to_summary_report(self, analyses: List[Dict], stats: Dict) -> str:
        report = []
        report.append("=" * 60)
        report.append("SMARTREVIEW AI - ANALYSIS REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        report.append("")

        report.append("SUMMARY STATISTICS")
        report.append("-" * 40)
        report.append(f"Total Reviews Analyzed: {stats.get('total_reviews', 0)}")
        report.append(f"Average Rating: {stats.get('average_rating', 0):.2f}/5.0")
        report.append(f"Average Confidence: {stats.get('average_confidence', 0):.2f}%")
        report.append("")

        report.append("SENTIMENT DISTRIBUTION")
        report.append("-" * 40)
        dist = stats.get("sentiment_distribution", {})
        total = stats.get("total_reviews", 1)
        for sentiment, count in dist.items():
            pct = (count / total) * 100 if total > 0 else 0
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            report.append(f"{sentiment.capitalize():10} {bar} {count:4d} ({pct:.1f}%)")
        report.append("")

        report.append("DETAILED ANALYSES")
        report.append("-" * 40)
        for i, analysis in enumerate(analyses[:50], 1):
            report.append(f"\n{i}. [{analysis.get('sentiment', {}).get('sentiment', 'N/A').upper()}]")
            report.append(f"   Text: {analysis.get('text', '')[:100]}...")
            report.append(f"   Rating: {analysis.get('rating', {}).get('rating', 0):.1f}/5.0")
            report.append(f"   Confidence: {analysis.get('sentiment', {}).get('confidence', 0):.1f}%")
            report.append(f"   Emotion: {analysis.get('emotion', {}).get('primary_emotion', 'N/A')}")
            report.append(f"   Grade: {analysis.get('overall_score', {}).get('grade', 'N/A')}")

            suggestions = analysis.get("suggestions", {}).get("suggestions", [])
            if suggestions:
                report.append("   Suggestions:")
                for s in suggestions[:2]:
                    report.append(f"     - {s}")

        report.append("")
        report.append("=" * 60)
        report.append("END OF REPORT")
        report.append("=" * 60)

        return "\n".join(report)

exporter = DataExporter()
