import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import AppNavigator from './src/navigation/AppNavigator';
import { name as appName } from './app.json';

enableScreens();

AppRegistry.registerComponent(appName, () => AppNavigator);
