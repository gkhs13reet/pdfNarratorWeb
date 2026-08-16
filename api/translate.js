export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, targetLanguage, sourceLanguage } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const languageCodes = {
      English: 'en',
      'Punjabi (Gurmukhi)': 'pa',
      Punjabi: 'pa',
      'Hindi (Devanagari)': 'hi',
      Hindi: 'hi',
      Spanish: 'es',
      French: 'fr',
      German: 'de'
    };

    const target = languageCodes[targetLanguage] || 'en';
    const source = languageCodes[sourceLanguage] || 'en';

    if (source === target) {
      return res.status(200).json({ translation: text });
    }

    // MyMemory is used here as a free translation service. No user API key is required.
    // Keep requests small because free translation services impose request-size limits.
    const input = text.slice(0, 5000);
    const chunks = input.match(/[\s\S]{1,450}(?:\s|$)/g) || [input];
    const translated = [];

    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(source)}%7C${encodeURIComponent(target)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Free translation service returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.responseStatus && Number(data.responseStatus) !== 200) {
        throw new Error(data.responseDetails || 'Free translation service rejected the request.');
      }

      const result = data?.responseData?.translatedText;
      if (!result) throw new Error('Free translation service returned no translation.');
      translated.push(result);
    }

    return res.status(200).json({
      translation: translated.join(' '),
      truncated: text.length > 5000,
      provider: 'MyMemory'
    });
  } catch (error) {
    console.error(error);
    return res.status(502).json({
      error: `Free translation is temporarily unavailable. ${error.message || ''}`.trim()
    });
  }
}
