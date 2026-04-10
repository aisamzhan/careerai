const { getOpenAIClient } = require('../ai/openaiClient');
const { extractFromText, mergeExtracted } = require('../profile/extract');

function toCsv(items) {
  return Array.isArray(items) ? items.filter(Boolean).join(', ') : '';
}

function safeStr(v, max = 2000) {
  return String(v || '').trim().slice(0, max);
}

function safeInt(v) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizeLevel(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const up = s.toUpperCase();
  if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(up)) return up;
  const low = s.toLowerCase();
  if (['basic', 'beginner'].includes(low)) return 'A2';
  if (['intermediate'].includes(low)) return 'B1';
  if (['upper-intermediate'].includes(low)) return 'B2';
  if (['advanced', 'fluent', 'native'].includes(low)) return 'C1';
  return s.slice(0, 16);
}

function resumeSchema() {
  // Keep schema simple; strict mode supports a subset of JSON Schema.
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      city: { type: 'string' },
      englishLevel: { type: 'string' },
      kazakhLevel: { type: 'string' },
      russianLevel: { type: 'string' },
      experienceMonths: { type: 'integer', minimum: 0 },
      projectCount: { type: 'integer', minimum: 0 },
      technicalSkills: { type: 'array', items: { type: 'string' } },
      toolsSkills: { type: 'array', items: { type: 'string' } },
      softSkills: { type: 'array', items: { type: 'string' } },
      experienceText: { type: 'string' },
      notes: { type: 'array', items: { type: 'string' } },
      missingFields: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'city',
      'englishLevel',
      'kazakhLevel',
      'russianLevel',
      'experienceMonths',
      'projectCount',
      'technicalSkills',
      'toolsSkills',
      'softSkills',
      'experienceText',
      'notes',
      'missingFields',
    ],
  };
}

function systemPrompt() {
  return [
    'You are CareerAI. Extract a student resume into a compact profile JSON for a Kazakhstan career app.',
    '',
    'Rules:',
    '- Output MUST match the JSON schema exactly.',
    '- Do NOT invent facts. If something is not in the resume text, leave it empty ("") or 0 or [] and add it to missingFields.',
    '- Ignore irrelevant sections (references, long summaries, hobbies) unless they contain skills/experience.',
    '- Keep experienceText short (max ~6 lines).',
    '',
    'Field guidance:',
    '- city: current city if present.',
    '- language levels: if CEFR is present use A1-C2. If not present, leave empty.',
    '- experienceMonths: total professional/internship experience in months if explicit; otherwise 0.',
    '- projectCount: count of projects if explicit; otherwise 0.',
    '- technicalSkills/toolsSkills/softSkills: extract as clean skill names (no sentences).',
  ].join('\n');
}

async function parseResumeToProfileAI(resumeText) {
  const client = await getOpenAIClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await client.responses.create({
    model,
    temperature: 0.1,
    max_output_tokens: 600,
    text: {
      format: {
        type: 'json_schema',
        name: 'resume_profile_v1',
        schema: resumeSchema(),
        strict: true,
      },
      // gpt-4o-mini currently supports only 'medium' verbosity (or omit).
      verbosity: 'medium',
    },
    input: [
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: resumeText.slice(0, 24_000) },
    ],
  });

  let obj = null;
  if (response && response.output_text) {
    obj = JSON.parse(response.output_text);
  }

  if (!obj || typeof obj !== 'object') throw new Error('Failed to parse resume JSON');

  const profile = {
    city: safeStr(obj.city, 120),
    englishLevel: normalizeLevel(obj.englishLevel),
    kazakhLevel: normalizeLevel(obj.kazakhLevel),
    russianLevel: normalizeLevel(obj.russianLevel),
    experienceMonths: safeInt(obj.experienceMonths),
    projectCount: safeInt(obj.projectCount),
    technicalSkills: Array.isArray(obj.technicalSkills) ? obj.technicalSkills.map((s) => safeStr(s, 60)) : [],
    toolsSkills: Array.isArray(obj.toolsSkills) ? obj.toolsSkills.map((s) => safeStr(s, 60)) : [],
    softSkills: Array.isArray(obj.softSkills) ? obj.softSkills.map((s) => safeStr(s, 60)) : [],
    experienceText: safeStr(obj.experienceText, 1200),
  };

  const notes = Array.isArray(obj.notes) ? obj.notes.map((s) => safeStr(s, 200)) : [];
  const missingFields = Array.isArray(obj.missingFields)
    ? obj.missingFields.map((s) => safeStr(s, 40))
    : [];

  return {
    profile,
    notes,
    missingFields,
    // Convenience strings for the existing textarea fields
    profileCsv: {
      technicalSkills: toCsv(profile.technicalSkills),
      toolsSkills: toCsv(profile.toolsSkills),
      softSkills: toCsv(profile.softSkills),
    },
    model,
  };
}

function parseResumeToProfileFallback(resumeText, existing = {}) {
  const extracted = extractFromText(resumeText);
  const merged = mergeExtracted({ extracted, existing });

  return {
    profile: {
      city: '',
      englishLevel: '',
      kazakhLevel: '',
      russianLevel: '',
      experienceMonths: 0,
      projectCount: 0,
      technicalSkills: merged.technicalSkills || [],
      toolsSkills: merged.toolsSkills || [],
      softSkills: merged.softSkills || [],
      experienceText: safeStr(resumeText, 1200),
    },
    notes: ['AI parsing is disabled; filled skills using keyword matching.'],
    missingFields: ['city', 'englishLevel', 'kazakhLevel', 'russianLevel', 'experienceMonths', 'projectCount'],
    profileCsv: {
      technicalSkills: merged.technicalSkillsCsv || '',
      toolsSkills: merged.toolsSkillsCsv || '',
      softSkills: merged.softSkillsCsv || '',
    },
    model: 'fallback-keyword',
  };
}

async function parseResumeToProfile(resumeText, existing = {}) {
  const text = String(resumeText || '').trim();
  if (!text) throw new Error('Resume text is empty');

  if (!process.env.OPENAI_API_KEY) return parseResumeToProfileFallback(text, existing);
  return parseResumeToProfileAI(text);
}

module.exports = { parseResumeToProfile };
