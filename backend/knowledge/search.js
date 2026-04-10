const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILES = [
  'kz_market_1_industries_and_professions.md',
  'kz_market_2_skills_requirements.md',
  'kz_market_3_salaries_and_career_paths.md',
];

function safeReadUtf8(filePath) {
  return fs.readFileSync(filePath, { encoding: 'utf8' });
}

function tokenizeQuery(query) {
  return String(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function chunkMarkdown(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const chunks = [];
  let currentHeading = null;
  let buffer = [];

  function flush() {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (!text) return;

    // Split big sections into smaller paragraphs to keep retrieval tighter.
    const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      chunks.push({
        heading: currentHeading,
        text: part,
      });
    }
  }

  for (const line of lines) {
    const headingMatch = /^(#{1,3})\s+(.+)\s*$/.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[2].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return chunks;
}

function scoreChunk(chunkTextLower, tokens) {
  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    const idx = chunkTextLower.indexOf(t);
    if (idx !== -1) score += 1;
  }
  return score;
}

function loadKnowledgeChunks() {
  const baseDir = __dirname;
  const all = [];
  for (const filename of KNOWLEDGE_FILES) {
    const fullPath = path.join(baseDir, filename);
    const content = safeReadUtf8(fullPath);
    const chunks = chunkMarkdown(content);
    for (const c of chunks) {
      all.push({
        file: filename,
        heading: c.heading,
        text: c.text,
      });
    }
  }
  return all;
}

function searchKnowledge(query, { limit = 6 } = {}) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const chunks = loadKnowledgeChunks();
  const scored = [];

  for (const ch of chunks) {
    const combinedLower = `${ch.heading || ''}\n${ch.text}`.toLowerCase();
    const s = scoreChunk(combinedLower, tokens);
    if (s <= 0) continue;
    scored.push({ ...ch, score: s });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function getKnowledgeStatus() {
  const baseDir = __dirname;
  return KNOWLEDGE_FILES.map((filename) => {
    const fullPath = path.join(baseDir, filename);
    const stat = fs.statSync(fullPath);
    return {
      file: filename,
      bytes: stat.size,
      mtime: stat.mtime.toISOString(),
    };
  });
}

module.exports = {
  searchKnowledge,
  getKnowledgeStatus,
  KNOWLEDGE_FILES,
};
