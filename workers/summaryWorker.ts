import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import OpenAI from 'openai';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const openai = new OpenAI();

interface SummaryJobData {
  text: string;
  jobId: string;
}

new Worker<SummaryJobData>('summaryQueue', async job => {
  const { text, jobId } = job.data;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `Summarize this: ${text}` }],
  });
  const summary = response.choices[0].message.content;
  // TODO: Store summary result somewhere (DB or cache)
  console.log(`Summary for job ${jobId}: ${summary}`);
}, { connection });
