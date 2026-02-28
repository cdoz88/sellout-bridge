import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

/**
 * main.jsx - THE REACT GLUE
 * * WHAT THIS DOES:
 * 1. Finds the "root" empty box inside your index.html.
 * 2. Takes your entire Dashboard (App.jsx) and puts it in that box.
 * 3. Makes sure everything stays updated when you click buttons.
 */

const rootElement = document.getElementById('root');

if (rootElement) {
  // We create the "Root" of the app
  const root = ReactDOM.createRoot(rootElement);
  
  // We render your App dashboard inside it
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}