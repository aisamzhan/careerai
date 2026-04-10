const mammoth = require('mammoth');

async function extractDocxText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid DOCX buffer');
  }

  const result = await mammoth.extractRawText({ buffer });
  const text = String(result && result.value ? result.value : '').trim();
  const warnings = Array.isArray(result && result.messages ? result.messages : [])
    ? result.messages.map((m) => (m && m.message ? String(m.message) : String(m))).filter(Boolean)
    : [];

  return { text, warnings };
}

module.exports = { extractDocxText };

