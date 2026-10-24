export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  probabilities: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface EmotionResult {
  primary_emotion: string;
  emotions: {
    [key: string]: number;
  };
  has_negation: boolean;
}

export interface SummaryResult {
  summary: string;
  original_length: number;
  summary_length: number;
  compression_ratio: number;
  key_sentences: string[];
}

export interface RatingResult {
  rating: number;
  stars: number;
  star_display: string;
}

export interface SuggestionResult {
  suggestions: string[];
  topics_detected: string[];
  keywords: string[];
  sentiment: string;
}

export interface OverallScore {
  score: number;
  grade: string;
  breakdown: {
    sentiment: number;
    rating: number;
    emotion: number;
    confidence_bonus?: number;
  };
}

export interface AnalysisMetadata {
  model_version: string;
  features_used: string[];
  processing_time_ms: number;
}

export interface AnalysisResult {
  id: number;
  text: string;
  product_name?: string;
  sentiment: SentimentResult;
  emotion: EmotionResult;
  summary: SummaryResult;
  rating: RatingResult;
  suggestions: SuggestionResult;
  overall_score: OverallScore;
  timestamp: string;
  created_at?: string;
  from_cache?: boolean;
  analysis_metadata?: AnalysisMetadata;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  average_rating: number;
}

export interface Stats {
  total_reviews: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  average_rating: number;
  average_confidence: number;
  recent_trend: string;
}

export type RootTabParamList = {
  Dashboard: undefined;
  Analysis: undefined;
  History: undefined;
  Profile: undefined;
};

export type DashboardStackParamList = {
  DashboardMain: undefined;
  ResultDetail: { result: AnalysisResult };
};

export type AnalysisStackParamList = {
  AnalysisMain: undefined;
  BatchAnalysis: undefined;
  ResultDetail: { result: AnalysisResult };
};

export type HistoryStackParamList = {
  HistoryMain: undefined;
  ResultDetail: { result: AnalysisResult };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
};
