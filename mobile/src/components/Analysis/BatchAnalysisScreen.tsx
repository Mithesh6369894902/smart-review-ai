import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch, refreshAll, setNotice } from '../../store';
import { theme } from '../../theme';
import { api } from '../../services/api';
import { AnalysisResult, BatchSummary } from '../../types';
import { confOf, ratingNum, sentColor, sentOf } from '../../utils/safe';

interface BatchItem extends Partial<AnalysisResult> {
  text: string;
  error?: string;
}

export const BatchAnalysisScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [reviews, setReviews] = useState('');
  const [productName, setProductName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ results: BatchItem[]; summary: BatchSummary } | null>(null);

  const count = reviews.split('\n').filter(r => r.trim()).length;

  const handleAnalyze = async () => {
    const reviewList = reviews.split('\n').map(r => r.trim()).filter(Boolean);
    if (reviewList.length === 0) {
      Alert.alert('Error', 'Please enter at least one review');
      return;
    }
    if (reviewList.length > 50) {
      Alert.alert('Error', 'Maximum 50 reviews per batch');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.analyzeBatch(reviewList, productName.trim() || undefined);
      setResults(response.data as any);
      if (response.fallback) dispatch(setNotice('Cloud server unreachable — used on-device AI'));
      dispatch(refreshAll());
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const openDetail = (item: BatchItem) => {
    if (item.error || !item.sentiment) return;
    navigation.navigate('ResultDetail', { result: item });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Batch Analysis</Text>
        <Text style={styles.subtitle}>Analyze up to 50 reviews at once (one per line)</Text>
      </View>

      {!results ? (
        <>
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
            <Text style={styles.label}>Reviews (one per line)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter reviews, one per line..."
              placeholderTextColor={theme.colors.textMuted}
              value={reviews}
              onChangeText={setReviews}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{count} / 50 reviews</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAnalyze}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.text} size="small" />
                <Text style={styles.buttonText}>Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>📊 Analyze All Reviews</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Analysis Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{results.summary.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.positive }]}>
                  {results.summary.sentiment_distribution.positive}
                </Text>
                <Text style={styles.statLabel}>Positive</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.neutral }]}>
                  {results.summary.sentiment_distribution.neutral}
                </Text>
                <Text style={styles.statLabel}>Neutral</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.negative }]}>
                  {results.summary.sentiment_distribution.negative}
                </Text>
                <Text style={styles.statLabel}>Negative</Text>
              </View>
            </View>
            {results.summary.failed > 0 && (
              <Text style={styles.warn}>{results.summary.failed} review(s) failed</Text>
            )}
            <View style={styles.avgRating}>
              <Text style={styles.avgRatingLabel}>Average Rating:</Text>
              <Text style={styles.avgRatingValue}>{Number(results.summary.average_rating || 0).toFixed(1)} / 5.0</Text>
            </View>
          </View>

          <Text style={styles.resultsTitle}>Individual Results ({results.results.length})</Text>
          {results.results.map((result, index) => (
            result.error ? (
              <View key={index} style={[styles.resultCard, styles.errorCard]}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIndex}>#{index + 1}</Text>
                  <Text style={styles.errorBadge}>ERROR</Text>
                </View>
                <Text style={styles.reviewText} numberOfLines={2}>{result.text}</Text>
                <Text style={styles.errorText}>{result.error}</Text>
              </View>
            ) : (
              <TouchableOpacity key={index} style={styles.resultCard} onPress={() => openDetail(result)}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIndex}>#{index + 1}</Text>
                  <View style={[styles.sentimentBadge, { backgroundColor: sentColor(sentOf(result)) + '20' }]}>
                    <Text style={[styles.sentimentText, { color: sentColor(sentOf(result)) }]}>
                      {sentOf(result).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reviewText} numberOfLines={2}>{result.text}</Text>
                <View style={styles.resultStats}>
                  <Text style={styles.resultStat}>⭐ {ratingNum(result).toFixed(1)}</Text>
                  <Text style={styles.resultStat}>🎯 {confOf(result).toFixed(0)}%</Text>
                  <Text style={styles.resultStat}>{(result as AnalysisResult).overall_score?.grade || '—'}</Text>
                </View>
              </TouchableOpacity>
            )
          ))}

          <TouchableOpacity style={styles.button} onPress={() => setResults(null)}>
            <Text style={styles.buttonText}>🔄 Analyze More Reviews</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: 100, paddingTop: theme.spacing.xxl + 8 },
  header: { marginBottom: theme.spacing.xl },
  backButton: { fontSize: 16, color: theme.colors.primary, fontWeight: '600', marginBottom: theme.spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  inputGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, fontSize: 16, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border },
  textArea: { minHeight: 200 },
  charCount: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'right', marginTop: theme.spacing.xs },
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.md, alignItems: 'center', ...theme.shadows.medium },
  buttonDisabled: { opacity: 0.6 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  buttonText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  summaryCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.medium },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.lg },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.lg },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  warn: { backgroundColor: theme.colors.warning + '15', color: theme.colors.warning, fontSize: 12, fontWeight: '600', padding: 8, borderRadius: 8, textAlign: 'center', marginBottom: 8, overflow: 'hidden' },
  avgRating: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  avgRatingLabel: { fontSize: 14, color: theme.colors.textSecondary, marginRight: theme.spacing.sm },
  avgRatingValue: { fontSize: 18, fontWeight: '600', color: theme.colors.primary },
  resultsTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  resultCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  errorCard: { borderColor: theme.colors.negative + '60' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  resultIndex: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  sentimentBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.full },
  sentimentText: { fontSize: 12, fontWeight: '700' },
  errorBadge: { fontSize: 12, fontWeight: '700', color: theme.colors.negative },
  reviewText: { fontSize: 14, color: theme.colors.text, lineHeight: 20, marginBottom: theme.spacing.sm },
  errorText: { fontSize: 12, color: theme.colors.negative },
  resultStats: { flexDirection: 'row', gap: theme.spacing.md },
  resultStat: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600' },
});
