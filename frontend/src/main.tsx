import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize theme BEFORE React renders to prevent flash
(function initTheme() {
  try {
    const saved = localStorage.getItem('theme')
    const theme = (saved === 'light' || saved === 'dark') ? saved : 'dark'
    // Always set to the saved theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch (e) {
    // Fallback to dark mode if localStorage fails
    document.documentElement.classList.add('dark')
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
