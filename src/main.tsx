import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ApiAuth } from './services/apiAuth';

// Ukloni zaostale token-e iz starijih verzija koje su ih čuvale u localStorage.
ApiAuth.cleanupLegacyStorageTokens();

createRoot(document.getElementById('root')!).render(<App />);
