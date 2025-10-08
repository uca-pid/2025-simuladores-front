import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Silenciar errores específicos de ResizeObserver que son comunes con Monaco Editor
const originalError = console.error;
console.error = (...args) => {
  if (
    args.length > 0 &&
    typeof args[0] === 'string' &&
    args[0].includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    // Ignorar este error específico
    return;
  }
  originalError.apply(console, args);
};

// Manejador global para errores no capturados
window.addEventListener('error', (event) => {
  if (
    event.message &&
    event.message.includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
