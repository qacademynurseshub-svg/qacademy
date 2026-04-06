// ============================================================
// QAcademy Email Worker
// Sends transactional emails via Resend.
// Deploy: cd workers/email-worker && npx wrangler deploy
// ============================================================

// ── Import HTML templates as text modules ───────────────────
import welcomeStudentHtml from './templates/welcome-student.html';
import welcomeTeacherHtml from './templates/welcome-teacher.html';
import subscriptionAssignedHtml from './templates/subscription-assigned.html';

// ── Allowed origins for CORS ────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://qacademy-gamma.pages.dev',
  'http://localhost'
];

function getAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  // Match exact or starts-with for localhost (any port)
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (origin.startsWith('http://localhost')) return origin;
  return null;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// ── Event → template + subject mapping ──────────────────────
const EVENT_MAP = {
  WELCOME_STUDENT: {
    html: welcomeStudentHtml,
    subject: 'Welcome to QAcademy \u2013 You\u2019re all set'
  },
  WELCOME_TEACHER: {
    html: welcomeTeacherHtml,
    subject: 'Welcome to QAcademy Teacher Assess \u2013 You\u2019re approved'
  },
  SUBSCRIPTION_ASSIGNED: {
    html: subscriptionAssignedHtml,
    subject: 'Your QAcademy access is now active'
  }
};

// ── Placeholder replacer ────────────────────────────────────
function fillTemplate(html, data) {
  return html
    .replace(/\{\{name\}\}/g, data.name || '')
    .replace(/\{\{email\}\}/g, data.email || '')
    .replace(/\{\{loginUrl\}\}/g, data.loginUrl || '')
    .replace(/\{\{programName\}\}/g, data.programName || '')
    .replace(/\{\{productName\}\}/g, data.productName || '')
    .replace(/\{\{expiryDate\}\}/g, data.expiryDate || '');
}

// ── Main handler ────────────────────────────────────────────
export default {
  async fetch(request, env) {

    const origin = getAllowedOrigin(request);

    // ── CORS preflight ────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: origin ? corsHeaders(origin) : {}
      });
    }

    // ── Only POST allowed ─────────────────────────────────
    if (request.method !== 'POST') {
      return Response.json(
        { ok: false, error: 'Method not allowed' },
        { status: 405, headers: origin ? corsHeaders(origin) : {} }
      );
    }

    // ── CORS origin check ─────────────────────────────────
    if (!origin) {
      return Response.json(
        { ok: false, error: 'Origin not allowed' },
        { status: 403 }
      );
    }

    const headers = corsHeaders(origin);

    try {
      const body = await request.json();

      // ── Auth check ────────────────────────────────────
      if (!body.secret || body.secret !== env.EMAIL_SECRET) {
        return Response.json(
          { ok: false, error: 'Unauthorized' },
          { status: 401, headers }
        );
      }

      // ── Validate event ────────────────────────────────
      const eventConfig = EVENT_MAP[body.event];
      if (!eventConfig) {
        return Response.json(
          { ok: false, error: 'Unknown event: ' + (body.event || '(none)') },
          { status: 400, headers }
        );
      }

      // ── Validate email ────────────────────────────────
      if (!body.data || !body.data.email) {
        return Response.json(
          { ok: false, error: 'Missing data.email' },
          { status: 400, headers }
        );
      }

      // ── Fill placeholders ─────────────────────────────
      const filledHtml = fillTemplate(eventConfig.html, body.data);

      // ── Send via Resend ───────────────────────────────
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'QAcademy Educational Consult <noreply@qacademynurses.com>',
          to: [body.data.email],
          subject: eventConfig.subject,
          html: filledHtml
        })
      });

      if (!resendResponse.ok) {
        const errText = await resendResponse.text();
        return Response.json(
          { ok: false, error: 'Resend API error: ' + errText },
          { status: 502, headers }
        );
      }

      return Response.json({ ok: true }, { status: 200, headers });

    } catch (err) {
      return Response.json(
        { ok: false, error: err.message || 'Internal error' },
        { status: 500, headers }
      );
    }
  }
};
