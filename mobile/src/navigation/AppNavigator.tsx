import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';
import {
  AnalysisStackParamList, DashboardStackParamList, HistoryStackParamList,
  ProfileStackParamList, RootTabParamList,
} from '../types';
import { DashboardScreen } from '../components/Dashboard/DashboardScreen';
import { AnalysisScreen } from '../components/Analysis/AnalysisScreen';
import { BatchAnalysisScreen } from '../components/Analysis/BatchAnalysisScreen';
import { ResultDetailScreen } from '../components/Analysis/ResultDetailScreen';
import { HistoryScreen } from '../components/History/HistoryScreen';
import { ProfileScreen } from '../components/Common/ProfileScreen';
import { SettingsScreen } from '../components/Common/SettingsScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();
const DashboardStack = createStackNavigator<DashboardStackParamList>();
const AnalysisStack = createStackNavigator<AnalysisStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons: { [key: string]: string } = {
    Dashboard: '📊',
    Analysis: '🔍',
    History: '📋',
    Profile: '👤',
  };

  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={styles.tabEmoji}>{icons[name]}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {name}
      </Text>
    </View>
  );
};

const DashboardStackNav = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
    <DashboardStack.Screen name="ResultDetail" component={ResultDetailScreen} />
  </DashboardStack.Navigator>
);

const AnalysisStackNav = () => (
  <AnalysisStack.Navigator screenOptions={{ headerShown: false }}>
    <AnalysisStack.Screen name="AnalysisMain" component={AnalysisScreen} />
    <AnalysisStack.Screen name="BatchAnalysis" component={BatchAnalysisScreen} />
    <AnalysisStack.Screen name="ResultDetail" component={ResultDetailScreen} />
  </AnalysisStack.Navigator>
);

const HistoryStackNav = () => (
  <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
    <HistoryStack.Screen name="HistoryMain" component={HistoryScreen} />
    <HistoryStack.Screen name="ResultDetail" component={ResultDetailScreen} />
  </HistoryStack.Navigator>
);

const ProfileStackNav = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
  </ProfileStack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => (
        <TabIcon name={route.name} focused={focused} />
      ),
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardStackNav} />
    <Tab.Screen name="Analysis" component={AnalysisStackNav} />
    <Tab.Screen name="History" component={HistoryStackNav} />
    <Tab.Screen name="Profile" component={ProfileStackNav} />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingTop: 8,
    paddingBottom: 20,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
  tabEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
