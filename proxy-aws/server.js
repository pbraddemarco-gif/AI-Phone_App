// Lightweight AWS-ready reverse proxy
// - Express + http-proxy-middleware
// - Health check at /health
// - Rate limiting, CORS, security headers
// - Path-based upstreams configured via env vars

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');

const PORT = process.env.PORT || 3001;

// Upstream targets (set per customer/env)
const API_DATA_TARGET = process.env.API_DATA_TARGET || 'https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com';
const API_AUTH_TARGET = process.env.API_AUTH_TARGET || 'https://app.automationintellect.com/api';
const API_PLANT_TARGET = process.env.API_PLANT_TARGET || 'https://app.automationintellect.com/api/plant';

const ALLOWED_ORIGINS = (process.env.CORS_ALLOW_ORIGINS || '').split(',').filter(Boolean);

const app = express();

// Trust proxy for correct client IP on AWS ALB/ELB
app.set('trust proxy', 1);

// Basic security + performance middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(compression());
app.use(morgan('combined'));

// Strict CORS: allow only configured origins
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser clients
    if (ALLOWED_ORIGINS.length === 0) return cb(null, true); // default open if not configured
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: false,
}));

// Rate limit per-IP
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000), // 5 minutes
  max: Number(process.env.RATE_LIMIT_MAX || 300), // 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health endpoint (used by AWS ELB/EB)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Redirect root to status page
app.get('/', (req, res) => {
  res.status(200).send('AI Proxy is running. See /health.');
});

// Proxies
// /api/data -> data upstream (Elastic Beanstalk)
app.use('/api/data',
  createProxyMiddleware({
    target: API_DATA_TARGET,
    changeOrigin: true,
    logLevel: 'warn',
    pathRewrite: (path) => path.replace(/^\/api\/data/, ''),
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('X-Forwarded-By', 'ai-proxy');
    },
  })
);

// /api/auth -> auth upstream (Automation Intellect API)
app.use('/api/auth',
  createProxyMiddleware({
    target: API_AUTH_TARGET,
    changeOrigin: true,
    logLevel: 'warn',
    pathRewrite: (path) => path.replace(/^\/api\/auth/, ''),
  })
);

// /api/plant -> plant upstream
app.use('/api/plant',
  createProxyMiddleware({
    target: API_PLANT_TARGET,
    changeOrigin: true,
    logLevel: 'warn',
    pathRewrite: (path) => path.replace(/^\/api\/plant/, ''),
  })
);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Proxy error:', err.message);
  res.status(502).json({ error: 'Bad Gateway' });
});

app.listen(PORT, () => {
  console.log(`🔁 AWS proxy listening on http://localhost:${PORT}`);
  console.log('Upstreams:', {
    data: API_DATA_TARGET,
    auth: API_AUTH_TARGET,
    plant: API_PLANT_TARGET,
  });
});
