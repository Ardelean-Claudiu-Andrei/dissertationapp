import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { FlagsProvider, useFlags } from '../context/FlagsContext';
import { VersionProvider, useVersion } from '../context/VersionContext';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

import HomeScreen from '../screens/HomeScreen';
import PollScreen from '../screens/PollScreen';
import ResultsScreen from '../screens/ResultsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VersionGateScreen from '../screens/VersionGateScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: '#1a1a2e' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

function PollsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Polls', headerShown: false }} />
      <Stack.Screen name="Poll" component={PollScreen} options={({ route }) => ({ title: route.params?.title || 'Poll' })} />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
    </Stack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const { versionConfig, primaryColor, isDarkMode } = useVersion();
  const isLeftHanded = !!versionConfig.features?.left_handed_usage;
  const tabs = [
    { name: 'PollsTab', icon: '🗳️', label: 'Polls' },
    { name: 'ActivityTab', icon: '📊', label: 'Activity' },
    { name: 'ProfileTab', icon: '👤', label: 'Profile' },
  ];

  return (
    <View style={styles.tabBarOuter}>
      <View style={[
        styles.tabBarInner,
        {
          flexDirection: isLeftHanded ? 'row-reverse' : 'row',
          backgroundColor: isDarkMode ? 'rgba(24, 24, 42, 0.96)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
        },
      ]}>
        {state.routes.map((route, index) => {
          const tab = tabs[index];
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrap, isFocused && { backgroundColor: primaryColor + '22' }]}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>
              </View>
              <Text style={[
                styles.tabLabel,
                { color: isDarkMode ? '#adb5bd' : '#adb5bd' },
                isFocused && { color: isDarkMode ? '#f8f9fa' : primaryColor, fontWeight: '700' },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="PollsTab" component={PollsStack} />
      <Tab.Screen name="ActivityTab" component={ActivityScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { token, loading, user } = useAuth();
  const { refreshFlags } = useFlags();

  useEffect(() => {
    if (token && user?.id) {
      refreshFlags(user.id).catch(() => {});
    }
  }, [token, user?.id, refreshFlags]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="VersionGate"
            component={VersionGateScreen}
            options={{ headerShown: true, ...stackOptions, title: 'Update Required', headerLeft: () => null }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <FlagsProvider>
      <VersionProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </VersionProvider>
    </FlagsProvider>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIconWrap: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#adb5bd', fontWeight: '500' },
});
