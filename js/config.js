// QAcademy Configuration — auto-detects dev vs prod by hostname
// ────────────────────────────────────────────────────────────────
// Dev  = current Supabase project (test data, dev workers)
// Prod = production Supabase project (clean, real users)
// To set up prod: replace the PROD placeholders below with real values.
// ────────────────────────────────────────────────────────────────

const IS_PROD = window.location.hostname === 'PROD_HOSTNAME_HERE'; // e.g. 'qacademy-prod.pages.dev'

// Supabase
const SUPABASE_URL = IS_PROD
  ? 'PROD_SUPABASE_URL_HERE'
  : 'https://zrakjibtxyzoqcdtvpmq.supabase.co';

const SUPABASE_ANON_KEY = IS_PROD
  ? 'PROD_SUPABASE_ANON_KEY_HERE'
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYWtqaWJ0eHl6b3FjZHR2cG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDcyODAsImV4cCI6MjA4ODk4MzI4MH0.saSEaK1IkbP03rfVvuwFpXQlLtAdKLIg9V7UwO7a2po';

// Payments Worker
const PAYMENTS_API_BASE = IS_PROD
  ? 'PROD_PAYMENTS_WORKER_URL_HERE'
  : 'https://qacademy-gamma-payment-workers.mybackpacc.workers.dev';

// Email Worker
const EMAIL_WORKER_URL = IS_PROD
  ? 'PROD_EMAIL_WORKER_URL_HERE'
  : 'https://qacademy-email-worker.mybackpacc.workers.dev';

const EMAIL_SECRET = IS_PROD
  ? 'PROD_EMAIL_SECRET_HERE'
  : 'bea84ac50d804cfaa85ef193734258a34b6a430591e24e96a571553a0a17ab2c';

// Supabase client
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
