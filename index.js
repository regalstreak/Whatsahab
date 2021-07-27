import { AppRegistry } from 'react-native';
import { App } from './App';
import { name as appName } from './app.json';
import { configureNotifications } from './src/utils/notifications';

configureNotifications();
AppRegistry.registerComponent(appName, () => App);
