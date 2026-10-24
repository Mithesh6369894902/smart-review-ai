import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, analyzeReview, clearCurrentAnalysis, clearNotice, refreshAll } from '../../store';
import { theme } from '../../theme';
import { ReviewInput } from './ReviewInput';
import { ResultsView } from './ResultsView';

export const AnalysisScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentAnalysis, isLoading, notice, error } = useSelector((state: RootState) => state.app);
  const lastId = useRef<number | null>(null);

  useEffect(() => {
    if (currentAnalysis && currentAnalysis.id !== lastId.current) {
      lastId.current = currentAnalysis.id;
      dispatch(refreshAll());
      navigation.navigate('ResultDetail', { result: currentAnalysis });
    }
  }, [currentAnalysis, dispatch, navigation]);

  useEffect(() => {
    if (notice) {
      Alert.alert('Notice', notice);
      dispatch(clearNotice());
    }
  }, [notice, dispatch]);

  useEffect(() => {
    if (error) Alert.alert('Analysis failed', error);
  }, [error]);

  const handleAnalyze = (text: string, productName?: string) => {
    lastId.current = null;
    dispatch(clearCurrentAnalysis());
    dispatch(analyzeReview({ text, productName }));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {currentAnalysis && !isLoading ? (
          <ResultsView result={currentAnalysis} onNew={() => dispatch(clearCurrentAnalysis())} />
        ) : (
          <ReviewInput onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}
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
    paddingTop: theme.spacing.xxl + 20,
  },
});
