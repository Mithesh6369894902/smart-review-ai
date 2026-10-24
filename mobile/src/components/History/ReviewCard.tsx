import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { AnalysisResult } from '../../types';
import { confOf, EMOTION_META, fmtDate, gradeOf, sentColor, sentOf, starsOf, ratingNum } from '../../utils/safe';

interface ReviewCardProps {
  analysis: AnalysisResult;
  onPress: () => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ analysis, onPress }) => {
  const color = sentColor(sentOf(analysis));
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.sentimentContainer}>
          <View style={[styles.sentimentDot, { backgroundColor: color }]} />
          <Text style={[styles.sentimentText, { color }]}>
            {sentOf(analysis).charAt(0).toUpperCase() + sentOf(analysis).slice(1)}
          </Text>
          {analysis.product_name ? <Text style={styles.productMini}>{analysis.product_name}</Text> : null}
        </View>
        <Text style={styles.date}>{fmtDate(analysis)}</Text>
      </View>

      <Text style={styles.reviewText} numberOfLines={2}>
        {analysis.text}
      </Text>

      <View style={styles.footer}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{starsOf(analysis)} {ratingNum(analysis).toFixed(1)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Confidence</Text>
            <Text style={styles.statValue}>{confOf(analysis).toFixed(0)}%</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{gradeOf(analysis)}</Text>
          </View>
        </View>
        <View style={styles.emotionBadge}>
          <Text style={styles.emotionEmoji}>
            {EMOTION_META[analysis.emotion?.primary_emotion]?.emoji || '😐'}
          </Text>
          <Text style={styles.emotionText}>{analysis.emotion?.primary_emotion || 'neutral'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sentimentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  productName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  productMini: {
    backgroundColor: theme.colors.accent + '20',
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 6,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  emotionEmoji: {
    fontSize: 14,
  },
  emotionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
});
