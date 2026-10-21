import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import ConfigError from './components/ConfigError'
import { missingSupabaseEnvVars } from './lib/supabaseConfig'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (missingSupabaseEnvVars.length > 0) {
  console.error(`Missing Supabase env vars: ${missingSupabaseEnvVars.join(', ')}`)
  root.render(<ConfigError missing={missingSupabaseEnvVars} />)
} else {
  // Load App lazily so the Supabase client is only created once config is known to be valid
  import('./App').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
}
