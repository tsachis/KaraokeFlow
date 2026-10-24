import { registerRootComponent } from 'expo';
import { I18nManager } from 'react-native';

import { App } from './App';

// Keep the layout LTR even on a Hebrew-language phone: the mirror transform and
// controls assume it. RTL lyrics are handled per line (see src/lib/textDirection.ts).
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

registerRootComponent(App);
