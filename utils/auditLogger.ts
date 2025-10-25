import fs from 'fs';
import path from 'path';

const logFile = path.resolve(process.cwd(), 'audit.log');

export function auditLog(action: string, userId: string, details?: any) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, action, userId, details };
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
}
