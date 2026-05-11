const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');
const { getKnowledgeStatus, searchKnowledge } = require('./knowledge/search');
const { kzMarket } = require('./market/kzMarketFacts');
const { assessCandidate } = require('./market/assess');
const { careerChat } = require('./ai/careerChat');
const { extractFromText, mergeExtracted } = require('./profile/extract');
const { appendJsonl } = require('./feedback/store');
const {
  initAuthDb,
  findUserByEmail,
  createUser,
  listUsers,
  getActiveSubscriptionByUserId,
  upsertSubscription,
  createPaymentRequest,
  listPaymentRequests,
  updatePaymentRequestStatus,
  getPaymentReceiptById,
  appendAdminAudit,
  listAdminAudit,
} = require('./auth/db');
const { hashPassword, verifyPassword } = require('./auth/password');
const { createAuthToken, verifyAuthToken, isAdminEmail } = require('./auth/token');
const multer = require('multer');
const { extractDocxText } = require('./resume/docx');
const { parseResumeToProfile } = require('./resume/parseProfile');
const app = express();
const port = Number(process.env.PORT || 3000);

function getBearerToken(req) {
  const h = String(req.headers.authorization || '').trim();
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function requireAuth(req, res) {
  const token = getBearerToken(req);
  const payload = token ? verifyAuthToken(token) : null;
  if (!payload || !payload.userId || !payload.email) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return payload;
}

async function requirePro(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return null;

  try {
    const user = await findUserByEmail(String(payload.email || '').toLowerCase());
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }

    const sub = await getActiveSubscriptionByUserId(user.id);
    const now = Date.now();
    const end = sub && sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;

    const isActive = Boolean(sub && sub.status === 'active' && end > now);
    if (!isActive) {
      res.status(402).json({
        error: 'Subscription required',
        requiredPlan: 'pro',
        priceKzt: 990,
        periodDays: 30,
      });
      return null;
    }

    return { payload, user, subscription: sub };
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
    return null;
  }
}

// Very small in-memory rate limiting (MVP). For production scale, move to Redis.
const aiRateState = new Map(); // userId -> { minuteStartMs, minuteCount, dayKey, dayCount }

function getDayKeyNow() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function checkAiRateLimit(userId) {
  const perMin = Number(process.env.AI_RATE_LIMIT_PER_MIN || 12);
  const perDay = Number(process.env.AI_RATE_LIMIT_PER_DAY || 120);
  const now = Date.now();

  const key = String(userId || '');
  if (!key) return { ok: true };

  const state = aiRateState.get(key) || {
    minuteStartMs: now,
    minuteCount: 0,
    dayKey: getDayKeyNow(),
    dayCount: 0,
  };

  // minute window
  if (now - state.minuteStartMs >= 60_000) {
    state.minuteStartMs = now;
    state.minuteCount = 0;
  }

  // day window
  const dk = getDayKeyNow();
  if (state.dayKey !== dk) {
    state.dayKey = dk;
    state.dayCount = 0;
  }

  if (state.minuteCount >= perMin) {
    aiRateState.set(key, state);
    return { ok: false, kind: 'minute', limit: perMin };
  }
  if (state.dayCount >= perDay) {
    aiRateState.set(key, state);
    return { ok: false, kind: 'day', limit: perDay };
  }

  state.minuteCount += 1;
  state.dayCount += 1;
  aiRateState.set(key, state);
  return { ok: true };
}

function buildCorsOptions() {
  const raw = String(process.env.CORS_ORIGIN || '').trim();
  if (!raw) return null; // allow all (development / simplest)

  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!allowed.length) return null;

  return {
    origin: (origin, cb) => {
      // Allow server-to-server / curl requests with no Origin.
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked for this origin'));
    },
  };
}

const corsOptions = buildCorsOptions();
app.use(corsOptions ? cors(corsOptions) : cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (req, file, cb) => {
    const name = String(file && file.originalname ? file.originalname : '').toLowerCase();
    if (!name.endsWith('.docx')) return cb(new Error('Only .docx files are supported'));
    cb(null, true);
  },
});

const uploadReceipt = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB screenshot limit
  fileFilter: (req, file, cb) => {
    const type = String(file && file.mimetype ? file.mimetype : '').toLowerCase();
    if (!type.startsWith('image/')) return cb(new Error('Only image files are supported for receipt'));
    cb(null, true);
  },
});

// Return JSON errors for JSON parse failures (instead of HTML).
app.use((err, req, res, next) => {
  if (!err) return next();
  const status = err.statusCode || err.status || 400;
  res.status(status).json({ error: String(err && err.message ? err.message : err) });
});

app.get('/', (req, res) => {
  res.send('Hello from CareerAI Backend!');
});

app.get('/api/test', (req, res) => {
  res.json({ message: "CareerAI API is working" });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    hasDatabaseUrl: !!String(process.env.DATABASE_URL || '').trim(),
  });
});

app.post('/api/auth/register', async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const university = String(body.university || '').trim();
  const password = String(body.password || '');

  if (!name || !email || !university || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'User with this email already exists' });

    const passwordHash = hashPassword(password);
    const user = await createUser({ name, email, university, passwordHash });
    const token = createAuthToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        university: user.university,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createAuthToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        university: user.university,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const user = await findUserByEmail(String(payload.email || '').toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        university: user.university,
        createdAt: user.created_at,
      },
      isAdmin: isAdminEmail(user.email),
    });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/admin/users', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (!isAdminEmail(payload.email)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const users = await listUsers({ limit: Number(req.query.limit || 200) });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/billing/status', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const user = await findUserByEmail(String(payload.email || '').toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sub = await getActiveSubscriptionByUserId(user.id);
    res.json({
      priceKzt: 990,
      periodDays: 30,
      subscription: sub
        ? {
            status: sub.status,
            planCode: sub.plan_code,
            currentPeriodEnd: sub.current_period_end,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/billing/request', uploadReceipt.single('receipt'), async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const body = req.body || {};
  const transactionId = String(body.transactionId || '').trim();
  const payerAccount = String(body.payerAccount || '').trim();
  if (!transactionId) return res.status(400).json({ error: 'Missing field: transactionId' });
  if (!payerAccount) return res.status(400).json({ error: 'Missing field: payerAccount' });
  if (!req.file) return res.status(400).json({ error: 'Missing form-data file field: receipt (image)' });

  // Prevent overly long / garbage values
  if (transactionId.length < 4 || transactionId.length > 80) {
    return res.status(400).json({ error: 'Invalid transactionId' });
  }
  if (payerAccount.length < 6 || payerAccount.length > 32) {
    return res.status(400).json({ error: 'Invalid payerAccount' });
  }

  try {
    const user = await findUserByEmail(String(payload.email || '').toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notes = body.notes ? String(body.notes) : '';
    const receiptMime = String(req.file.mimetype || 'image/png');
    const receiptBase64 = Buffer.from(req.file.buffer).toString('base64');
    const pr = await createPaymentRequest({
      userId: user.id,
      amountKzt: 990,
      transactionId,
      payerAccount,
      receiptMime,
      receiptBase64,
      notes,
    });

    res.json({ ok: true, request: pr });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'This transactionId was already submitted' });
    }
    res.status(500).json({ error: msg });
  }
});

app.get('/api/admin/payment-requests', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (!isAdminEmail(payload.email)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const status = req.query.status ? String(req.query.status) : null;
    const list = await listPaymentRequests({ limit: Number(req.query.limit || 200), status });
    res.json({ requests: list });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/admin/payment-requests/:id/approve', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (!isAdminEmail(payload.email)) return res.status(403).json({ error: 'Forbidden' });

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing payment request id' });

  try {
    const pr = await updatePaymentRequestStatus({ id, status: 'approved' });
    if (!pr) return res.status(404).json({ error: 'Payment request not found' });

    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const sub = await upsertSubscription({
      userId: pr.user_id,
      status: 'active',
      planCode: 'pro',
      currentPeriodEndIso: end,
    });

    await appendAdminAudit({
      adminEmail: payload.email,
      action: 'approve_payment_request',
      entityType: 'payment_request',
      entityId: pr.id,
      meta: {
        userId: pr.user_id,
        amountKzt: pr.amount_kzt,
        transactionId: pr.transaction_id,
        newPeriodEnd: end,
      },
    });

    res.json({ ok: true, subscription: sub, request: pr });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/admin/audit', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (!isAdminEmail(payload.email)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const list = await listAdminAudit({ limit: Number(req.query.limit || 200) });
    res.json({ audit: list });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/admin/payment-requests/:id/receipt', async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (!isAdminEmail(payload.email)) return res.status(403).json({ error: 'Forbidden' });

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing payment request id' });

  try {
    const r = await getPaymentReceiptById(id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (!r.receipt_base64) return res.status(404).json({ error: 'No receipt' });
    const mime = String(r.receipt_mime || 'image/png');
    const buf = Buffer.from(String(r.receipt_base64), 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/knowledge/status', (req, res) => {
  try {
    res.json({ files: getKnowledgeStatus() });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/knowledge/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query param: q' });

  try {
    const results = searchKnowledge(q, { limit: 6 });
    res.json({ query: q, results });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/market/professions', (req, res) => {
  res.json({
    lastUpdated: kzMarket.lastUpdated,
    source: kzMarket.source,
    professions: kzMarket.professions.map((p) => ({
      id: p.id,
      name: p.name,
      demandLevel: p.demandLevel,
      description: p.description,
      requiredSkills: p.requiredSkillGroups.map((g) => g.label),
      salaryRangesKZT: p.salaryRangesKZT,
      marketNotes: p.marketNotes || [],
    })),
  });
});

app.get('/api/market/industries', (req, res) => {
  res.json({
    lastUpdated: kzMarket.lastUpdated,
    source: kzMarket.source,
    industries: kzMarket.industries,
  });
});

app.post('/api/career-assessment', (req, res) => {
  try {
    const result = assessCandidate(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/ai/status', (req, res) => {
  const defaultModel = 'gpt-4o-mini';
  res.json({
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || defaultModel,
    modelFromEnv: process.env.OPENAI_MODEL || null,
    defaultModel,
    envFile: {
      expectedPath: path.join(__dirname, '.env'),
      exists: require('fs').existsSync(path.join(__dirname, '.env')),
    },
  });
});

app.post('/api/ai/chat', async (req, res) => {
  const pro = await requirePro(req, res);
  if (!pro) return;

  const rl = checkAiRateLimit(pro.user.id);
  if (!rl.ok) {
    return res.status(429).json({
      error: `Rate limit exceeded (${rl.kind}).`,
      limit: rl.limit,
    });
  }
  const body = req.body || {};
  const message = String(body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Missing body field: message' });

  try {
    const result = await careerChat({
      message,
      profile: body.profile || {},
      goals: body.goals || {},
      mode: body.mode || null,
      vacancyText: body.vacancyText || null,
      preferredLanguage: body.preferredLanguage || null,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/profile/extract', (req, res) => {
  const body = req.body || {};
  const text = String(body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Missing body field: text' });

  try {
    const extracted = extractFromText(text);
    const merged = mergeExtracted({ extracted, existing: body.existing || {} });
    res.json({ extracted, merged });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/feedback', (req, res) => {
  const body = req.body || {};
  const kind = String(body.kind || '').trim() || 'unknown';
  const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null;

  try {
    const entry = {
      ts: new Date().toISOString(),
      kind,
      rating,
      comment: body.comment ? String(body.comment).slice(0, 2000) : '',
      message: body.message ? String(body.message).slice(0, 4000) : '',
      answer: body.answer ? String(body.answer).slice(0, 8000) : '',
      // Keep a minimal snapshot for debugging quality, avoid storing full PII.
      meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
    };

    appendJsonl(path.join(__dirname, 'data', 'feedback.jsonl'), entry);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/resume/parse', upload.single('resume'), async (req, res) => {
  const pro = await requirePro(req, res);
  if (!pro) return;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Missing form-data file field: resume (.docx)' });

  try {
    const { text, warnings } = await extractDocxText(file.buffer);
    const existing = req.body && req.body.existing ? JSON.parse(String(req.body.existing)) : {};
    const parsed = await parseResumeToProfile(text, existing);

    res.json({
      fileName: file.originalname,
      extractedTextChars: text.length,
      ...(process.env.RESUME_DEBUG_PREVIEW === '1' ? { extractedTextPreview: text.slice(0, 800) } : {}),
      warnings,
      ...parsed,
    });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/career-advice', (req, res) => {
  res.json({ advice: "Focus on building strong projects and improving your portfolio." });
});

// Final error handler (e.g., multer errors). Must be after routes.
app.use((err, req, res, next) => {
  if (!err) return next();
  const msg = String(err && err.message ? err.message : err);
  // Multer uses 413 semantics for file too large, but we return 400/413 as JSON.
  const status = msg.toLowerCase().includes('file too large') ? 413 : 400;
  res.status(status).json({ error: msg });
});

initAuthDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize auth database:', err);
    process.exit(1);
  });
