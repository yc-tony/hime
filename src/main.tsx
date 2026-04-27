import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Lock viewport height on iOS to prevent keyboard from shifting layout
const lockVh = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};
lockVh();
window.addEventListener('resize', lockVh);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
