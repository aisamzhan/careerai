const { kzMarket } = require('./kzMarketFacts');

function normalizeToSearchText(value) {
  const str = Array.isArray(value) ? value.join(' ') : String(value || '');
  const normalized = str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ` ${normalized} `;
}

function hasAnyTerm(searchText, terms) {
  for (const rawTerm of terms) {
    const term = normalizeToSearchText(rawTerm).trim();
    if (!term) continue;
    if (searchText.includes(` ${term} `)) return true;
  }
  return false;
}

function parseCommaList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function computeProfileCoverage(profile) {
  const p = profile || {};
  const technical = parseCommaList(p.technicalSkills);
  const tools = parseCommaList(p.toolsSkills);
  const soft = parseCommaList(p.softSkills);

  const fields = [
    { key: 'city', ok: !!String(p.city || '').trim() },
    { key: 'technicalSkills', ok: technical.length > 0 },
    { key: 'toolsSkills', ok: tools.length > 0 },
    { key: 'softSkills', ok: soft.length > 0 },
    {
      key: 'experience',
      ok: Number(p.experienceMonths || 0) > 0 || !!String(p.experienceText || '').trim(),
    },
    { key: 'projectCount', ok: Number(p.projectCount || 0) > 0 },
    { key: 'englishLevel', ok: !!String(p.englishLevel || '').trim() },
    { key: 'kazakhLevel', ok: !!String(p.kazakhLevel || '').trim() },
    { key: 'russianLevel', ok: !!String(p.russianLevel || '').trim() },
  ];

  const filledKeys = fields.filter((f) => f.ok).map((f) => f.key);
  const missingKeys = fields.filter((f) => !f.ok).map((f) => f.key);
  const total = fields.length;
  const filled = filledKeys.length;
  const percent = total ? Math.round((filled / total) * 100) : 0;

  return { percent, filled, total, filledKeys, missingKeys };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreExperienceMonths(months) {
  const m = Number.isFinite(months) ? months : Number(months || 0);
  if (!Number.isFinite(m) || m <= 0) return 0;
  if (m <= 6) return 3;
  if (m <= 24) return 6;
  return 10;
}

function scoreLanguageLevel(level) {
  const l = String(level || '').toLowerCase().trim();
  if (!l) return 0;
  if (['none', 'no', '0'].includes(l)) return 0;
  if (['a1', 'a2', 'basic', 'beginner'].includes(l)) return 3;
  if (['b1', 'intermediate'].includes(l)) return 6;
  if (['b2', 'upper-intermediate'].includes(l)) return 8;
  if (['c1', 'c2', 'advanced', 'fluent'].includes(l)) return 10;
  if (['native', 'native-speaker'].includes(l)) return 10;
  return 5;
}

function buildGapAdvice(professionId, missingLabels) {
  const adv = [];
  if (missingLabels.length === 0) return adv;

  const role = kzMarket.professions.find((p) => p.id === professionId);
  if (!role) return adv;

  const byLabel = new Map(role.requiredSkillGroups.map((g) => [g.label, g]));

  for (const label of missingLabels) {
    const g = byLabel.get(label);
    if (!g) continue;
    adv.push({
      area: label,
      suggestion: `Improve this skill: ${label}. Start with the basics and reinforce it with a small project.`,
    });
  }

  return adv;
}

function defaultActionPlan(roleName, missingLabels) {
  const focus = missingLabels.slice(0, 3);
  const focusText = focus.length ? focus.join(', ') : 'skill depth and portfolio';

  return {
    twoWeeks: [
      `Draft a clear resume for the role: ${roleName}.`,
      `Pick 1-2 key gaps to focus on: ${focusText}.`,
      'Set a study plan (30-60 minutes per day) and track progress.',
    ],
    thirtyDays: [
      `Cover the fundamentals for: ${focusText}.`,
      'Build 1 role-relevant project and add it to your portfolio (README, screenshots, link).',
      'Prepare for typical interviews: questions + ~10 tasks/cases.',
    ],
    ninetyDays: [
      'Build a portfolio of 2-3 pieces (coursework, pet projects, internship).',
      'Prepare a CV and a cover letter tailored to different companies/industries.',
      'Start applying consistently and iterating based on interview feedback.',
    ],
  };
}

function careerPathForRole(roleId) {
  if (roleId === 'software_developer') return kzMarket.careerPaths.softwareDevelopment;
  if (roleId === 'data_analyst') return kzMarket.careerPaths.dataAnalysis;
  if (roleId === 'mechanical_engineer') return kzMarket.careerPaths.engineering;
  if (roleId === 'accountant') return kzMarket.careerPaths.businessManagement;
  return null;
}

function assessForProfession(role, profile, goals) {
  const technical = parseCommaList(profile.technicalSkills);
  const tools = parseCommaList(profile.toolsSkills);
  const soft = parseCommaList(profile.softSkills);
  const combinedSkills = normalizeToSearchText([...technical, ...tools, ...soft, profile.experienceText]);

  const matched = [];
  const missing = [];

  for (const g of role.requiredSkillGroups) {
    const ok = hasAnyTerm(combinedSkills, g.anyOf);
    if (ok) matched.push(g.label);
    else missing.push(g.label);
  }

  const mustHaveCount = Array.isArray(role.requiredSkillGroups) ? role.requiredSkillGroups.length : 0;
  const requirementsKnown = mustHaveCount > 0;

  // If KB doesn't have must-have requirements for this role yet, do not punish the user with a near-zero score.
  // We compute a conservative score from experience/languages/portfolio only and keep confidence lower.
  const skillScore = requirementsKnown ? (matched.length / mustHaveCount) * 70 : 0;

  const experienceScore = scoreExperienceMonths(profile.experienceMonths);

  const englishScore = scoreLanguageLevel(profile.englishLevel);
  const englishBonus =
    role.id === 'software_developer' || role.id === 'data_analyst' || role.id === 'accountant'
      ? englishScore
      : Math.round(englishScore * 0.5);

  const kazakhScore = scoreLanguageLevel(profile.kazakhLevel);
  const kazakhBonus = role.id === 'teacher' ? kazakhScore : 0;

  const projectCount = clamp(Number(profile.projectCount || 0) || 0, 0, 20);
  const portfolioScore = projectCount >= 3 ? 10 : projectCount === 2 ? 7 : projectCount === 1 ? 4 : 0;

  const rawScore = requirementsKnown
    ? skillScore + experienceScore + englishBonus + kazakhBonus + portfolioScore
    : 20 + experienceScore + englishBonus + kazakhBonus + portfolioScore; // 20 baseline when skill requirements are unknown

  const fitScore = clamp(Math.round(rawScore), 0, 100);

  const fitLabel = fitScore >= 80 ? 'Strong' : fitScore >= 60 ? 'Good' : fitScore >= 40 ? 'Early' : 'Needs work';

  const actionPlan = defaultActionPlan(role.name, missing);
  const gapAdvice = buildGapAdvice(role.id, missing);

  // Confidence is about data completeness, not about the candidate.
  // Higher confidence = we have more complete market data for this profession in KB.
  const confParts = [];
  const hasSkills = Array.isArray(role.requiredSkillGroups) && role.requiredSkillGroups.length > 0;
  const sr = role.salaryRangesKZT || null;
  const hasSalaryAny = Boolean(sr && (sr.entry || sr.mid || sr.senior));
  const hasSalaryAll = Boolean(sr && sr.entry && sr.mid && sr.senior);
  const hasMeta = Boolean(String(role.demandLevel || '').trim()) && Boolean(String(role.description || '').trim());

  if (hasMeta) confParts.push('meta');
  if (hasSkills) confParts.push('skills');
  if (hasSalaryAny) confParts.push('salary');
  if (hasSalaryAll) confParts.push('salary_levels');

  // 0.35 base (we at least have a role), then +0.2 per data area
  const confidence = clamp(Math.round((0.35 + confParts.length * 0.15) * 100) / 100, 0.2, 0.95);
  const confidenceReason = !hasSkills && !hasSalaryAny
    ? 'Limited KB data for this role (missing skills and salary).'
    : `KB data coverage: ${confParts.join(', ') || 'basic'}.`;

  return {
    professionId: role.id,
    professionName: role.name,
    demandLevel: role.demandLevel,
    description: role.description,
    targetCity: goals.targetCity || null,
    fitScore,
    fitLabel,
    matchedSkills: matched,
    missingSkills: missing,
    mustHaveCount,
    requirementsKnown,
    salaryRangesKZT: role.salaryRangesKZT,
    marketNotes: role.marketNotes || [],
    careerPath: careerPathForRole(role.id),
    recommendations: gapAdvice,
    actionPlan,
    confidence,
    confidenceReason,
  };
}

function assessCandidate(payload) {
  const profile = (payload && payload.profile) || {};
  const goals = (payload && payload.goals) || {};

  const targetIdsRaw = goals.targetProfessionIds || goals.targetProfessionId || goals.targetProfession;
  const targetIds = Array.isArray(targetIdsRaw)
    ? targetIdsRaw.map((s) => String(s))
    : targetIdsRaw
      ? [String(targetIdsRaw)]
      : [];

  const professions = kzMarket.professions;
  const selected =
    targetIds.length > 0 ? professions.filter((p) => targetIds.includes(p.id)) : professions;

  const results = selected.map((p) => assessForProfession(p, profile, goals));
  results.sort((a, b) => b.fitScore - a.fitScore);

  const top = results[0] || null;

  const questions = [];
  if (!goals.targetCity) questions.push('Which city in Kazakhstan do you want to work in (Almaty, Astana, other)?');
  if (!targetIds.length) questions.push('Which target role is your priority (pick 1)?');
  if (!profile.englishLevel) questions.push('What is your English level (A1-C2 or basic/intermediate/advanced)?');
  if (!profile.kazakhLevel)
    questions.push('What is your Kazakh level (A1-C2), if you plan to apply to public sector roles?');
  if (!profile.experienceMonths && !profile.experienceText)
    questions.push('Do you have experience (internships/projects/freelance)? How many months and what did you do?');

  return {
    meta: {
      marketLastUpdated: kzMarket.lastUpdated,
      marketSource: kzMarket.source,
    },
    profileCoverage: computeProfileCoverage(profile),
    profileSummary: {
      name: profile.name || null,
      city: profile.city || null,
      university: profile.university || null,
      technicalSkills: parseCommaList(profile.technicalSkills),
      toolsSkills: parseCommaList(profile.toolsSkills),
      softSkills: parseCommaList(profile.softSkills),
      englishLevel: profile.englishLevel || null,
      kazakhLevel: profile.kazakhLevel || null,
      russianLevel: profile.russianLevel || null,
      experienceMonths: profile.experienceMonths ? Number(profile.experienceMonths) : 0,
      projectCount: profile.projectCount ? Number(profile.projectCount) : 0,
    },
    goals: {
      targetProfessionIds: targetIds.length ? targetIds : null,
      targetCity: goals.targetCity || null,
      timelineMonths: goals.timelineMonths ? Number(goals.timelineMonths) : null,
    },
    results,
    market: {
      salaryLevelsKZT: kzMarket.general.salaryLevelsKZT,
      citySalaryNote: kzMarket.general.citySalaryNote,
      industrySalaryNote: kzMarket.general.industrySalaryNote,
      languageNotes: kzMarket.general.languageNotes,
      topCareerPaths: kzMarket.careerPaths,
    },
    top,
    questions,
    disclaimer:
      'Fit score is an estimate of how your skills/experience match the knowledge base. It is not an official employment probability and not a guarantee.',
  };
}

module.exports = { assessCandidate };
