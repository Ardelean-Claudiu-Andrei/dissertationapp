import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import PollScreen from '../screens/PollScreen';
import ResultsScreen from '../screens/ResultsScreen';
import VersionGateScreen from '../screens/VersionGateScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Polls' }} />
        <Stack.Screen name="Poll" component={PollScreen} options={({ route }) => ({ title: route.params?.title || 'Poll' })} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
        <Stack.Screen name="VersionGate" component={VersionGateScreen} options={{ title: 'Update Required', headerLeft: () => null }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
