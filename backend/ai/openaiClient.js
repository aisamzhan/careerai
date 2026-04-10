let clientPromise = null;

async function getOpenAIClient() {
  if (!clientPromise) {
    clientPromise = import('openai').then(({ default: OpenAI }) => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('Missing env var: OPENAI_API_KEY');
      return new OpenAI({ apiKey });
    });
  }
  return clientPromise;
}

module.exports = { getOpenAIClient };

