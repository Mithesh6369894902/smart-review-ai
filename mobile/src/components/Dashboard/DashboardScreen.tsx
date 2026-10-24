import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, checkServer, refreshAll } from '../../store';
import { theme } from '../../theme';
import { StatsCards } from './StatsCards';
import { Charts } from './Charts';
import { RecentAnalyses } from './RecentAnalyses';
import { api } from '../../services/api';
import { AnalysisResult } from '../../types';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { stats, analyses, serverOnline, offlineMode } = useSelector((state: RootState) => state.app);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    dispatch(refreshAll());
    dispatch(checkServer());
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(refreshAll());
    await dispatch(checkServer());
    setRefreshing(false);
  };

  const openDetail = (result: AnalysisResult) => {
    navigation.navigate('ResultDetail', { result });
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.exportData('csv');
      Alert.alert('Exported', res.fileUri ? `Saved & shared:\n${res.fileUri}` : 'Exported CSV');
    } catch (e: any) {
      Alert.alert('Export failed', e.message || 'Is the backend running?');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.greeting}>SmartReviewAI</Text>
              <View style={[styles.statusDot, {
                backgroundColor: serverOnline ? theme.colors.positive : theme.colors.negative
              }]} />
            </View>
            <View style={styles.subRow}>
              <Text style={styles.subtitle}>Review Intelligence Platform</Text>
              {offlineMode && <Text style={styles.pill}>on-device AI</Text>}
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Profile', { screen: 'Settings' })}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </Animated.View>

        <StatsCards stats={stats} />
        <Charts stats={stats} />

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionPrimary]}
              onPress={() => navigation.navigate('Analysis')}
            >
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionText}>Single Review</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Analysis', { screen: 'BatchAnalysis' })}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Batch Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleExport} disabled={exporting}>
              <Text style={styles.actionIcon}>📥</Text>
              <Text style={styles.actionText}>{exporting ? 'Exporting...' : 'Export CSV'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Analyses</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <RecentAnalyses analyses={analyses.slice(0, 5)} onPress={openDetail} />
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Powered By</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🧠</Text>
              <Text style={styles.featureText}>TF-IDF + Logistic Regression</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>😊</Text>
              <Text style={styles.featureText}>Multi-Emotion Detection</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📝</Text>
              <Text style={styles.featureText}>Extractive Summarization</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💡</Text>
              <Text style={styles.featureText}>AI Improvement Suggestions</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl + 20,
    paddingBottom: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    backgroundColor: theme.colors.positive + '25',
    color: theme.colors.positive,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.small,
  },
  settingsIcon: {
    fontSize: 20,
  },
  quickActions: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  actionPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  featuresCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  featuresList: {
    gap: theme.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
  },
});
