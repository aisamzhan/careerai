const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = __dirname;

const KB_FILES = {
  industriesAndProfessions: 'kz_market_1_industries_and_professions.md',
  skills: 'kz_market_2_skills_requirements.md',
  salariesAndPaths: 'kz_market_3_salaries_and_career_paths.md',
};

function readUtf8(fileName) {
  return fs.readFileSync(path.join(KNOWLEDGE_DIR, fileName), 'utf8');
}

function slugifyId(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[/]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeWhitespace(s) {
  return String(s || '').replace(/\r\n/g, '\n');
}

function extractLastUpdated(md) {
  const m = md.match(/^\s*Last updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*$/m);
  return m ? m[1] : null;
}

function extractIndustries(md) {
  const industries = [];
  const re = /^###\s+Industry:\s+(.+)\s*$/gm;
  let m;
  while ((m = re.exec(md)) !== null) industries.push(m[1].trim());
  return industries;
}

function extractProfessionsWithMeta(md) {
  // Extract profession blocks in KB1:
  // ### Profession: X
  // - Demand level: Y
  // - Description: Z
  const results = [];

  const lines = normalizeWhitespace(md).split('\n');
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const m = line.match(/^###\s+Profession:\s+(.+)\s*$/);
    if (m) {
      if (current) results.push(current);
      current = { name: m[1].trim(), demandLevel: null, description: null };
      continue;
    }

    if (!current) continue;
    if (line.startsWith('### ')) {
      // new heading (industry etc.)
      continue;
    }

    const demand = line.match(/^-+\s*Demand level:\s*(.+)\s*$/i);
    if (demand) current.demandLevel = demand[1].trim();
    const desc = line.match(/^-+\s*Description:\s*(.+)\s*$/i);
    if (desc) current.description = desc[1].trim();
  }

  if (current) results.push(current);
  return results;
}

function extractSkills(md) {
  // KB2 format:
  // ### Profession: X
  // #### Must-have
  // - item
  // #### Nice-to-have
  // - item
  // OR legacy:
  // #### Required skills
  // - item
  const byProfession = new Map();

  const lines = normalizeWhitespace(md).split('\n');
  let profession = null;
  let section = null; // must | nice | required

  function ensure(name) {
    if (!byProfession.has(name)) byProfession.set(name, { must: [], nice: [], required: [] });
    return byProfession.get(name);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const p = line.match(/^###\s+Profession:\s+(.+)\s*$/);
    if (p) {
      profession = p[1].trim();
      section = null;
      ensure(profession);
      continue;
    }

    if (!profession) continue;

    const h = line.match(/^####\s+(.+)\s*$/);
    if (h) {
      const t = h[1].toLowerCase();
      if (t.includes('must')) section = 'must';
      else if (t.includes('nice')) section = 'nice';
      else if (t.includes('required')) section = 'required';
      else section = null;
      continue;
    }

    const b = line.match(/^-+\s+(.+)\s*$/);
    if (b && section) {
      const skill = b[1].trim();
      if (!skill) continue;
      const obj = ensure(profession);
      obj[section].push(skill);
    }
  }

  return byProfession;
}

function parseMoneyToken(token) {
  // Supports: "250k", "1M", "1.2M", "700k+", "2M+"
  const t = String(token || '').trim().replace(/\s+/g, '');
  const plus = t.endsWith('+');
  const clean = plus ? t.slice(0, -1) : t;

  const m = clean.match(/^([0-9]+(?:\.[0-9]+)?)\s*([kKmM])?$/);
  if (!m) return null;
  const num = Number(m[1]);
  if (!Number.isFinite(num)) return null;
  const unit = (m[2] || '').toLowerCase();
  const mult = unit === 'm' ? 1_000_000 : unit === 'k' ? 1_000 : 1;
  return { value: Math.round(num * mult), plus };
}

function parseSalaryRange(text) {
  // Supports: "250k – 350k KZT", "1.5M+ KZT", "700k+ KZT"
  const s = String(text || '')
    .replace(/KZT/gi, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  // single token with + (e.g. "1.5M+")
  const single = s.match(/^([0-9][0-9.\s]*[kKmM]?\+?)$/);
  if (single) {
    const tok = parseMoneyToken(single[1].replace(/\s+/g, ''));
    if (!tok) return null;
    return { min: tok.value, max: tok.value, plus: tok.plus, text: `${single[1].trim()} KZT` };
  }

  const parts = s.split('-').map((x) => x.trim()).filter(Boolean);
  if (parts.length !== 2) return null;

  const a = parseMoneyToken(parts[0].replace(/\s+/g, ''));
  const b = parseMoneyToken(parts[1].replace(/\s+/g, ''));
  if (!a || !b) return null;

  return {
    min: a.value,
    max: b.value,
    plus: Boolean(b.plus),
    text: `${parts[0]} - ${parts[1]} KZT`,
  };
}

function extractSalariesAndNotes(md) {
  // KB3 format (per profession):
  // ### Profession: X
  // - Junior: 250k – 350k KZT
  // - Middle: ...
  // - Senior: ...
  // - Market reality: ...
  // - Notes: ...
  const byProfession = new Map();
  const lines = normalizeWhitespace(md).split('\n');
  let profession = null;

  function ensure(name) {
    if (!byProfession.has(name)) {
      byProfession.set(name, {
        salary: { entry: null, mid: null, senior: null },
        marketNotes: [],
        careerPaths: [],
      });
    }
    return byProfession.get(name);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const p = line.match(/^###\s+Profession:\s+(.+)\s*$/);
    if (p) {
      profession = p[1].trim();
      ensure(profession);
      continue;
    }
    if (!profession) continue;

    const bullet = line.match(/^-+\s+(.+)\s*$/);
    if (!bullet) continue;
    const content = bullet[1].trim();
    const obj = ensure(profession);

    const junior = content.match(/^(Junior|Entry level):\s*(.+)$/i);
    if (junior) {
      obj.salary.entry = parseSalaryRange(junior[2].trim());
      continue;
    }
    const middle = content.match(/^(Middle|Mid level):\s*(.+)$/i);
    if (middle) {
      obj.salary.mid = parseSalaryRange(middle[2].trim());
      continue;
    }
    const senior = content.match(/^Senior:\s*(.+)$/i);
    if (senior) {
      obj.salary.senior = parseSalaryRange(senior[1].trim());
      continue;
    }

    const note = content.match(/^(Market reality|Notes):\s*(.+)$/i);
    if (note) {
      obj.marketNotes.push(note[2].trim());
      continue;
    }

    // If we see "Career Paths:" then the next bullets might be paths in some KB formats.
    if (/^Career Paths:/i.test(content)) continue;
  }

  return byProfession;
}

function loadKzMarketFromMarkdown() {
  const md1 = normalizeWhitespace(readUtf8(KB_FILES.industriesAndProfessions));
  const md2 = normalizeWhitespace(readUtf8(KB_FILES.skills));
  const md3 = normalizeWhitespace(readUtf8(KB_FILES.salariesAndPaths));

  const lastUpdated =
    extractLastUpdated(md1) || extractLastUpdated(md2) || extractLastUpdated(md3) || null;

  const industries = extractIndustries(md1).map((name) => ({
    id: slugifyId(name),
    name,
  }));

  const profMeta = extractProfessionsWithMeta(md1);
  const skills = extractSkills(md2); // Map
  const salaries = extractSalariesAndNotes(md3); // Map

  const allProfessionNames = new Set([
    ...profMeta.map((p) => p.name),
    ...Array.from(skills.keys()),
    ...Array.from(salaries.keys()),
  ]);

  const professions = [];
  for (const name of Array.from(allProfessionNames)) {
    const meta = profMeta.find((p) => p.name === name) || { demandLevel: null, description: null };
    const s = skills.get(name) || { must: [], nice: [], required: [] };
    const sal = salaries.get(name) || { salary: { entry: null, mid: null, senior: null }, marketNotes: [] };

    // Prefer "must" list; if not present, fall back to legacy "required".
    const required = s.must.length ? s.must : s.required;
    const niceToHave = s.nice;

    professions.push({
      id: slugifyId(name),
      name,
      demandLevel: meta.demandLevel || null,
      description: meta.description || null,
      requiredSkills: required,
      niceToHaveSkills: niceToHave,
      salaryRangesKZT: {
        entry: sal.salary.entry || null,
        mid: sal.salary.mid || null,
        senior: sal.salary.senior || null,
      },
      marketNotes: sal.marketNotes || [],
    });
  }

  professions.sort((a, b) => a.name.localeCompare(b.name));

  return {
    lastUpdated: lastUpdated || new Date().toISOString().slice(0, 10),
    source: 'Derived from backend/knowledge markdown files (KB is source of truth).',
    industries,
    professions,
  };
}

let _cache = null;
let _cacheAtMs = 0;

function getKzMarketFromKB({ maxAgeMs = 60_000 } = {}) {
  const now = Date.now();
  if (_cache && now - _cacheAtMs <= maxAgeMs) return _cache;
  _cache = loadKzMarketFromMarkdown();
  _cacheAtMs = now;
  return _cache;
}

module.exports = {
  KB_FILES,
  getKzMarketFromKB,
  slugifyId,
};

