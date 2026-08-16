export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { text, targetLanguage, sourceLanguage } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const target = targetLanguage || 'English';
    const source = sourceLanguage || 'the source language';
    const prompt = `Translate the following ${source} text into ${target}. Preserve names, numbers, technical terms, equations, and meaning. Return only the translation.\n\n${text.slice(0, 30000)}`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    if (!response.ok || data.error) {
      return res.status(response.status || 502).json({
        error: data?.error?.message || `Gemini request failed (${response.status}).`
      });
    }

    const translation = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!translation) {
      return res.status(502).json({ error: 'Gemini returned no translation.' });
    }

    return res.status(200).json({ translation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Translation service failed.' });
  }
}
