const { getKzMarketFromKB, slugifyId } = require('../knowledge/loadKzMarket');

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function labelToAnyOf(label) {
  // Minimal, safe mappings. Fallback to label itself (lowercased).
  // This is used for heuristic matching against user-provided skills text.
  const raw = String(label || '').trim();
  const l = raw.toLowerCase();
  if (!l) return [];

  const map = new Map([
    ['javascript', ['javascript', 'js', 'джаваскрипт', 'жаваскрипт']],
    ['html/css', ['html', 'css', 'sass', 'scss']],
    ['html', ['html']],
    ['css', ['css', 'sass', 'scss']],
    ['react', ['react', 'reactjs', 'react.js', 'реакт', 'react']],
    ['next.js', ['next', 'nextjs', 'next.js']],
    ['typescript', ['typescript', 'ts', 'тайпскрипт', 'типскрипт']],
    ['git', ['git', 'github', 'gitlab', 'bitbucket', 'гит']],
    ['node.js', ['node', 'nodejs', 'node.js', 'нод', 'node']],
    ['sql', ['sql', 'postgres', 'postgresql', 'mysql', 'mssql', 'sqlite']],
    ['databases (sql / nosql)', ['sql', 'nosql', 'postgres', 'mysql', 'mongodb', 'redis']],
    ['docker', ['docker', 'докер']],
    ['kubernetes', ['kubernetes', 'k8s']],
    ['linux', ['linux', 'bash', 'shell', 'линух', 'линукс']],
    ['ci/cd', ['ci', 'cd', 'ci/cd', 'github actions', 'gitlab ci', 'jenkins']],
    ['rest api', ['rest', 'api', 'http', 'json']],
    ['selenium or playwright', ['selenium', 'playwright', 'cypress']],
    ['selenium / playwright', ['selenium', 'playwright', 'cypress']],
    ['excel', ['excel', 'эксель']],
    ['power bi / tableau', ['power bi', 'tableau']],
    ['data visualization (power bi / tableau)', ['power bi', 'tableau']],
    ['python', ['python', 'питон']],
    ['figma', ['figma', 'фигма']],
    ['ux research', ['ux research', 'user research', 'interviews', 'survey']],
    ['prototyping', ['prototype', 'prototyping', 'wireframe']],
    ['product thinking', ['product', 'roadmap', 'prioritization', 'discovery']],
    ['communication', ['communication', 'stakeholder', 'presentation']],
    ['analytics', ['analytics', 'metrics', 'kpi', 'funnel']],
    ['social media strategy', ['social media', 'smm', 'strategy']],
    ['content creation', ['content', 'copywriting', 'video', 'design']],
  ]);

  // Direct map key match
  if (map.has(l)) return map.get(l);

  // Try normalize common separators
  const normalized = l.replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
  if (map.has(normalized)) return map.get(normalized);

  return [normalized];
}

function buildSkillGroups(requiredSkills) {
  const labels = uniq(requiredSkills);
  return labels.map((label) => ({
    label,
    anyOf: labelToAnyOf(label),
  }));
}

function getKzMarket() {
  const kb = getKzMarketFromKB();

  const professions = kb.professions.map((p) => ({
    id: p.id || slugifyId(p.name),
    name: p.name,
    demandLevel: p.demandLevel || 'Unknown',
    description: p.description || '',
    requiredSkillGroups: buildSkillGroups(p.requiredSkills || []),
    niceToHaveSkills: p.niceToHaveSkills || [],
    salaryRangesKZT: p.salaryRangesKZT || null,
    marketNotes: p.marketNotes || [],
  }));

  return {
    lastUpdated: kb.lastUpdated,
    source: kb.source,
    industries: kb.industries || [],
    professions,
    general: {
      citySalaryNote: 'Major cities such as Almaty and Astana generally offer higher salaries.',
      industrySalaryNote: 'Certain industries such as oil and gas may offer higher salaries.',
      salaryLevelsKZT: {
        entry: { min: 150_000, max: 400_000, plus: false, text: '150k - 400k KZT' },
        mid: { min: 400_000, max: 900_000, plus: false, text: '400k - 900k KZT' },
        senior: { min: 900_000, max: 2_000_000, plus: true, text: '900k - 2M+ KZT' },
      },
      languageNotes: [
        'Kazakh is required in government and public sector jobs.',
        'Russian is widely used in business communication.',
        'English is important for international companies and technology sectors.',
        'English proficiency significantly increases opportunities in IT, finance, and multinational organizations.',
      ],
    },
    careerPaths: {
      // Keep legacy placeholders; we can also parse these from KB3 later.
      softwareDevelopment: [
        'Junior Developer',
        'Middle Developer',
        'Senior Developer',
        'Tech Lead',
        'Engineering Manager',
      ],
      dataAnalysis: [
        'Junior Data Analyst',
        'Data Analyst',
        'Senior Data Analyst',
        'Data Scientist',
        'Head of Data / Chief Data Officer',
      ],
      businessManagement: [
        'Business Assistant',
        'Specialist (HR / Marketing / Finance)',
        'Senior Specialist / Team Lead',
        'Department Manager',
        'Director',
      ],
      engineering: [
        'Junior Engineer',
        'Engineer',
        'Senior Engineer',
        'Project Manager',
        'Engineering Director',
      ],
    },
  };
}

// Preserve the old import style: `const { kzMarket } = require('./kzMarketFacts')`
// by exporting a stable object (computed once at load time).
const kzMarket = getKzMarket();

module.exports = { kzMarket, getKzMarket };
