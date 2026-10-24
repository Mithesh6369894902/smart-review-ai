import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../../theme';
import { AnalysisResult } from '../../types';
import { confOf, ratingNum, sentColor, sentOf, starsOf } from '../../utils/safe';
import { EmotionBreakdown } from './EmotionBreakdown';

interface ResultsViewProps {
  result: AnalysisResult;
  onNew?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onNew }) => {
  const s: any = result.sentiment || {};
  const e: any = result.emotion || {};
  const summ: any = result.summary || { summary: result.text };
  const sugg: any = result.suggestions || { suggestions: [], topics_detected: [] };
  const sc: any = result.overall_score || {};
  const color = sentColor(sentOf(result));
  const probs = s.probabilities || {};
  const breakdown = sc.breakdown || {};

  const copy = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch {
      Alert.alert('Error', 'Copy failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Analysis Results</Text>
        <View style={[styles.overallScore, { backgroundColor: color + '20' }]}>
          <Text style={[styles.grade, { color }]}>
            {sc.grade || '—'}
          </Text>
          <Text style={[styles.score, { color }]}>
            {Number(sc.score || 0).toFixed(0)}
          </Text>
        </View>
      </View>

      {result.product_name ? (
        <Text style={styles.productChip}>📦 {result.product_name}</Text>
      ) : null}
      <Text style={styles.quote}>“{result.text}”</Text>

      <View style={styles.sentimentCard}>
        <View style={styles.sentimentHeader}>
          <Text style={styles.sentimentLabel}>Sentiment</Text>
          <View style={[styles.sentimentBadge, { backgroundColor: color }]}>
            <Text style={styles.sentimentValue}>{sentOf(result).toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence</Text>
          <View style={styles.confidenceBar}>
            <View style={[styles.confidenceFill, {
              width: `${confOf(result)}%`,
              backgroundColor: color
            }]} />
          </View>
          <Text style={styles.confidenceValue}>{confOf(result).toFixed(1)}%</Text>
        </View>
        {Object.keys(probs).length > 0 && (
          <View style={styles.probabilities}>
            {Object.entries(probs).map(([key, value]: [string, any]) => (
              <View key={key} style={styles.probItem}>
                <Text style={styles.probLabel}>{key}</Text>
                <Text style={[styles.probValue, { color: sentColor(key) }]}>
                  {Number(value).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.ratingCard}>
        <Text style={styles.cardTitle}>Star Rating</Text>
        <View style={styles.ratingDisplay}>
          <Text style={styles.stars}>{starsOf(result)}</Text>
          <Text style={styles.ratingValue}>{ratingNum(result).toFixed(1)} / 5.0</Text>
        </View>
      </View>

      <EmotionBreakdown emotions={e.emotions || {}} primary={e.primary_emotion || 'neutral'} />

      <View style={styles.summaryCard}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>Review Summary</Text>
          <TouchableOpacity style={styles.miniBtn} onPress={() => copy(summ.summary || result.text, 'Summary')}>
            <Text style={styles.miniBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>{summ.summary || result.text}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{summ.original_length ?? result.text.length}</Text>
            <Text style={styles.summaryStatLabel}>Original</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{summ.summary_length ?? (summ.summary || '').length}</Text>
            <Text style={styles.summaryStatLabel}>Summary</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{summ.compression_ratio ?? 100}%</Text>
            <Text style={styles.summaryStatLabel}>Compressed</Text>
          </View>
        </View>
      </View>

      <View style={styles.suggestionsCard}>
        <Text style={styles.cardTitle}>💡 Improvement Suggestions</Text>
        {(sugg.suggestions || []).length === 0 && (
          <Text style={styles.mutedText}>No suggestions for this review.</Text>
        )}
        {(sugg.suggestions || []).map((suggestion: string, index: number) => (
          <View key={index} style={styles.suggestionItem}>
            <Text style={styles.suggestionBullet}>•</Text>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
        {(sugg.topics_detected || []).length > 0 && (
          <View style={styles.topicsContainer}>
            <Text style={styles.topicsLabel}>Topics Detected:</Text>
            <View style={styles.topicsList}>
              {(sugg.topics_detected || []).map((topic: string, index: number) => (
                <View key={index} style={styles.topicBadge}>
                  <Text style={styles.topicText}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {(sugg.keywords || []).length > 0 && (
          <View style={styles.topicsContainer}>
            <Text style={styles.topicsLabel}>Keywords:</Text>
            <View style={styles.topicsList}>
              {(sugg.keywords || []).slice(0, 6).map((kw: string, index: number) => (
                <View key={index} style={[styles.topicBadge, styles.topicBadgeAlt]}>
                  <Text style={[styles.topicText, styles.topicTextAlt]}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {Object.keys(breakdown).length > 0 && (
        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Score Breakdown</Text>
          {Object.entries(breakdown).map(([key, value]: [string, any]) => (
            <View key={key} style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
              <View style={styles.breakdownBar}>
                <View style={[styles.breakdownFill, { width: `${Number(value) || 0}%`, backgroundColor: sentColor(key) }]} />
              </View>
              <Text style={styles.breakdownValue}>{Number(value).toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}

      {result.analysis_metadata ? (
        <Text style={styles.metaText}>
          Model v{result.analysis_metadata.model_version} · {result.analysis_metadata.processing_time_ms} ms
        </Text>
      ) : null}

      {onNew ? (
        <TouchableOpacity style={styles.newButton} onPress={onNew}>
          <Text style={styles.newButtonText}>🔄 Analyze Another Review</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  overallScore: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  grade: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 12,
    fontWeight: '600',
  },
  sentimentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  sentimentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sentimentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sentimentBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  sentimentValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  confidenceContainer: {
    marginBottom: theme.spacing.md,
  },
  confidenceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
  },
  probabilities: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  probItem: {
    alignItems: 'center',
  },
  probLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  probValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  ratingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  stars: {
    fontSize: 32,
    color: theme.colors.neutral,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  suggestionsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  suggestionBullet: {
    fontSize: 16,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  topicsContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  topicsLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  topicBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  topicBadgeAlt: {
    backgroundColor: theme.colors.accent + '20',
  },
  topicText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  topicTextAlt: {
    color: theme.colors.accent,
  },
  breakdownCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  breakdownLabel: {
    width: 80,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.sm,
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownValue: {
    width: 45,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  miniBtn: {
    backgroundColor: theme.colors.primary + '25',
    borderWidth: 1,
    borderColor: theme.colors.primary + '50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  miniBtnText: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  productChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent + '20',
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  quote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '12',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  mutedText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  metaText: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  newButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  newButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
