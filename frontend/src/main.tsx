import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppConfigProvider } from './context/AppConfigContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppConfigProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppConfigProvider>
  </React.StrictMode>
);
