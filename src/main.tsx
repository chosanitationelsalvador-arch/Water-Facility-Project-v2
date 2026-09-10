import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { FilterProvider } from './context/FilterContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FilterProvider>
        <App />
      </FilterProvider>
    </ErrorBoundary>
  </StrictMode>,
);

