import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'
import { KnownTagsProvider } from './contexts/KnownTagsContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <KnownTagsProvider>
      <App />
    </KnownTagsProvider>
  </React.StrictMode>,
) 