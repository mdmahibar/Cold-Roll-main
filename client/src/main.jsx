import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { loadConfig, getConfig } from './config';
import { setApiBaseURL } from './services/apiService';

(async function bootstrap() {
  await loadConfig();
  setApiBaseURL(getConfig('REACT_APP_API_ROOT'));

  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  );
})();
