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
const multer = require('multer');
const { extractDocxText } = require('./resume/docx');
const { parseResumeToProfile } = require('./resume/parseProfile');
const app = express();
const port = Number(process.env.PORT || 3000);

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
  });
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (req, file, cb) => {
    const name = String(file && file.originalname ? file.originalname : '').toLowerCase();
    if (!name.endsWith('.docx')) return cb(new Error('Only .docx files are supported'));
    cb(null, true);
  },
});

app.post('/api/resume/parse', upload.single('resume'), async (req, res) => {
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

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
