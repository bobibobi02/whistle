import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

interface NotificationJobData {
  userId: string;
  message: string;
}

new Worker<NotificationJobData>('notificationQueue', async job => {
  const { userId, message } = job.data;
  // TODO: Implement actual notification logic (email, in-app)
  console.log(`Sending notification to ${userId}: ${message}`);
}, { connection });
