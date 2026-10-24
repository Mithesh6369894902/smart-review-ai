import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { theme } from '../../theme';

export const ProfileScreen: React.FC = () => {
  const features = [
    { icon: '🔍', title: 'Sentiment Analysis', description: 'TF-IDF + Logistic Regression' },
    { icon: '😊', title: 'Emotion Detection', description: 'Multi-emotion classification' },
    { icon: '📝', title: 'Review Summarization', description: 'Extractive summarization' },
    { icon: '⭐', title: 'Star Rating', description: 'Predicted rating system' },
    { icon: '💡', title: 'Suggestions', description: 'Product improvement tips' },
    { icon: '📊', title: 'Analytics', description: 'Detailed insights dashboard' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
        <Text style={styles.appName}>SmartReviewAI</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technology Stack</Text>
        <View style={styles.techGrid}>
          <View style={styles.techItem}>
            <Text style={styles.techIcon}>⚛️</Text>
            <Text style={styles.techName}>React Native</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techIcon}>🐍</Text>
            <Text style={styles.techName}>Python</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techIcon}>⚡</Text>
            <Text style={styles.techName}>FastAPI</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={styles.techIcon}>🧠</Text>
            <Text style={styles.techName}>scikit-learn</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ML Pipeline</Text>
        <View style={styles.pipelineContainer}>
          <View style={styles.pipelineStep}>
            <View style={styles.pipelineDot} />
            <Text style={styles.pipelineText}>Text Preprocessing</Text>
          </View>
          <View style={styles.pipelineLine} />
          <View style={styles.pipelineStep}>
            <View style={styles.pipelineDot} />
            <Text style={styles.pipelineText}>TF-IDF Vectorization</Text>
          </View>
          <View style={styles.pipelineLine} />
          <View style={styles.pipelineStep}>
            <View style={styles.pipelineDot} />
            <Text style={styles.pipelineText}>Logistic Regression</Text>
          </View>
          <View style={styles.pipelineLine} />
          <View style={styles.pipelineStep}>
            <View style={styles.pipelineDot} />
            <Text style={styles.pipelineText}>Prediction Output</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Built with ❤️ using ML & NLP</Text>
        <Text style={styles.copyright}>© 2026 SmartReviewAI</Text>
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
    alignItems: 'center',
    paddingTop: theme.spacing.xxl + 30,
    paddingBottom: theme.spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.large,
  },
  avatarText: {
    fontSize: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  techItem: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  techIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  techName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  pipelineContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
  },
  pipelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pipelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  pipelineText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  pipelineLine: {
    width: 2,
    height: 20,
    backgroundColor: theme.colors.primary,
    marginLeft: 5,
    marginVertical: 4,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
