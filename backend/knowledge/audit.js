#!/usr/bin/env node
/**
 * Knowledge Base Auditor (CareerAI / Kazakhstan)
 *
 * Goals:
 * - Detect coverage gaps across the 3 KB markdown files:
 *   industries/professions, skill requirements, salaries/career paths
 * - Detect mojibake / encoding artifacts that break UX ("вЂ“", "в†’", etc.)
 * - Provide a quick summary so you know what to add next for KB v2
 *
 * Usage:
 *   node backend/knowledge/audit.js
 *   node backend/knowledge/audit.js --json
 */

const fs = require('fs');
const path = require('path');
const { getKzMarketFromKB } = require('./loadKzMarket');
const { kzMarket } = require('../market/kzMarketFacts');

const KNOWLEDGE_DIR = __dirname;

const KB_FILES = {
  industriesAndProfessions: 'kz_market_1_industries_and_professions.md',
  skills: 'kz_market_2_skills_requirements.md',
  salariesAndPaths: 'kz_market_3_salaries_and_career_paths.md',
};

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function normalizeName(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function extractSectionNames(md, headingPrefixRegex) {
  // Example: /^### Industry: (.+)$/gm
  const out = [];
  let m;
  while ((m = headingPrefixRegex.exec(md)) !== null) out.push(m[1].trim());
  return out;
}

function extractIndustries(md) {
  return extractSectionNames(md, /^###\s+Industry:\s+(.+)$/gm);
}

function extractProfessions(md) {
  return extractSectionNames(md, /^###\s+Profession:\s+(.+)$/gm);
}

function findEncodingArtifacts(md) {
  // Common UTF-8 -> Windows-1251 / mis-decoding artifacts we saw in file #3
  const patterns = [
    { name: 'Mojibake "вЂ"', re: /вЂ[^\s]/g },
    { name: 'Mojibake "в†’"/arrow', re: /в†’/g },
    { name: 'Mojibake "вЂ“"/dash', re: /вЂ“/g },
    { name: 'Replacement char', re: /\uFFFD/g },
  ];

  const hits = [];
  for (const p of patterns) {
    const matches = md.match(p.re);
    if (matches && matches.length) {
      hits.push({ pattern: p.name, count: matches.length });
    }
  }
  return hits;
}

function compareSets(labelA, listA, labelB, listB) {
  const a = new Set(listA.map(normalizeName));
  const b = new Set(listB.map(normalizeName));

  const onlyInA = [];
  for (const raw of listA) {
    const n = normalizeName(raw);
    if (!b.has(n)) onlyInA.push(raw);
  }

  const onlyInB = [];
  for (const raw of listB) {
    const n = normalizeName(raw);
    if (!a.has(n)) onlyInB.push(raw);
  }

  return {
    labelA,
    labelB,
    onlyInA: uniq(onlyInA).sort(),
    onlyInB: uniq(onlyInB).sort(),
  };
}

function main() {
  const asJson = process.argv.includes('--json');

  const p1 = path.join(KNOWLEDGE_DIR, KB_FILES.industriesAndProfessions);
  const p2 = path.join(KNOWLEDGE_DIR, KB_FILES.skills);
  const p3 = path.join(KNOWLEDGE_DIR, KB_FILES.salariesAndPaths);

  const md1 = readUtf8(p1);
  const md2 = readUtf8(p2);
  const md3 = readUtf8(p3);

  const industries = extractIndustries(md1);
  const professions1 = extractProfessions(md1);
  const professions2 = extractProfessions(md2);
  const professions3 = extractProfessions(md3);

  const encoding = {
    [KB_FILES.industriesAndProfessions]: findEncodingArtifacts(md1),
    [KB_FILES.skills]: findEncodingArtifacts(md2),
    [KB_FILES.salariesAndPaths]: findEncodingArtifacts(md3),
  };

  const compare12 = compareSets('Industries & Professions', professions1, 'Skills', professions2);
  const compare13 = compareSets('Industries & Professions', professions1, 'Salaries & Paths', professions3);
  const compare23 = compareSets('Skills', professions2, 'Salaries & Paths', professions3);

  const report = {
    files: KB_FILES,
    counts: {
      industries: industries.length,
      professions: {
        industriesAndProfessions: professions1.length,
        skills: professions2.length,
        salariesAndPaths: professions3.length,
      },
    },
    industries: industries.sort(),
    professions: {
      industriesAndProfessions: professions1.sort(),
      skills: professions2.sort(),
      salariesAndPaths: professions3.sort(),
    },
    mismatches: [compare12, compare13, compare23],
    encodingArtifacts: encoding,
    derived: {},
    completeness: {},
    recommendations: [],
  };

  // Derived data checks (Single Source of Truth)
  const kbDerived = getKzMarketFromKB({ maxAgeMs: 0 });
  const derivedProfIds = new Set((kbDerived.professions || []).map((p) => normalizeName(p.name)));
  const factsProfIds = new Set((kzMarket.professions || []).map((p) => normalizeName(p.name)));

  report.derived = {
    kbDerivedProfessionCount: (kbDerived.professions || []).length,
    marketFactsProfessionCount: (kzMarket.professions || []).length,
    marketFactsMatchesKbDerived:
      derivedProfIds.size === factsProfIds.size &&
      Array.from(derivedProfIds).every((x) => factsProfIds.has(x)),
  };

  // Completeness checks per profession (based on KB-derived data)
  const completeness = [];
  for (const p of kbDerived.professions || []) {
    const requiredSkills = Array.isArray(p.requiredSkills) ? p.requiredSkills : [];
    const salary = p.salaryRangesKZT || {};
    const hasSalary = Boolean(salary.entry || salary.mid || salary.senior);
    const hasAllLevels = Boolean(salary.entry && salary.mid && salary.senior);
    const hasSkills = requiredSkills.length > 0;
    const hasMeta = Boolean((p.demandLevel || '').trim()) && Boolean((p.description || '').trim());
    const missing = [];
    if (!hasSkills) missing.push('skills');
    if (!hasSalary) missing.push('salary');
    if (!hasAllLevels) missing.push('salary_levels');
    if (!hasMeta) missing.push('meta');

    completeness.push({
      profession: p.name,
      id: p.id,
      ok: missing.length === 0,
      missing,
    });
  }

  report.completeness = {
    okCount: completeness.filter((c) => c.ok).length,
    total: completeness.length,
    missingByProfession: completeness.filter((c) => !c.ok),
  };

  // Recommendations based on actual gaps
  if (!report.derived.marketFactsMatchesKbDerived) {
    report.recommendations.push(
      'Derived data mismatch: market facts are not fully aligned with KB-derived professions. Ensure kzMarketFacts is derived-only (no manual data).',
    );
  }

  const missingSalary = completeness.filter((c) => c.missing.includes('salary')).length;
  const missingSkills = completeness.filter((c) => c.missing.includes('skills')).length;

  if (missingSkills > 0) {
    report.recommendations.push(
      `Add must-have (or required) skill lists for professions missing skills (${missingSkills}).`,
    );
  }
  if (missingSalary > 0) {
    report.recommendations.push(
      `Add salary ranges for professions missing salary data (${missingSalary}).`,
    );
  }
  if (completeness.some((c) => c.missing.includes('salary_levels'))) {
    report.recommendations.push(
      'For roles with salary data, prefer to include all 3 levels: Junior, Middle, Senior.',
    );
  }
  if (completeness.some((c) => c.missing.includes('meta'))) {
    report.recommendations.push(
      'Add demandLevel + 1-line description for any profession missing meta in KB1.',
    );
  }

  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }

  const lines = [];
  lines.push('CareerAI Knowledge Base Audit (Kazakhstan)');
  lines.push('');
  lines.push(`Industries: ${report.counts.industries}`);
  lines.push(`Professions: file1=${report.counts.professions.industriesAndProfessions}, file2=${report.counts.professions.skills}, file3=${report.counts.professions.salariesAndPaths}`);
  lines.push('');
  lines.push(
    `Derived: kbDerived=${report.derived.kbDerivedProfessionCount}, marketFacts=${report.derived.marketFactsProfessionCount}, match=${report.derived.marketFactsMatchesKbDerived}`,
  );
  lines.push(
    `Completeness (KB-derived): ok=${report.completeness.okCount}/${report.completeness.total}`,
  );
  lines.push('');

  lines.push('Mismatches:');
  for (const m of report.mismatches) {
    const a = m.onlyInA.length ? m.onlyInA.join(', ') : 'none';
    const b = m.onlyInB.length ? m.onlyInB.join(', ') : 'none';
    lines.push(`- Only in ${m.labelA}: ${a}`);
    lines.push(`- Only in ${m.labelB}: ${b}`);
  }
  lines.push('');

  lines.push('Encoding artifacts:');
  for (const [file, hits] of Object.entries(report.encodingArtifacts)) {
    if (!hits.length) {
      lines.push(`- ${file}: none`);
      continue;
    }
    lines.push(`- ${file}: ${hits.map((h) => `${h.pattern} x${h.count}`).join('; ')}`);
  }
  lines.push('');

  lines.push('Recommendations:');
  for (const r of report.recommendations) lines.push(`- ${r}`);
  lines.push('');

  process.stdout.write(lines.join('\n'));
}

main();
