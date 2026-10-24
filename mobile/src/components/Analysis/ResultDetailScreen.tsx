import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../../theme';
import { AnalysisResult } from '../../types';
import { confOf, fmtDate, sentColor, sentOf, starsOf, ratingNum } from '../../utils/safe';
import { EmotionBreakdown } from './EmotionBreakdown';

interface Props {
  navigation?: any;
  route?: { params?: { result?: AnalysisResult } };
}

export const ResultDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const result = route?.params?.result;

  const copySummary = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Summary copied to clipboard');
    } catch {
      Alert.alert('Error', 'Copy failed');
    }
  };

  if (!result) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>No result selected</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation?.goBack()}>
          <Text style={styles.primaryBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const s = result.sentiment || ({} as any);
  const e = result.emotion || ({} as any);
  const summ = result.summary || ({ summary: result.text } as any);
  const sugg = result.suggestions || ({ suggestions: [], topics_detected: [] } as any);
  const sc = result.overall_score || ({} as any);
  const color = sentColor(sentOf(result));
  const probs = s.probabilities || {};
  const breakdown = sc.breakdown || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={[styles.overallScore, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Text style={[styles.grade, { color }]}>{sc.grade || '—'}</Text>
          <Text style={[styles.score, { color }]}>{Number(sc.score || 0).toFixed(0)}</Text>
        </View>
      </View>

      {result.product_name ? <Text style={styles.productChip}>📦 {result.product_name}</Text> : null}
      <Text style={styles.quote}>“{result.text}”</Text>
      <Text style={styles.dateLine}>{fmtDate(result)} · Model v{result.analysis_metadata?.model_version || '2.0'}{result.analysis_metadata ? ` · ${result.analysis_metadata.processing_time_ms} ms` : ''}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sentiment</Text>
        <View style={styles.sentimentRow}>
          <View style={[styles.sentimentPill, { backgroundColor: color }]}>
            <Text style={styles.sentimentPillText}>{sentOf(result).toUpperCase()}</Text>
          </View>
          <Text style={styles.confBig}>{confOf(result).toFixed(1)}%</Text>
        </View>
        <Text style={styles.muted}>Confidence</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${confOf(result)}%`, backgroundColor: color }]} />
        </View>
        {Object.keys(probs).length > 0 && (
          <View style={styles.probRow}>
            {Object.entries(probs).map(([k, v]: [string, any]) => (
              <View key={k} style={styles.probItem}>
                <Text style={styles.probLabel}>{k}</Text>
                <Text style={[styles.probValue, { color: sentColor(k) }]}>{Number(v).toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Star Rating</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.stars}>{starsOf(result)}</Text>
          <Text style={styles.ratingValue}>{ratingNum(result).toFixed(1)} / 5.0</Text>
        </View>
      </View>

      <View style={styles.card}>
        <EmotionBreakdown emotions={e.emotions || {}} primary={e.primary_emotion || 'neutral'} />
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>Review Summary</Text>
          <TouchableOpacity style={styles.miniBtn} onPress={() => copySummary(summ.summary || result.text)}>
            <Text style={styles.miniBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>{summ.summary || result.text}</Text>
        <View style={styles.statRow}>
          <View style={styles.stat}><Text style={styles.statVal}>{summ.original_length ?? result.text.length}</Text><Text style={styles.statLbl}>Original</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{summ.summary_length ?? (summ.summary || '').length}</Text><Text style={styles.statLbl}>Summary</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{summ.compression_ratio ?? 100}%</Text><Text style={styles.statLbl}>Compressed</Text></View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Improvement Suggestions</Text>
        {(sugg.suggestions || []).length === 0 && <Text style={styles.muted}>No suggestions for this review.</Text>}
        {(sugg.suggestions || []).map((t: string, i: number) => (
          <View key={i} style={styles.suggItem}>
            <Text style={styles.suggBullet}>•</Text>
            <Text style={styles.suggText}>{t}</Text>
          </View>
        ))}
        {(sugg.topics_detected || []).length > 0 && (
          <View style={styles.chipWrap}>
            <Text style={styles.muted}>Topics: </Text>
            {(sugg.topics_detected || []).map((t: string, i: number) => (
              <View key={i} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
            ))}
          </View>
        )}
        {(sugg.keywords || []).length > 0 && (
          <View style={styles.chipWrap}>
            <Text style={styles.muted}>Keywords: </Text>
            {(sugg.keywords || []).slice(0, 6).map((t: string, i: number) => (
              <View key={i} style={[styles.chip, styles.chipAlt]}><Text style={[styles.chipText, styles.chipTextAlt]}>{t}</Text></View>
            ))}
          </View>
        )}
      </View>

      {Object.keys(breakdown).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score Breakdown</Text>
          {Object.entries(breakdown).map(([k, v]: [string, any]) => (
            <View key={k} style={styles.bdRow}>
              <Text style={styles.bdLabel}>{k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' ')}</Text>
              <View style={styles.barBg}><View style={[styles.barFill, { width: `${Number(v) || 0}%` }]} /></View>
              <Text style={styles.bdVal}>{Number(v).toFixed(0)}%</Text>
            </View>
          ))}
          <View style={styles.gradeRow}>
            <Text style={styles.muted}>Overall grade</Text>
            <Text style={[styles.gradeBig, { color }]}>{sc.grade} · {Number(sc.score || 0).toFixed(1)}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 100, paddingTop: theme.spacing.xxl + 8 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backButton: { fontSize: 16, color: theme.colors.primary, fontWeight: '600' },
  overallScore: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  grade: { fontSize: 22, fontWeight: '800' },
  score: { fontSize: 12, fontWeight: '600' },
  productChip: { alignSelf: 'flex-start', backgroundColor: '#00D9FF20', color: theme.colors.accent, fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 8, overflow: 'hidden' },
  quote: { fontSize: 14, fontStyle: 'italic', lineHeight: 22, color: theme.colors.textSecondary, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.primary + '12', padding: 12, borderRadius: 8, marginBottom: 6 },
  dateLine: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 12 },
  card: { backgroundColor: theme.colors.card, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniBtn: { backgroundColor: theme.colors.primary + '25', borderWidth: 1, borderColor: theme.colors.primary + '50', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  miniBtnText: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700' },
  sentimentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sentimentPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  sentimentPillText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  confBig: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6 },
  barBg: { flex: 1, height: 10, backgroundColor: theme.colors.surfaceLight, borderRadius: 5, overflow: 'hidden', marginVertical: 6 },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: theme.colors.primary },
  probRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 6 },
  probItem: { alignItems: 'center' },
  probLabel: { fontSize: 11, color: theme.colors.textSecondary, textTransform: 'capitalize', marginBottom: 4 },
  probValue: { fontSize: 15, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  stars: { fontSize: 32, color: theme.colors.neutral, letterSpacing: 2 },
  ratingValue: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  summaryText: { fontSize: 14, lineHeight: 22, color: theme.colors.text, marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 17, fontWeight: '800', color: theme.colors.primaryLight },
  statLbl: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  suggItem: { flexDirection: 'row', backgroundColor: theme.colors.primary + '12', borderWidth: 1, borderColor: theme.colors.primary + '30', padding: 10, borderRadius: 10, marginBottom: 8 },
  suggBullet: { color: theme.colors.primaryLight, marginRight: 8, fontWeight: '800' },
  suggText: { flex: 1, fontSize: 13, lineHeight: 19, color: theme.colors.text },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  chip: { backgroundColor: theme.colors.primary + '25', borderWidth: 1, borderColor: theme.colors.primary + '50', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 12, color: theme.colors.primaryLight, fontWeight: '600' },
  chipAlt: { backgroundColor: '#00D9FF18', borderColor: '#00D9FF50' },
  chipTextAlt: { color: theme.colors.accent },
  bdRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  bdLabel: { width: 110, fontSize: 13, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  bdVal: { width: 42, fontSize: 13, fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  gradeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  gradeBig: { fontSize: 18, fontWeight: '800' },
});
