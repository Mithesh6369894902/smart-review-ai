import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, fetchHistory, refreshAll } from '../../store';
import { api } from '../../services/api';
import { theme } from '../../theme';
import { ReviewCard } from './ReviewCard';
import { AnalysisResult } from '../../types';
import { ratingNum, confOf, sentOf } from '../../utils/safe';

type Filter = 'all' | 'positive' | 'neutral' | 'negative';
type Sort = 'newest' | 'oldest' | 'rating' | 'confidence';

const FILTERS: Filter[] = ['all', 'positive', 'neutral', 'negative'];

export const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { analyses } = useSelector((state: RootState) => state.app);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [exporting, setExporting] = useState(false);

  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = analyses.filter(a => {
      if (filter !== 'all' && sentOf(a) !== filter) return false;
      if (ql && !(a.text || '').toLowerCase().includes(ql) && !(a.product_name || '').toLowerCase().includes(ql)) return false;
      return true;
    });
    const ts = (a: AnalysisResult) => new Date((a as any).timestamp || (a as any).created_at || 0).getTime();
    return [...filtered].sort((a, b) => {
      if (sort === 'oldest') return ts(a) - ts(b);
      if (sort === 'rating') return ratingNum(b) - ratingNum(a);
      if (sort === 'confidence') return confOf(b) - confOf(a);
      return ts(b) - ts(a);
    });
  }, [analyses, q, filter, sort]);

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to clear all analysis history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          try {
            await api.clearHistory();
            dispatch(refreshAll());
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to clear history');
          }
        },
      },
    ]);
  };

  const handleExport = async (format: 'csv' | 'json' | 'report') => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.exportData(format);
      Alert.alert('Exported', res.fileUri ? `Saved & shared:\n${res.fileUri}` : `Exported ${format.toUpperCase()}`);
    } catch (e: any) {
      Alert.alert('Export failed', e.message || 'Is the backend running?');
    } finally {
      setExporting(false);
    }
  };

  const renderItem = ({ item }: { item: AnalysisResult }) => (
    <ReviewCard analysis={item} onPress={() => navigation.navigate('ResultDetail', { result: item })} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>{items.length} of {analyses.length} reviews</Text>
        </View>
        {analyses.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
            <Text style={styles.clearButtonText}>🗑️ Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.search}
        placeholder="🔎 Search reviews or products..."
        placeholderTextColor={theme.colors.textMuted}
        value={q}
        onChangeText={setQ}
      />
      <View style={styles.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipOn]} onPress={() => setFilter(f)}>
            <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSort(s => s === 'newest' ? 'oldest' : s === 'oldest' ? 'rating' : s === 'rating' ? 'confidence' : 'newest')}
        >
          <Text style={styles.sortText}>⇅ {sort}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.exportRow}>
        {(['csv', 'json', 'report'] as const).map(f => (
          <TouchableOpacity key={f} style={styles.exportBtn} onPress={() => handleExport(f)}>
            <Text style={styles.exportText}>⬇ {f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{analyses.length ? 'No matches' : 'No History Yet'}</Text>
          <Text style={styles.emptyText}>
            {analyses.length ? 'Try a different search or filter' : 'Your analyzed reviews will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl + 20, paddingBottom: theme.spacing.sm },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  clearButton: { backgroundColor: theme.colors.negative + '20', borderWidth: 1, borderColor: theme.colors.negative + '50', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md },
  clearButtonText: { fontSize: 14, color: theme.colors.negative, fontWeight: '600' },
  search: { marginHorizontal: theme.spacing.md, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, fontSize: 15, color: theme.colors.text, marginBottom: theme.spacing.sm },
  chips: { flexDirection: 'row', gap: 8, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'capitalize' },
  chipTextOn: { color: '#fff' },
  sortBtn: { marginLeft: 'auto', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  sortText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'capitalize' },
  exportRow: { flexDirection: 'row', gap: 8, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm },
  exportBtn: { flex: 1, backgroundColor: theme.colors.primary + '20', borderWidth: 1, borderColor: theme.colors.primary + '50', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  exportText: { fontSize: 12, fontWeight: '700', color: theme.colors.primaryLight },
  list: { padding: theme.spacing.md, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyIcon: { fontSize: 64, marginBottom: theme.spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});
