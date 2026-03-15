import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';

import { store } from '@/store';

import './plugins/assets';
import App from './App.tsx';
import FallbackRender from './components/ErrorBoundary.tsx';
import { setupI18n } from './locales';
import { setupAppVersionNotification, setupDayjs, setupIconifyOffline, setupNProgress } from './plugins';
import { queryClient } from './service/queryClient';
import { devAutoLogin } from './utils/dev-login';

async function setupApp() {
  // 开发环境自动登录
  await devAutoLogin();

  const container = document.getElementById('root');

  if (!container) return;

  const root = createRoot(container);

  root.render(
    <ErrorBoundary fallbackRender={FallbackRender}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );

  setupI18n();

  setupNProgress();

  setupIconifyOffline();

  setupDayjs();

  setupAppVersionNotification();
}

setupApp();
