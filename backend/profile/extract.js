const { kzMarket } = require('../market/kzMarketFacts');

function normalizeToSearchText(value) {
  const str = Array.isArray(value) ? value.join(' ') : String(value || '');
  const normalized = str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ` ${normalized} `;
}

function uniqCaseInsensitive(items) {
  const seen = new Set();
  const out = [];
  for (const raw of items || []) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

const TOOL_HINTS = [
  'Git',
  'GitHub',
  'GitLab',
  'Excel',
  'Power BI',
  'Data visualization tools',
  'Tableau',
  '1C',
  '1С',
  'Figma',
  'SAP',
  'CRM systems',
  'ERP systems',
];

const SOFT_SKILLS = [
  { label: 'Communication', terms: ['communication', 'коммуника', 'общение'] },
  { label: 'Teamwork', terms: ['teamwork', 'команд', 'team'] },
  { label: 'Problem Solving', terms: ['problem solving', 'решение задач', 'решать', 'аналит'] },
  { label: 'Time Management', terms: ['time management', 'тайм', 'дедлайн', 'срок'] },
  { label: 'Adaptability', terms: ['adaptability', 'адаптив', 'адаптац', 'быстро уч'] },
];

function extractFromText(text) {
  const searchText = normalizeToSearchText(text);

  const foundLabels = [];
  for (const p of kzMarket.professions) {
    for (const g of p.requiredSkillGroups || []) {
      const label = String(g.label || '').trim();
      if (!label) continue;
      const terms = Array.isArray(g.anyOf) ? g.anyOf : [];
      let ok = false;
      for (const t of terms) {
        const term = normalizeToSearchText(t).trim();
        if (!term) continue;
        if (searchText.includes(` ${term} `)) {
          ok = true;
          break;
        }
      }
      if (ok) foundLabels.push(label);
    }
  }

  const foundSoft = [];
  for (const s of SOFT_SKILLS) {
    for (const t of s.terms) {
      const term = normalizeToSearchText(t).trim();
      if (term && searchText.includes(` ${term} `)) {
        foundSoft.push(s.label);
        break;
      }
    }
  }

  const tools = [];
  const technical = [];
  const toolNeedle = new Set(TOOL_HINTS.map((t) => t.toLowerCase()));
  for (const label of uniqCaseInsensitive(foundLabels)) {
    if (toolNeedle.has(label.toLowerCase())) tools.push(label);
    else technical.push(label);
  }

  // Small de-duplication: if "SQL" is present, avoid adding the broad "Databases (SQL / NoSQL)" label.
  const techLower = new Set(technical.map((s) => s.toLowerCase()));
  const technicalDeduped = techLower.has('sql')
    ? technical.filter((s) => s.toLowerCase() !== 'databases (sql / nosql)')
    : technical;

  return {
    technicalSkills: uniqCaseInsensitive(technicalDeduped),
    toolsSkills: uniqCaseInsensitive(tools),
    softSkills: uniqCaseInsensitive(foundSoft),
  };
}

function parseCommaList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCsv(items) {
  return (items || []).join(', ');
}

function mergeExtracted({ extracted, existing }) {
  const ex = existing || {};
  const merged = {
    technicalSkills: uniqCaseInsensitive([
      ...parseCommaList(ex.technicalSkills),
      ...(extracted.technicalSkills || []),
    ]),
    toolsSkills: uniqCaseInsensitive([...parseCommaList(ex.toolsSkills), ...(extracted.toolsSkills || [])]),
    softSkills: uniqCaseInsensitive([...parseCommaList(ex.softSkills), ...(extracted.softSkills || [])]),
  };
  return {
    ...merged,
    technicalSkillsCsv: toCsv(merged.technicalSkills),
    toolsSkillsCsv: toCsv(merged.toolsSkills),
    softSkillsCsv: toCsv(merged.softSkills),
  };
}

module.exports = { extractFromText, mergeExtracted };
