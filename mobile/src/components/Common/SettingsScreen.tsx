import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, TextInput } from 'react-native';
import { theme } from '../../theme';
import { CLOUD_API_URL, APP_VERSION } from '../../config';
import { api, BUILTIN_HOST, getStoredHost, resetApiHost, setApiHost } from '../../services/api';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [serverUrl, setServerUrl] = useState(CLOUD_API_URL);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkServerStatus();
    getStoredHost().then(setServerUrl).catch(() => {});
  }, []);

  const checkServerStatus = async () => {
    setServerStatus('checking');
    try {
      const h = await api.checkHealth();
      setServerStatus(h.ok ? 'online' : 'offline');
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const handleSaveServer = async () => {
    const url = serverUrl.trim();
    setSaving(true);
    try {
      if (!url || url === BUILTIN_HOST || url === 'offline' || url === 'builtin') {
        await setApiHost(BUILTIN_HOST);
      } else {
        await setApiHost(url);
      }
      await checkServerStatus();
      Alert.alert('Saved', 'Server URL saved and tested.');
    } catch {
      Alert.alert('Error', 'Failed to save server URL');
    } finally {
      setSaving(false);
    }
  };

  const handleResetServer = async () => {
    await resetApiHost();
    setServerUrl(CLOUD_API_URL);
    await checkServerStatus();
    Alert.alert('Reset', 'Back to the always-on cloud server.');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached analysis results. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await api.clearHistory();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleExportData = async (format: 'csv' | 'json' | 'report') => {
    try {
      const res = await api.exportData(format);
      Alert.alert('Exported', res.fileUri ? `Saved & shared:\n${res.fileUri}` : `Exported ${format.toUpperCase()}`);
    } catch (error: any) {
      Alert.alert('Export failed', error.message || 'Is the backend running?');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Connection</Text>
        <Text style={styles.fieldLabel}>Backend Server URL</Text>
        <TextInput
          style={styles.urlInput}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder={CLOUD_API_URL}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Default is the always-on cloud server — no laptop needed. Use {BUILTIN_HOST} for on-device AI only.
        </Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={handleSaveServer} disabled={saving}>
            <Text style={styles.saveBtnText}>💾 Save & Test</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testBtn} onPress={checkServerStatus}>
            <Text style={styles.testBtnText}>🔄 Test</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleResetServer}>
          <Text style={styles.resetLink}>↩ Reset to cloud default</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Status</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, {
            backgroundColor: serverStatus === 'online' ? theme.colors.positive :
                           serverStatus === 'offline' ? theme.colors.negative :
                           theme.colors.neutral
          }]} />
          <Text style={styles.statusText}>
            {serverStatus === 'online' ? 'Connected' :
             serverStatus === 'offline' ? 'Disconnected' : 'Checking...'}
          </Text>
          <TouchableOpacity onPress={checkServerStatus}>
            <Text style={styles.refreshButton}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>Get notified when analysis completes</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primary + '50' }}
            thumbColor={notifications ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Use dark theme (recommended)</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primary + '50' }}
            thumbColor={darkMode ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Analyze</Text>
            <Text style={styles.settingDescription}>Automatically analyze pasted text</Text>
          </View>
          <Switch
            value={autoAnalyze}
            onValueChange={setAutoAnalyze}
            trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primary + '50' }}
            thumbColor={autoAnalyze ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Caching</Text>
            <Text style={styles.settingDescription}>Cache results for faster repeated analysis</Text>
          </View>
          <Switch
            value={cacheEnabled}
            onValueChange={setCacheEnabled}
            trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primary + '50' }}
            thumbColor={cacheEnabled ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => handleExportData('csv')}>
          <Text style={styles.menuIcon}>📊</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Export as CSV</Text>
            <Text style={styles.menuDescription}>Download analysis data</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => handleExportData('json')}>
          <Text style={styles.menuIcon}>📄</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Export as JSON</Text>
            <Text style={styles.menuDescription}>Structured data export</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => handleExportData('report')}>
          <Text style={styles.menuIcon}>📋</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Generate Report</Text>
            <Text style={styles.menuDescription}>Full analysis summary</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleClearCache}>
          <Text style={styles.menuIcon}>🗑️</Text>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuLabel, styles.dangerText]}>Clear Cache</Text>
            <Text style={styles.menuDescription}>Remove all cached data</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutTitle}>SmartReviewAI</Text>
          <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
          <Text style={styles.aboutDescription}>
            AI-Powered E-Commerce Review Analysis Platform{'\n'}
            Using TF-IDF + Logistic Regression for sentiment analysis
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl + 20,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    fontSize: 16,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing.sm,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  refreshButton: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: theme.colors.negative + '30',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dangerText: {
    color: theme.colors.negative,
  },
  menuDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  aboutContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  aboutVersion: {
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  aboutDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  urlInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 17,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  testBtn: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  testBtnText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  resetLink: {
    color: theme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  disabled: {
    opacity: 0.6,
  },
});
