import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { Stats } from '../../types';

interface ChartsProps {
  stats: Stats | null;
}

export const Charts: React.FC<ChartsProps> = ({ stats }) => {
  const total = stats?.total_reviews || 1;
  const positivePercent = ((stats?.sentiment_distribution?.positive || 0) / total) * 100;
  const neutralPercent = ((stats?.sentiment_distribution?.neutral || 0) / total) * 100;
  const negativePercent = ((stats?.sentiment_distribution?.negative || 0) / total) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sentiment Distribution</Text>

      <View style={styles.barContainer}>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Positive</Text>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${positivePercent}%`, backgroundColor: theme.colors.positive }]} />
          </View>
          <Text style={[styles.barPercent, { color: theme.colors.positive }]}>
            {positivePercent.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Neutral</Text>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${neutralPercent}%`, backgroundColor: theme.colors.neutral }]} />
          </View>
          <Text style={[styles.barPercent, { color: theme.colors.neutral }]}>
            {neutralPercent.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Negative</Text>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${negativePercent}%`, backgroundColor: theme.colors.negative }]} />
          </View>
          <Text style={[styles.barPercent, { color: theme.colors.negative }]}>
            {negativePercent.toFixed(0)}%
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.average_rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
          <Text style={styles.statStars}>⭐</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.average_confidence?.toFixed(0) || '0'}%</Text>
          <Text style={styles.statLabel}>Confidence</Text>
          <Text style={styles.statStars}>🎯</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {
            color: stats?.recent_trend === 'positive' ? theme.colors.positive :
                   stats?.recent_trend === 'negative' ? theme.colors.negative :
                   theme.colors.neutral
          }]}>
            {stats?.recent_trend?.charAt(0).toUpperCase() + (stats?.recent_trend?.slice(1) || '') || 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Trend</Text>
          <Text style={styles.statStars}>📈</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    ...theme.shadows.medium,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  barContainer: {
    marginBottom: theme.spacing.lg,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  barLabel: {
    width: 70,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  barBackground: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 4,
  },
  barPercent: {
    width: 45,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statStars: {
    fontSize: 16,
    marginTop: 4,
  },
});
