import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

if (__DEV__ && Platform.OS === 'web') {
	const originalWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		const [firstArg] = args;
		if (typeof firstArg === 'string' && firstArg.includes('props.pointerEvents is deprecated')) {
			return;
		}

		originalWarn(...args);
	};
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
