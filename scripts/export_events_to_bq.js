/**
 * Usage: node export_events_to_bq.js <datasetId> <tableId>
 * Exports recent events from the database to a JSON file and loads into BigQuery.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { loadEventsFromFile } from '../lib/analytics/bigquery.js';

const prisma = new PrismaClient();

async function exportAndLoad(datasetId, tableId) {
  const events = await prisma.event.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24h
    }
  });
  const filePath = path.resolve(process.cwd(), 'events_export.json');
  const stream = fs.createWriteStream(filePath);
  events.forEach(e => stream.write(JSON.stringify(e) + '\n'));
  stream.end();
  stream.on('finish', async () => {
    console.log('Exported events to', filePath);
    await loadEventsFromFile(filePath, datasetId, tableId);
    console.log('Loaded events into BigQuery', `${datasetId}.${tableId}`);
    await prisma.$disconnect();
  });
}

const [datasetId, tableId] = process.argv.slice(2);
if (!datasetId || !tableId) {
  console.error('datasetId and tableId required');
  process.exit(1);
}
exportAndLoad(datasetId, tableId).catch(console.error);
