// Simple development reverse proxy to avoid CORS issues on web.
// Usage (PowerShell):
//   npm run proxy
// In another terminal:
//   $env:EXPO_PUBLIC_API_BASE="http://localhost:3001/api/data"; $env:EXPO_PUBLIC_AUTH_BASE="http://localhost:3001/api/auth"; npm start
// Optionally set upstream overrides:
//   $env:UPSTREAM_DATA="http://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com"
//   $env:UPSTREAM_AUTH="https://app.automationintellect.com/api"

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

const UPSTREAM_DATA =
  process.env.UPSTREAM_DATA || 'http://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com';
const UPSTREAM_AUTH = process.env.UPSTREAM_AUTH || 'https://app.automationintellect.com/api';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');

// Logging
app.use(morgan('combined'));

// Hardened CORS first so preflights always get headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow all localhost origins for development
  if (
    ALLOWED_ORIGINS.includes('*') ||
    (origin && (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')))
  ) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Basic rate limiting (dev only) — loosened to avoid noisy 429s during dev
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, data: UPSTREAM_DATA, auth: UPSTREAM_AUTH });
});

// Auth endpoints proxy
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: UPSTREAM_AUTH,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Strip /api/auth prefix
      let newPath = path.replace(/^\/api\/auth/, '');
      // Append api-version query param if not already present
      const separator = newPath.includes('?') ? '&' : '?';
      if (!newPath.includes('api-version=')) {
        newPath += `${separator}api-version=1.0`;
      }
      return newPath;
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[proxy ➡️] ${req.method} ${req.originalUrl}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        console.log(`[proxy ⬅️] ${req.method} ${req.originalUrl} -> ${proxyRes.statusCode}`);
        if (proxyRes.statusCode >= 400) {
          console.log(`[proxy ⛔] Response body: ${body}`);
        }
      });
    },
  })
);

// Plant endpoints proxy (forwards /api/plant/* to auth_base/api/plant/*)
app.use(
  '/api/plant',
  createProxyMiddleware({
    target: 'https://app.automationintellect.com',
    changeOrigin: true,
    logLevel: 'debug',
  })
);

// Data endpoints proxy
app.use(
  '/api/data',
  createProxyMiddleware({
    target: UPSTREAM_DATA,
    changeOrigin: true,
    pathRewrite: { '^/api/data': '' },
    logLevel: 'warn',
  })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Proxy error:`, err);
  res.status(500).json({ error: 'Proxy server error', details: err.message });
});

process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
  console.error('Stack:', err.stack);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection:`, reason);
  console.error('Promise:', promise);
  // Don't exit - keep server running
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔁 Dev proxy listening on http://0.0.0.0:${PORT}`);
  console.log(`   Local access: http://localhost:${PORT}`);
  console.log(`   Android emulator access: http://10.0.2.2:${PORT}`);
  console.log('Forwarding /api/data ->', UPSTREAM_DATA);
  console.log('Forwarding /api/auth ->', UPSTREAM_AUTH);
  console.log('Forwarding /api/plant ->', UPSTREAM_AUTH + '/plant');
});
