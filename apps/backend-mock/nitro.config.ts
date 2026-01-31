import errorHandler from './error';

process.env.COMPATIBILITY_DATE = new Date().toISOString();

// When building on Vercel, force Nitro's `vercel` preset so Vercel uses the
// Build Output API (`.vercel/output`) instead of treating `api/*` as standalone
// Serverless Functions (which won't understand Nitro's `~/*` alias, etc.).
const isVercelBuild =
  process.env.VERCEL === '1' ||
  process.env.VERCEL === 'true' ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.VERCEL_URL);
export default defineNitroConfig({
  ...(isVercelBuild ? { preset: 'vercel' as const } : {}),
  devErrorHandler: errorHandler,
  errorHandler: '~/error',
  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers':
          'Accept, Authorization, Content-Length, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since, X-CSRF-TOKEN, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': '*',
      },
    },
  },
});
