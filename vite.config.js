import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path is overridable via VITE_BASE_PATH so the staging branch
// can be built with a different base (e.g. /preview/) for side-by-side
// deployment to GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/cp-payroll-quote-calculator/',
})
