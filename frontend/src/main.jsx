import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { DeportesProvider } from './context/DeportesContext';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <DeportesProvider>
      <App />
    </DeportesProvider>
  </BrowserRouter>
);
