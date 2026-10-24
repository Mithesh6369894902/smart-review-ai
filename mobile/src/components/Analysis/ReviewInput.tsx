import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../theme';

interface ReviewInputProps {
  onAnalyze: (text: string, productName?: string) => void;
  isLoading: boolean;
}

export const ReviewInput: React.FC<ReviewInputProps> = ({ onAnalyze, isLoading }) => {
  const [reviewText, setReviewText] = useState('');
  const [productName, setProductName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const words = reviewText.trim() ? reviewText.trim().split(/\s+/).length : 0;
  const valid = reviewText.trim().length >= 10;

  const handleAnalyze = () => {
    if (!valid) {
      setError('Please enter at least 10 characters');
      return;
    }
    setError(null);
    onAnalyze(reviewText.trim(), productName.trim() || undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analyze Review</Text>
      <Text style={styles.subtitle}>Enter a customer review to get AI-powered insights</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Product Name (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Wireless Headphones"
          placeholderTextColor={theme.colors.textMuted}
          value={productName}
          onChangeText={setProductName}
          maxLength={200}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Customer Review *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter the review text here (min 10 characters)..."
          placeholderTextColor={theme.colors.textMuted}
          value={reviewText}
          onChangeText={(t) => { setReviewText(t); if (error) setError(null); }}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={5000}
        />
        <Text style={styles.charCount}>{reviewText.length} chars · {words} words</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.button, (isLoading || !valid) && styles.buttonDisabled]}
        onPress={handleAnalyze}
        disabled={isLoading || !valid}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.text} size="small" />
            <Text style={styles.buttonText}>Analyzing...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>🔍 Analyze Review</Text>
        )}
      </TouchableOpacity>

      <View style={styles.sampleReviews}>
        <Text style={styles.sampleTitle}>Try a sample:</Text>
        <TouchableOpacity
          style={styles.sampleButton}
          onPress={() => setReviewText("This product is absolutely amazing! Best purchase I've made all year. The quality is outstanding and it arrived quickly. Highly recommend!")}
        >
          <Text style={styles.sampleText}>⭐ Positive Review</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sampleButton}
          onPress={() => setReviewText("The product is okay, nothing special. It works as described but doesn't really stand out. Average quality for the price.")}
        >
          <Text style={styles.sampleText}>😐 Neutral Review</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sampleButton}
          onPress={() => setReviewText("Terrible product! Broke after one day. Complete waste of money. The quality is awful and customer service was unhelpful. Want a refund.")}
        >
          <Text style={styles.sampleText}>😞 Negative Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    minHeight: 150,
    paddingTop: theme.spacing.md,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.negative,
    marginTop: 4,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sampleReviews: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  sampleButton: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sampleText: {
    fontSize: 14,
    color: theme.colors.text,
  },
});
