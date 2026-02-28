import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

/**
 * main.jsx - THE REACT ENTRY POINT
 * This file takes your App.jsx dashboard and injects it into the index.html.
 * * * CRITICAL DEPLOYMENT NOTE: 
 * Ensure App.jsx and main.jsx are located in the same root folder.
 * Using './App' allows the build system to find the file automatically.
 */

const rootElement = document.getElementById('root');

if (rootElement) {
  // Initialize the React application root
  const root = ReactDOM.createRoot(rootElement);
  
  // Render the App component
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}