import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { BookmarkOpenerProvider } from './context/BookmarkOpenerContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <BookmarkOpenerProvider>
        <App />
      </BookmarkOpenerProvider>
    </ToastProvider>
  </React.StrictMode>
);
