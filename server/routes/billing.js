const express = require('express');
const router = express.Router();
const db = require('../db');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  pro_monthly:  process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:   process.env.STRIPE_PRICE_PRO_ANNUAL,
  team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY,
  team_annual:  process.env.STRIPE_PRICE_TEAM_ANNUAL,
};

const PLAN_FROM_PRICE = Object.entries(PRICES).reduce((m, [k, v]) => {
  if (v) m[v] = k.split('_')[0]; // pro_monthly → pro
  return m;
}, {});

function requireKey(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const key = authHeader.replace('Bearer ', '').trim() || req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'authentication required' });

  const row = db.prepare(
    `SELECT k.*, u.id as user_id, u.username, u.plan, u.email,
            u.stripe_customer_id, u.stripe_subscription_id,
            u.subscription_status, u.subscription_period_end
     FROM api_keys k LEFT JOIN users u ON k.user_id = u.id
     WHERE k.key = ? AND k.revoked = 0`
  ).get(key);

  if (!row) return res.status(401).json({ error: 'invalid api key' });
  if (!row.user_id) return res.status(403).json({ error: 'a user account is required — sign in via /dashboard' });
  req.apiKey = row;
  next();
}

function getBaseUrl(req) {
  return process.env.BASE_URL || `${req.protocol}://${req.headers.host}`;
}

// ─── GET /api/billing/plans ─── public, returns prices
router.get('/plans', (req, res) => {
  res.json({
    pro: {
      monthly: { price_id: PRICES.pro_monthly, amount: 1200, currency: 'usd' },
      annual:  { price_id: PRICES.pro_annual,  amount: 10000, currency: 'usd', savings: '17%' },
    },
    team: {
      monthly: { price_id: PRICES.team_monthly, amount: 4800, currency: 'usd' },
      annual:  { price_id: PRICES.team_annual,  amount: 40000, currency: 'usd', savings: '17%' },
    },
  });
});

// ─── POST /api/billing/checkout ─── create Stripe Checkout Session
router.post('/checkout', requireKey, async (req, res) => {
  const { plan, interval = 'monthly' } = req.body;

  if (!['pro', 'team'].includes(plan)) {
    return res.status(400).json({ error: 'plan must be "pro" or "team"' });
  }
  if (!['monthly', 'annual'].includes(interval)) {
    return res.status(400).json({ error: 'interval must be "monthly" or "annual"' });
  }

  const priceKey = `${plan}_${interval}`;
  const priceId = PRICES[priceKey];
  if (!priceId) return res.status(500).json({ error: 'price not configured' });

  const user = req.apiKey;
  const baseUrl = getBaseUrl(req);

  // Ensure Stripe customer exists
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.username,
      metadata: { user_id: String(user.user_id), username: user.username },
    });
    customerId = customer.id;
    db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, user.user_id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing?upgrade=cancelled`,
    subscription_data: {
      metadata: { user_id: String(user.user_id), username: user.username, plan, interval },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  res.json({ url: session.url, session_id: session.id });
});

// ─── POST /api/billing/portal ─── Stripe Customer Portal
router.post('/portal', requireKey, async (req, res) => {
  const user = req.apiKey;
  if (!user.stripe_customer_id) {
    return res.status(400).json({ error: 'no billing account — subscribe first' });
  }

  const baseUrl = getBaseUrl(req);
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${baseUrl}/dashboard`,
  });

  res.json({ url: session.url });
});

// ─── GET /api/billing/status ─── current subscription status
router.get('/status', requireKey, async (req, res) => {
  const user = req.apiKey;

  if (!user.stripe_subscription_id) {
    return res.json({
      plan: user.plan || 'free',
      status: 'free',
      subscription: null,
    });
  }

  const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
  const plan = PLAN_FROM_PRICE[sub.items.data[0]?.price?.id] || 'pro';

  res.json({
    plan,
    status: sub.status,
    subscription: {
      id: sub.id,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      price_id: sub.items.data[0]?.price?.id,
    },
  });
});

// ─── Webhook handler (exported separately — needs raw body) ───
function webhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No webhook secret yet (pre-domain setup) — parse raw body
      event = JSON.parse(req.body.toString());
      console.warn('[webhook] no signature verification — set STRIPE_WEBHOOK_SECRET');
    }
  } catch (err) {
    console.error('[webhook] signature error:', err.message);
    return res.status(400).json({ error: 'webhook signature invalid' });
  }

  handleWebhookEvent(event).catch(e => console.error('[webhook] handler error:', e.message));
  res.json({ received: true });
}

async function handleWebhookEvent(event) {
  const { type, data } = event;
  console.log('[webhook]', type);

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object;
      if (session.mode !== 'subscription') break;
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      await syncSubscription(sub, session.customer);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      await syncSubscription(data.object, data.object.customer);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = data.object;
      const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(sub.customer);
      if (user) {
        db.prepare(
          `UPDATE users SET plan = 'free', stripe_subscription_id = NULL,
           subscription_status = 'cancelled', subscription_period_end = NULL WHERE id = ?`
        ).run(user.id);
        console.log('[webhook] downgraded user', user.username, 'to free');
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = data.object;
      const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(invoice.customer);
      if (user) {
        db.prepare("UPDATE users SET subscription_status = 'past_due' WHERE id = ?").run(user.id);
        console.log('[webhook] payment failed for', user.username);
      }
      break;
    }
  }
}

async function syncSubscription(sub, customerId) {
  const priceId = sub.items.data[0]?.price?.id;
  const plan = PLAN_FROM_PRICE[priceId] || sub.metadata?.plan || 'pro';
  const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);

  if (!user) {
    console.warn('[webhook] no user found for customer', customerId);
    return;
  }

  db.prepare(
    `UPDATE users SET
       plan = ?,
       stripe_subscription_id = ?,
       stripe_price_id = ?,
       subscription_status = ?,
       subscription_period_end = ?
     WHERE id = ?`
  ).run(
    sub.status === 'active' || sub.status === 'trialing' ? plan : 'free',
    sub.id,
    priceId,
    sub.status,
    sub.current_period_end,
    user.id
  );
  console.log('[webhook] synced user', user.username, '→', plan, sub.status);
}

module.exports = { router, webhook };
