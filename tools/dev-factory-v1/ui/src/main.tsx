import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './design-system/tokens.css'
import './design-system/layout.css'

const root = document.getElementById('root')
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <App path={window.location.pathname} />
    </StrictMode>,
  )
}
