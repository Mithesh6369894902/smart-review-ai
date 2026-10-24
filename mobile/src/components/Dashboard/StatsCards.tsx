import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { Stats } from '../../types';

interface StatsCardsProps {
  stats: Stats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Reviews',
      value: stats?.total_reviews || 0,
      icon: '📝',
      color: theme.colors.primary,
    },
    {
      title: 'Positive',
      value: stats?.sentiment_distribution?.positive || 0,
      icon: '😊',
      color: theme.colors.positive,
    },
    {
      title: 'Neutral',
      value: stats?.sentiment_distribution?.neutral || 0,
      icon: '😐',
      color: theme.colors.neutral,
    },
    {
      title: 'Negative',
      value: stats?.sentiment_distribution?.negative || 0,
      icon: '😞',
      color: theme.colors.negative,
    },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <View key={index} style={[styles.card, { borderLeftColor: card.color }]}>
          <Text style={styles.icon}>{card.icon}</Text>
          <View style={styles.content}>
            <Text style={styles.value}>{card.value}</Text>
            <Text style={styles.title}>{card.title}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  icon: {
    fontSize: 28,
    marginRight: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  title: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
