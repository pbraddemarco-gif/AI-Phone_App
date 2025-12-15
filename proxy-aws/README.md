# AI Proxy AWS (Elastic Beanstalk)

A minimal, production-ready reverse proxy for the AI Production Monitor, designed for quick deployment on AWS Elastic Beanstalk.

## Features
- Express + `http-proxy-middleware`
- Health check at `/health`
- HTTPS enforcement (Nginx redirect)
- Rate limiting + CORS + security headers
- Path-based upstreams via environment variables

## Deploy (Elastic Beanstalk)
1. Create an EB application with the Node.js platform (Node 18).
2. Zip the contents of this `proxy-aws` folder and upload as a new version.
3. Set environment variables:
   - `API_DATA_TARGET` (e.g., https://lowcost-env...elasticbeanstalk.com)
   - `API_AUTH_TARGET` (e.g., https://app.automationintellect.com/api)
   - `API_PLANT_TARGET` (e.g., https://app.automationintellect.com/api/plant)
   - `CORS_ALLOW_ORIGINS` (comma-separated origins, e.g., https://yourapp.example.com)
   - `RATE_LIMIT_WINDOW_MS` (optional, default 300000)
   - `RATE_LIMIT_MAX` (optional, default 300)
4. Attach an ACM certificate to the EB load balancer and configure Route 53 DNS for your domain.
5. Health check path: `/health` (HTTP 200).

## Endpoints
- `/api/data` → `API_DATA_TARGET`
- `/api/auth` → `API_AUTH_TARGET`
- `/api/plant` → `API_PLANT_TARGET`

## Local Test
```bash
npm install
npm start
# http://localhost:3001/health
```

## Notes
- EB config `.ebextensions/01-nginx-https.config` enforces HTTP→HTTPS redirect.
- Set `app.set('trust proxy', 1)` to ensure accurate client IP behind ALB.
- Consider attaching AWS WAF (optional) for additional protections.