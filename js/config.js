// QAcademy Supabase Configuration
const SUPABASE_URL = 'https://zrakjibtxyzoqcdtvpmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYWtqaWJ0eHl6b3FjZHR2cG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDcyODAsImV4cCI6MjA4ODk4MzI4MH0.saSEaK1IkbP03rfVvuwFpXQlLtAdKLIg9V7UwO7a2po';
// Payments Worker
const PAYMENTS_API_BASE = 'https://qacademy-gamma-payment-workers.mybackpacc.workers.dev'; // no trailing slash
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Email Worker
const EMAIL_WORKER_URL = 'https://qacademy-email-worker.mybackpacc.workers.dev';
const EMAIL_SECRET = 'bea84ac50d804cfaa85ef193734258a34b6a430591e24e96a571553a0a17ab2c';
