export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request, env)
        });
      }

      if (request.method === 'POST' && url.pathname === '/payments/init-public') {
        return handleInitPublic(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/payments/verify') {
        return handleVerify(request, env);
      }

      return json(
        { ok: false, error: 'not_found' },
        404,
        corsHeaders(request, env)
      );
    } catch (err) {
      console.error('Worker fatal error:', err);
      return json(
        {
          ok: false,
          error: 'server_error',
          message: err.message || 'Unexpected worker error'
        },
        500,
        corsHeaders(request, env)
      );
    }
  }
};

/* ============================================================
 * CORS / RESPONSE HELPERS
 * ============================================================ */

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.APP_ORIGIN || '').trim();

  const allowOrigin = origin && origin === allowed ? origin : allowed || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(baseIso, days) {
  const d = new Date(baseIso);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString();
}

function makeRef(prefix = 'QAC') {
  const part = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `${prefix}_${part}`;
}

function makeId(prefix) {
  const part = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `${prefix}_${part}`;
}

function makeSetupToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

/* ============================================================
 * SUPABASE REST HELPERS
 * Uses SERVICE ROLE key inside Worker
 * ============================================================ */

function sbBase(env) {
  return `${env.SUPABASE_URL}/rest/v1`;
}

function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };
}

function buildFilterParams(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (!val) return;
    params.set(key, val);
  });

  return params;
}

async function sbSelect(env, table, { select = '*', filters = {}, order = '', limit = '' } = {}) {
  const params = buildFilterParams(filters);
  params.set('select', select);
  if (order) params.set('order', order);
  if (limit) params.set('limit', String(limit));

  const res = await fetch(`${sbBase(env)}/${table}?${params.toString()}`, {
    method: 'GET',
    headers: sbHeaders(env)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase select failed on ${table}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

async function sbMaybeOne(env, table, opts = {}) {
  const rows = await sbSelect(env, table, { ...opts, limit: 1 });
  return rows[0] || null;
}

async function sbInsert(env, table, payload) {
  const res = await fetch(`${sbBase(env)}/${table}`, {
    method: 'POST',
    headers: {
      ...sbHeaders(env),
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase insert failed on ${table}: ${text}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return rows[0] || null;
}

async function sbPatch(env, table, payload, filters = {}) {
  const params = buildFilterParams(filters);

  const res = await fetch(`${sbBase(env)}/${table}?${params.toString()}`, {
    method: 'PATCH',
    headers: {
      ...sbHeaders(env),
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase patch failed on ${table}: ${text}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return rows[0] || null;
}

/* ============================================================
 * PAYSTACK HELPERS
 * ============================================================ */

async function paystackInitialize(env, payload) {
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok || !data?.status) {
    throw new Error(data?.message || 'Paystack initialize failed');
  }

  return data;
}

async function paystackVerify(env, reference) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();

  if (!res.ok || !data?.status) {
    throw new Error(data?.message || 'Paystack verify failed');
  }

  return data;
}

/* ============================================================
 * DATA HELPERS
 * ============================================================ */

async function getProductById(env, productId, requireActive = true) {
  const filters = {
    product_id: `eq.${productId}`
  };

  if (requireActive) {
    // products.status is lowercase in your current new stack
    filters.status = 'eq.active';
  }

  return sbMaybeOne(env, 'products', {
    select: 'product_id,name,duration_days,price_minor,currency,status',
    filters
  });
}

async function getUserByEmail(env, email) {
  return sbMaybeOne(env, 'users', {
    select: 'user_id,email,auth_id,forename,surname,name,active,program_id',
    filters: {
      email: `eq.${email}`
    }
  });
}

async function getUserById(env, userId) {
  return sbMaybeOne(env, 'users', {
    select: 'user_id,email,auth_id,forename,surname,name,active,program_id',
    filters: {
      user_id: `eq.${userId}`
    }
  });
}

async function getPaymentByReference(env, reference) {
  return sbMaybeOne(env, 'payments', {
    select: '*',
    filters: {
      reference: `eq.${reference}`
    }
  });
}

async function getSubscriptionByPaymentRef(env, reference) {
  return sbMaybeOne(env, 'subscriptions', {
    select: '*',
    filters: {
      source: 'eq.PAYSTACK',
      source_ref: `eq.${reference}`
    }
  });
}

/* ============================================================
 * ACTIVATION HELPER
 * Rule:
 * - If same payment reference already activated, return it
 * - If same product already ACTIVE and unexpired, extend it
 * - Else create new ACTIVE subscription
 * ============================================================ */

async function activatePaymentForUser(env, payment, user) {
  if (!payment?.reference) {
    throw new Error('activatePaymentForUser: missing payment reference');
  }

  if (!user?.user_id) {
    throw new Error('activatePaymentForUser: missing user');
  }

  // Idempotency 1: if this payment reference already has a subscription, reuse it
  const existingByRef = await getSubscriptionByPaymentRef(env, payment.reference);
  if (existingByRef) {
    await sbPatch(
      env,
      'payments',
      {
        user_id: user.user_id,
        subscription_id: existingByRef.subscription_id,
        status: 'ACTIVATED',
        activated_utc: payment.activated_utc || nowIso()
      },
      { reference: `eq.${payment.reference}` }
    );

    return {
      mode: 'existing_by_ref',
      subscription: existingByRef
    };
  }

  const product = await getProductById(env, payment.product_id, false);
  if (!product) {
    throw new Error('Activation failed: product not found');
  }

  const currentTime = nowIso();

  // Find same-product ACTIVE + unexpired subscription
  const activeSameProduct = await sbMaybeOne(env, 'subscriptions', {
    select: '*',
    filters: {
      user_id: `eq.${user.user_id}`,
      product_id: `eq.${payment.product_id}`,
      status: 'eq.ACTIVE',
      expires_utc: `gt.${currentTime}`
    },
    order: 'expires_utc.desc'
  });

  if (activeSameProduct) {
    const newExpiryIso = addDaysIso(activeSameProduct.expires_utc, product.duration_days);

    const updatedSub = await sbPatch(
      env,
      'subscriptions',
      {
        expires_utc: newExpiryIso,
        status: 'ACTIVE',
        source: 'PAYSTACK',
        source_ref: payment.reference,
        expiry_reminded: false
      },
      { subscription_id: `eq.${activeSameProduct.subscription_id}` }
    );

    await sbPatch(
      env,
      'payments',
      {
        user_id: user.user_id,
        subscription_id: updatedSub.subscription_id,
        status: 'ACTIVATED',
        activated_utc: nowIso()
      },
      { reference: `eq.${payment.reference}` }
    );

    return {
      mode: 'extended',
      subscription: updatedSub
    };
  }

  const startIso = currentTime;
  const expiresIso = addDaysIso(startIso, product.duration_days);

  const newSubscription = await sbInsert(env, 'subscriptions', {
    subscription_id: makeId('SUB'),
    user_id: user.user_id,
    product_id: payment.product_id,
    start_utc: startIso,
    expires_utc: expiresIso,
    status: 'ACTIVE',
    source: 'PAYSTACK',
    source_ref: payment.reference,
    expiry_reminded: false
  });

  await sbPatch(
    env,
    'payments',
    {
      user_id: user.user_id,
      subscription_id: newSubscription.subscription_id,
      status: 'ACTIVATED',
      activated_utc: nowIso()
    },
    { reference: `eq.${payment.reference}` }
  );

  return {
    mode: 'created',
    subscription: newSubscription
  };
}

/* ============================================================
 * ROUTE: POST /payments/init-public
 * Body:
 * {
 *   email: "user@example.com",
 *   product_id: "RN_PREMIUM_30D",
 *   program_id: "RN",
 *   phone_number: "233..."
 * }
 * ============================================================ */

async function handleInitPublic(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json(
      { ok: false, error: 'invalid_json' },
      400,
      corsHeaders(request, env)
    );
  }

  const email = String(body.email || '').trim().toLowerCase();
  const productId = String(body.product_id || '').trim();
  const programId = String(body.program_id || '').trim();
  const phoneNumber = String(body.phone_number || '').trim();

  if (!email || !productId) {
    return json(
      { ok: false, error: 'missing_required_fields', message: 'email and product_id are required' },
      400,
      corsHeaders(request, env)
    );
  }

  const product = await getProductById(env, productId, true);
  if (!product) {
    return json(
      { ok: false, error: 'product_not_found_or_inactive' },
      404,
      corsHeaders(request, env)
    );
  }

  const reference = makeRef('QAC');
  const callbackUrl = new URL('/payment-confirmation.html', env.APP_BASE_URL).toString();

  const paymentRow = await sbInsert(env, 'payments', {
    reference,
    status: 'INIT',
    email,
    user_id: null,
    product_id: product.product_id,
    product_name: product.name,
    amount_minor_expected: product.price_minor,
    currency: product.currency,
    amount_minor_paid: null,
    paid_utc: null,
    activated_utc: null,
    subscription_id: null,
    failure_note: null,
    raw: null,
    setup_token: null,
    setup_created_utc: null,
    setup_completed_utc: null,
    program_id: programId || null,
    phone_number: phoneNumber || null
  });

  try {
    const initPayload = {
      email,
      amount: product.price_minor,
      currency: product.currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        product_id: product.product_id,
        product_name: product.name,
        program_id: programId || null,
        phone_number: phoneNumber || null
      }
    };

    const initResult = await paystackInitialize(env, initPayload);

    await sbPatch(
      env,
      'payments',
      {
        raw: {
          init: initResult
        }
      },
      { reference: `eq.${reference}` }
    );

    return json(
      {
        ok: true,
        reference,
        authorization_url: initResult?.data?.authorization_url || '',
        access_code: initResult?.data?.access_code || '',
        payment: paymentRow
      },
      200,
      corsHeaders(request, env)
    );
  } catch (err) {
    await sbPatch(
      env,
      'payments',
      {
        status: 'FAILED',
        failure_note: err.message || 'Paystack initialize failed'
      },
      { reference: `eq.${reference}` }
    );

    return json(
      {
        ok: false,
        error: 'paystack_init_failed',
        message: err.message || 'Could not initialize payment'
      },
      500,
      corsHeaders(request, env)
    );
  }
}

/* ============================================================
 * ROUTE: GET /payments/verify?reference=QAC_XXXX
 * Behaviour:
 * - If already ACTIVATED, return immediately
 * - If PAID / SETUP_REQUIRED, try local activation first
 * - Else verify with Paystack
 * - If verified and user exists -> activate
 * - If verified and no user exists -> SETUP_REQUIRED
 * ============================================================ */

async function handleVerify(request, env) {
  const url = new URL(request.url);
  const reference = String(url.searchParams.get('reference') || '').trim();

  if (!reference) {
    return json(
      { ok: false, error: 'missing_reference' },
      400,
      corsHeaders(request, env)
    );
  }

  let payment = await getPaymentByReference(env, reference);
  if (!payment) {
    return json(
      { ok: false, error: 'payment_not_found' },
      404,
      corsHeaders(request, env)
    );
  }

  // Fast path: already activated
  if (payment.status === 'ACTIVATED' && payment.subscription_id) {
    return json(
      {
        ok: true,
        status: 'ACTIVATED',
        reference: payment.reference,
        subscription_id: payment.subscription_id,
        requires_setup: false
      },
      200,
      corsHeaders(request, env)
    );
  }

  // Fast path: already paid / setup required -> try local activation first
  if (payment.status === 'PAID' || payment.status === 'SETUP_REQUIRED') {
    const existingUser =
      (payment.user_id && await getUserById(env, payment.user_id)) ||
      await getUserByEmail(env, payment.email);

    if (existingUser) {
      const activation = await activatePaymentForUser(env, payment, existingUser);

      return json(
        {
          ok: true,
          status: 'ACTIVATED',
          reference: payment.reference,
          subscription_id: activation.subscription.subscription_id,
          activation_mode: activation.mode,
          requires_setup: false
        },
        200,
        corsHeaders(request, env)
      );
    }

    // No user yet -> keep / move to SETUP_REQUIRED
    const setupToken = payment.setup_token || makeSetupToken();

    payment = await sbPatch(
      env,
      'payments',
      {
        status: 'SETUP_REQUIRED',
        setup_token: setupToken,
        setup_created_utc: payment.setup_created_utc || nowIso()
      },
      { reference: `eq.${payment.reference}` }
    );

    return json(
      {
        ok: true,
        status: 'SETUP_REQUIRED',
        reference: payment.reference,
        requires_setup: true,
        setup_token: payment.setup_token
      },
      200,
      corsHeaders(request, env)
    );
  }

  // Hard stop if already marked failed
  if (payment.status === 'FAILED') {
    return json(
      {
        ok: false,
        status: 'FAILED',
        reference: payment.reference,
        failure_note: payment.failure_note || 'Payment already marked failed'
      },
      400,
      corsHeaders(request, env)
    );
  }

  // Normal verify path from INIT
  try {
    const verifyResult = await paystackVerify(env, reference);
    const tx = verifyResult?.data || {};

    const gatewayStatus = String(tx.status || '').toLowerCase();
    const amountPaid = Number(tx.amount || 0);
    const paidEmail = String(tx.customer?.email || payment.email || '').trim().toLowerCase();

    // If not yet successful, leave row in INIT and return a soft response
    if (gatewayStatus !== 'success') {
      return json(
        {
          ok: false,
          status: payment.status || 'INIT',
          reference,
          message: `Payment not successful yet. Gateway status: ${gatewayStatus || 'unknown'}`
        },
        409,
        corsHeaders(request, env)
      );
    }

    // Amount mismatch = terminal failure for this reference
    if (amountPaid !== Number(payment.amount_minor_expected || 0)) {
      await sbPatch(
        env,
        'payments',
        {
          status: 'FAILED',
          amount_minor_paid: amountPaid,
          failure_note: `Amount mismatch. Expected ${payment.amount_minor_expected}, got ${amountPaid}`,
          raw: {
            ...(payment.raw || {}),
            verify: verifyResult
          }
        },
        { reference: `eq.${reference}` }
      );

      return json(
        {
          ok: false,
          error: 'amount_mismatch',
          reference
        },
        400,
        corsHeaders(request, env)
      );
    }

    payment = await sbPatch(
      env,
      'payments',
      {
        status: 'PAID',
        email: paidEmail || payment.email,
        amount_minor_paid: amountPaid,
        paid_utc: payment.paid_utc || nowIso(),
        raw: {
          ...(payment.raw || {}),
          verify: verifyResult
        }
      },
      { reference: `eq.${reference}` }
    );

    const existingUser =
      (payment.user_id && await getUserById(env, payment.user_id)) ||
      await getUserByEmail(env, payment.email);

    if (existingUser) {
      const activation = await activatePaymentForUser(env, payment, existingUser);

      return json(
        {
          ok: true,
          status: 'ACTIVATED',
          reference: payment.reference,
          subscription_id: activation.subscription.subscription_id,
          activation_mode: activation.mode,
          requires_setup: false
        },
        200,
        corsHeaders(request, env)
      );
    }

    const setupToken = payment.setup_token || makeSetupToken();

    payment = await sbPatch(
      env,
      'payments',
      {
        status: 'SETUP_REQUIRED',
        setup_token: setupToken,
        setup_created_utc: payment.setup_created_utc || nowIso()
      },
      { reference: `eq.${payment.reference}` }
    );

    return json(
      {
        ok: true,
        status: 'SETUP_REQUIRED',
        reference: payment.reference,
        requires_setup: true,
        setup_token: payment.setup_token
      },
      200,
      corsHeaders(request, env)
    );
  } catch (err) {
    await sbPatch(
      env,
      'payments',
      {
        failure_note: err.message || 'Verify failed'
      },
      { reference: `eq.${reference}` }
    );

    return json(
      {
        ok: false,
        error: 'verify_failed',
        message: err.message || 'Could not verify payment'
      },
      500,
      corsHeaders(request, env)
    );
  }
}
