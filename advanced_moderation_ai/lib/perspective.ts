import axios from 'axios';

const PERSPECTIVE_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const API_KEY = process.env.PERSPECTIVE_API_KEY;

export async function analyzeToxicity(text: string): Promise<number> {
  const response = await axios.post(`${PERSPECTIVE_URL}?key=${API_KEY}`, {
    comment: { text },
    languages: ['en'],
    requestedAttributes: { TOXICITY: {} },
  });

  const score = response.data.attributeScores.TOXICITY.summaryScore.value;
  return score;
}
