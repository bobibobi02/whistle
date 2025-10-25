// sentry.config.js
module.exports = {
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: 1.0,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
  ],
};
