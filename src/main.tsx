import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DataProvider } from './lib/data';
import { UIProvider } from './components/UI';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </UIProvider>
  </StrictMode>,
);
