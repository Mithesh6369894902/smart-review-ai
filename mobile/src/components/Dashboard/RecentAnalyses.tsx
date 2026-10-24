import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { AnalysisResult } from '../../types';
import { confOf, fmtDate, sentColor, sentOf, starsOf, ratingNum } from '../../utils/safe';

interface RecentAnalysesProps {
  analyses: AnalysisResult[];
  onPress?: (a: AnalysisResult) => void;
}

export const RecentAnalyses: React.FC<RecentAnalysesProps> = ({ analyses, onPress }) => {
  if (analyses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>No analyses yet</Text>
        <Text style={styles.emptySubtext}>Start by analyzing your first review</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {analyses.map((analysis, i) => (
        <TouchableOpacity key={String(analysis.id ?? i)} style={styles.card} onPress={() => onPress?.(analysis)} activeOpacity={0.7}>
          <View style={styles.header}>
            <View style={[
              styles.sentimentBadge,
              { backgroundColor: sentColor(sentOf(analysis)) + '20' }
            ]}>
              <Text style={[
                styles.sentimentText,
                { color: sentColor(sentOf(analysis)) }
              ]}>
                {sentOf(analysis).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.confidence}>{confOf(analysis).toFixed(0)}%</Text>
          </View>
          <Text style={styles.review} numberOfLines={2}>
            {analysis.text}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.rating}>{starsOf(analysis)} {ratingNum(analysis).toFixed(1)}</Text>
            <Text style={styles.time}>
              {fmtDate(analysis)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sentimentBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidence: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  review: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: theme.colors.neutral,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
