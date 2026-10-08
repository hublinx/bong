import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Root from './App';
import { AuthProvider } from './lib/auth';
import { UIProvider } from './components/UI';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </UIProvider>
  </StrictMode>,
);
