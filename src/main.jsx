import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { DsCssBaseline } from '@am92/react-design-system'
import theme from './theme.js'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="light">
      <DsCssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
