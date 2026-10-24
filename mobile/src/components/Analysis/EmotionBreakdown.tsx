import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface EmotionBreakdownProps {
  emotions: { [key: string]: number };
  primary: string;
}

const EMOTION_CONFIG: { [key: string]: { emoji: string; color: string } } = {
  happy: { emoji: '😊', color: '#00E676' },
  sad: { emoji: '😢', color: '#42A5F5' },
  angry: { emoji: '😠', color: '#FF5252' },
  surprised: { emoji: '😲', color: '#FFD740' },
  fearful: { emoji: '😨', color: '#AB47BC' },
  disgusted: { emoji: '🤢', color: '#FF7043' },
  neutral: { emoji: '😐', color: '#78909C' },
};

export const EmotionBreakdown: React.FC<EmotionBreakdownProps> = ({ emotions, primary }) => {
  const sortedEmotions = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emotion Analysis</Text>

      <View style={styles.primaryEmotion}>
        <Text style={styles.primaryEmoji}>
          {EMOTION_CONFIG[primary]?.emoji || '😐'}
        </Text>
        <View style={styles.primaryInfo}>
          <Text style={styles.primaryLabel}>Primary Emotion</Text>
          <Text style={[styles.primaryValue, { color: EMOTION_CONFIG[primary]?.color || theme.colors.text }]}>
            {primary.charAt(0).toUpperCase() + primary.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.emotionsList}>
        {sortedEmotions.map(([emotion, percentage]) => (
          <View key={emotion} style={styles.emotionRow}>
            <Text style={styles.emotionEmoji}>
              {EMOTION_CONFIG[emotion]?.emoji || '😐'}
            </Text>
            <Text style={styles.emotionName}>{emotion}</Text>
            <View style={styles.emotionBarContainer}>
              <View style={styles.emotionBarBg}>
                <View style={[
                  styles.emotionBarFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: EMOTION_CONFIG[emotion]?.color || theme.colors.textSecondary
                  }
                ]} />
              </View>
            </View>
            <Text style={[styles.emotionPercent, { color: EMOTION_CONFIG[emotion]?.color || theme.colors.text }]}>
              {percentage.toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  primaryEmotion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  primaryEmoji: {
    fontSize: 48,
    marginRight: theme.spacing.md,
  },
  primaryInfo: {
    flex: 1,
  },
  primaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  primaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emotionsList: {
    gap: theme.spacing.sm,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionEmoji: {
    fontSize: 20,
    width: 30,
  },
  emotionName: {
    width: 70,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  emotionBarContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
  },
  emotionBarBg: {
    height: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emotionBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  emotionPercent: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
