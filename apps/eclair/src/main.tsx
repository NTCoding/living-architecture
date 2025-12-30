import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { ThemeProvider } from '@/contexts/ThemeContext'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element not found. Ensure index.html has an element with id="root".')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename="/eclair">
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
