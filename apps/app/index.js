// [DEBUG] first import on purpose: its module records t0 before anything else evaluates.
import { mark } from './src/lib/startupTrace';

import { registerRootComponent } from 'expo';

import App from './src/App';

mark('index.js: module graph evaluated');

registerRootComponent(App);
