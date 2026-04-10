const { searchKnowledge } = require('../knowledge/search');
const { assessCandidate } = require('../market/assess');
const { kzMarket } = require('../market/kzMarketFacts');
const { getOpenAIClient } = require('./openaiClient');

// Keep these strings ASCII-safe (PowerShell encoding can be messy on Windows).
const NO_SNIPPETS = 'No relevant knowledge base snippets found.';
const NO_MARKET_DATA = 'No data in the Kazakhstan labor market knowledge base for this point.';

function detectReplyLanguage(message) {
  const s = String(message || '');
  return /[А-Яа-яЁё]/.test(s) ? 'ru' : 'en';
}

function detectIntent(message) {
  const m = String(message || '').toLowerCase();
  if (/(salary|зарплат|оклад|kzt|тг|тенге)/i.test(m)) return 'salary';
  if (/(резюме|cv|портфол)/i.test(m)) return 'resume';
  if (/(план|roadmap|2\s*нед|30\s*дн|90\s*дн)/i.test(m)) return 'plan';
  if (/(навык|skill|курс|учить|изуч)/i.test(m)) return 'skills';
  if (/(профес|роль|ваканс|кем\s+работ)/i.test(m)) return 'fit';
  return 'general';
}

function resolveIntent({ message, mode }) {
  const m = String(mode || '').toLowerCase().trim();
  if (m === 'vacancy') return 'vacancy';
  if (m === 'interview') return 'interview';
  if (m === 'resume') return 'resume';
  if (m === 'plan30' || m === 'plan') return 'plan';
  return detectIntent(message);
}

const PROFESSION_SYNONYMS = {
  software_developer: ['software developer', 'developer', 'разработчик', 'программист', 'software dev'],
  data_analyst: ['data analyst', 'аналитик данных', 'data analysis', 'аналитик'],
  accountant: ['accountant', 'бухгалтер'],
  mechanical_engineer: ['mechanical engineer', 'инженер-механик', 'механический инженер', 'инженер'],
  teacher: ['teacher', 'учитель', 'преподаватель', 'лектор'],
  logistics_manager: ['logistics manager', 'логист', 'менеджер по логистике', 'supply chain'],
};

function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveProfessionId({ message, goals }) {
  const g = goals && typeof goals === 'object' ? goals : {};
  const raw = g.targetProfessionIds || g.targetProfessionId || g.targetProfession;
  const fromGoals = Array.isArray(raw) ? raw[0] : raw;
  if (fromGoals) return String(fromGoals);

  const msg = normalizeForMatch(message);
  if (!msg) return null;

  for (const p of kzMarket.professions) {
    const name = normalizeForMatch(p.name);
    const id = normalizeForMatch(String(p.id).replace(/_/g, ' '));
    if ((name && msg.includes(name)) || (id && msg.includes(id))) return p.id;
  }

  for (const [id, terms] of Object.entries(PROFESSION_SYNONYMS)) {
    for (const t of terms) {
      const term = normalizeForMatch(t);
      if (term && msg.includes(term)) return id;
    }
  }

  return null;
}

function compactKZT(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v % 1_000_000 === 0) return `${v / 1_000_000}M`;
  if (v % 1_000 === 0) return `${v / 1_000}k`;
  return String(v);
}

function formatSalaryRange(range) {
  if (!range) return null;
  const min = compactKZT(range.min);
  const max = compactKZT(range.max);
  if (!min || !max) return null;
  return `${min}-${max}${range.plus ? '+' : ''} KZT`;
}

function buildSalaryAnswer(profession, lang) {
  const sr = profession && profession.salaryRangesKZT ? profession.salaryRangesKZT : null;
  if (!sr) return null;

  const lines = [];
  lines.push(
    lang === 'ru'
      ? `\u0417\u0430\u0440\u043f\u043b\u0430\u0442\u0430 ${profession.name} \u0432 \u041a\u0430\u0437\u0430\u0445\u0441\u0442\u0430\u043d\u0435 (\u043f\u043e \u0431\u0430\u0437\u0435):`
      : `${profession.name} salary in Kazakhstan (from the knowledge base):`,
  );

  const entry = formatSalaryRange(sr.entry);
  const mid = formatSalaryRange(sr.mid);
  const senior = formatSalaryRange(sr.senior);
  if (entry) lines.push(`- Junior: ${entry}`);
  if (mid) lines.push(`- Middle: ${mid}`);
  if (senior) lines.push(`- Senior: ${senior}`);

  const notes = Array.isArray(profession.marketNotes) ? profession.marketNotes : [];
  const cityNote = notes.find((n) => /almaty|astana/i.test(String(n)));
  if (cityNote) {
    lines.push(
      lang === 'ru'
        ? '\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435: \u0432 \u0410\u043b\u043c\u0430\u0442\u044b \u0438 \u0410\u0441\u0442\u0430\u043d\u0435 \u043e\u0431\u044b\u0447\u043d\u043e \u0431\u043e\u043b\u044c\u0448\u0435 \u0432\u0430\u043a\u0430\u043d\u0441\u0438\u0439 \u0438 \u0432\u044b\u0448\u0435 \u0432\u0438\u043b\u043a\u0438.'
        : 'Note: Almaty and Astana typically have more vacancies and higher ranges.',
    );
  }

  return lines.join('\n');
}

function stripEmptyDeep(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const arr = value.map(stripEmptyDeep).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    const cleaned = stripEmptyDeep(v);
    if (cleaned === undefined) continue;
    out[k] = cleaned;
  }
  return Object.keys(out).length ? out : undefined;
}

function buildRetrievalQuery({ message, assessment, vacancyText }) {
  const parts = [];
  if (message) parts.push(message);
  if (vacancyText) parts.push(vacancyText);
  if (assessment && assessment.top) {
    parts.push(assessment.top.professionName);
    parts.push(...(assessment.top.missingSkills || []).slice(0, 5));
  }
  return parts.join(' ');
}

function formatKBSnippets(snippets) {
  if (!snippets || snippets.length === 0) return NO_SNIPPETS;
  return snippets
    .map((s, i) => {
      const header = `[${i + 1}] ${s.file} :: ${s.heading || 'No heading'}`;
      return `${header}\n${s.text}`.trim();
    })
    .join('\n\n');
}

function systemPrompt() {
  return [
    'You are CareerAI: a focused career advisor for students in Kazakhstan.',
    '',
    'Scope rules (important):',
    '- Stay strictly within CareerAI: profile/resume analysis, goals, role fit, gaps, next steps, Kazakhstan labour market.',
    '- If the user asks something outside careers, politely steer back to CareerAI tasks.',
    '',
    'Grounding rules:',
    '- User profile/resume/goals are the source of truth about the candidate.',
    '- Use ONLY the provided knowledge snippets for market facts (industries, demand, skills, salaries, career paths).',
    '- You MAY use fields in assessment.top (demandLevel, salaryRangesKZT, missingSkills, matchedSkills, fitScore) as they are derived from the same Kazakhstan knowledge base.',
    '- Do not invent numbers, salaries, or “employment probabilities”. If you mention fitScore, call it an estimate.',
    '',
    'Missing data handling:',
    '- If some profile fields are empty, do NOT assume facts.',
    '- Still answer with what you have, then ask up to 3 short clarifying questions only if needed.',
    `- If the knowledge base does not contain the needed market fact, say: "${NO_MARKET_DATA}"`,
    '',
    'Style:',
    '- Reply in the language specified by replyLanguage in the user payload: "ru" or "en".',
    '- Be concise and factual. Avoid generic long templates.',
    '- Hard limit: max 8 lines OR max 6 bullets.',
    '- Output MUST be plain text (no Markdown, no bold, no headings with **).',
    '- If you need a list, use "-" bullets only. Do NOT use numbering (no "1.", "2)", etc.).',
    '- Do NOT output citations like [1], [2] and do not mention snippet IDs/files.',
    '- If the user did not ask for a long 2/30/90-day plan, do not generate it. Give 2-4 concrete next actions.',
    '',
    'Priority rules:',
    '- First, answer the user question directly (1-2 lines).',
    '- Ask clarifying questions ONLY if they are required to answer the question; otherwise ask 0 questions.',
    '- If intent == salary: start with salary ranges in KZT (entry/mid/senior if available). Do NOT add skills/plans unless the user asked. Ask 0 questions unless the user explicitly asked for city-specific numbers.',
    '- If intent == resume: give 2-4 concrete edits to the resume based on the provided profile/experience text.',
    '- If intent == fit: compare the profile to a target role; list top 3 gaps max, then 2-4 next actions.',
    '- If intent != salary and the user did not ask about salary, do NOT volunteer salary ranges.',
    '- If intent == interview: output 5 likely interview questions for the target role and 3 things to prepare (very short).',
    '- If intent == vacancy: compare the candidate to the provided vacancy text. Output: 1-line fit summary, top 3 gaps, 3 next actions. If vacancy text is missing, ask the user to paste it.',
  ].join('\n');
}

async function careerChat({ message, profile, goals, mode, vacancyText, preferredLanguage }) {
  const safeProfile = profile && typeof profile === 'object' ? profile : {};
  const safeGoals = goals && typeof goals === 'object' ? goals : {};

  const intent = resolveIntent({ message, mode });
  const vacancy = String(vacancyText || '').trim();
  const preferred =
    preferredLanguage === 'ru' || preferredLanguage === 'en' ? preferredLanguage : null;
  const replyLanguage = preferred || detectReplyLanguage(message);

  // For salary questions we prefer deterministic output from the Kazakhstan market facts
  // to keep answers short and strictly factual.
  if (intent === 'salary') {
    const professionId = resolveProfessionId({ message, goals: safeGoals });
    if (!professionId) {
      return {
        model: 'market-kz-facts',
        query: '',
        retrieved: [],
        answer:
          replyLanguage === 'ru'
            ? '\u0423\u0442\u043e\u0447\u043d\u0438 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u044e (\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: Software Developer, Data Analyst, Accountant, Teacher, Logistics Manager).'
            : 'Please specify a profession (e.g., Software Developer, Data Analyst, Accountant, Teacher, Logistics Manager).',
      };
    }
    const profession = professionId
      ? kzMarket.professions.find((p) => p.id === professionId)
      : null;
    const salaryAnswer = profession ? buildSalaryAnswer(profession, replyLanguage) : null;

    if (salaryAnswer) {
      return {
        model: 'market-kz-facts',
        query: '',
        retrieved: [],
        answer: salaryAnswer,
      };
    }
  }

  const assessment = assessCandidate({ profile: safeProfile, goals: safeGoals });
  const query = buildRetrievalQuery({ message, assessment, vacancyText: vacancy });
  const retrieved = searchKnowledge(query, { limit: 10 });
  const kbSnippets = formatKBSnippets(retrieved);

  const client = await getOpenAIClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const maxOutputTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 240);

  const userPayload = {
    intent,
    mode: mode || null,
    userMessage: message,
    vacancyText: vacancy || null,
    replyLanguage,
    profile: stripEmptyDeep(safeProfile) || {},
    goals: stripEmptyDeep(safeGoals) || {},
    assessment: stripEmptyDeep({
      top: assessment.top,
      // Pass questions, but the model must not ask them unless needed for the current intent.
      questions: assessment.questions,
      disclaimer: assessment.disclaimer,
      profileSummary: assessment.profileSummary,
    }),
    kbSnippets,
  };

  const response = await client.responses.create({
    model,
    max_output_tokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : 320,
    temperature: 0.2,
    input: [
      { role: 'system', content: systemPrompt() },
      {
        role: 'system',
        content: replyLanguage === 'ru' ? 'Reply in Russian.' : 'Reply in English.',
      },
      { role: 'user', content: JSON.stringify(userPayload, null, 2) },
    ],
  });

  function postProcessAnswer(text) {
    const raw = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!raw) return '';

    // Drop obvious markdown bold and normalize numbered lists to '-' bullets.
    const normalized = raw.replace(/\*\*/g, '');

    const allowSalaryLines =
      intent === 'salary' || /(salary|зарплат|оклад|kzt|тг|тенге)/i.test(String(message || ''));

    const lines = normalized
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+[.)]\s+/, '- '))
      .map((l) => l.replace(/^[-*•]\s+/, '- '))
      .map((l) => l.replace(/^-+\s+-+\s+/, '- '))
      .filter((l) => (allowSalaryLines ? true : !/(kzt|тг|тенге|зарплат|оклад)/i.test(l)));

    // Enforce max 8 lines to keep responses short in the UI.
    return lines.slice(0, 8).join('\n');
  }

  return {
    model,
    query,
    retrieved: retrieved.map((r, idx) => ({
      n: idx + 1,
      file: r.file,
      heading: r.heading,
      score: r.score,
    })),
    answer: postProcessAnswer(response.output_text || ''),
  };
}

module.exports = { careerChat };
