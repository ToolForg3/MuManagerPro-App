import { registerRootComponent } from 'expo';
import App from './App';

// Eliminación estricta de logs en compilaciones de producción (Anti-Ingeniería Inversa)
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.error = () => {};
}

registerRootComponent(App);
