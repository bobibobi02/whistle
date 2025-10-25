// scripts/healthcheck.js

/**
 * Simple health-check script to smoke-test your Whistle API endpoints.
 * Usage: API_URL=http://localhost:3000 node scripts/healthcheck.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

const endpoints = [
  '/api/health',                                 // you can implement a simple health endpoint
  '/api/mod/log',                                // moderation log
  '/api/appeals',                                // appeal submission & listing
  '/api/translations?locale=en&key=home.title',  // translation fetch
  '/api/events',                                 // event logging
  '/api/governance/proposals',                   // governance proposals
  '/api/plugins'                                 // plugin marketplace
];

(async function check() {
  console.log(`Starting health checks against ${API_URL}`);
  for (const path of endpoints) {
    try {
      const res = await fetch(`${API_URL}${path}`);
      console.log(`${path.padEnd(40)} → ${res.status}`);
    } catch (err) {
      console.error(`${path.padEnd(40)} → ERROR`, err.message);
    }
  }
})().catch(err => {
  console.error('Healthcheck script failed', err);
  process.exit(1);
});
