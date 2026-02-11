/**
 * Vercel Serverless API Handler for TexQtic
 *
 * This module wraps the Fastify application as a Vercel serverless function.
 * - Fastify instance is initialized once at module scope (cold start optimization)
 * - Does NOT call fastify.listen() — Vercel manages server lifecycle
 * - Exports handler that emits requests to Fastify's internal request handler
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { config } from '../server/src/config/index.js';
import authRoutes from '../server/src/routes/auth.js';
import controlRoutes from '../server/src/routes/control.js';
import tenantRoutes from '../server/src/routes/tenant.js';
import adminCartSummariesRoutes from '../server/src/routes/admin-cart-summaries.js';

/**
 * Type guard for Fastify-like error objects.
 * Safely narrows unknown error to structured error with optional Fastify properties.
 */
type FastifyErrorLike = Error & {
  statusCode?: number;
  code?: string;
  validation?: unknown;
};

function toErrorLike(err: unknown): FastifyErrorLike {
  if (err instanceof Error) {
    return err as FastifyErrorLike;
  }
  // Fallback for non-Error objects
  return new Error(String(err)) as FastifyErrorLike;
}

// Initialize Fastify instance at module scope (executed once per cold start)
const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    // Disable pino-pretty in serverless (not installed in production)
    transport: undefined,
  },
});

// Security plugins
await fastify.register(fastifyHelmet, {
  contentSecurityPolicy: false, // Disable CSP (configure separately if needed)
});

// CORS configuration with allowlist + Vercel preview support
const allowedOrigins = config.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());

await fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      cb(null, true);
      return;
    }

    // Check explicit allowlist
    if (allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }

    // Allow Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      cb(null, true);
      return;
    }

    // Reject all other origins
    cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await fastify.register(fastifyCookie, {
  secret: config.JWT_REFRESH_SECRET,
  parseOptions: {},
});

// JWT for tenant realm
await fastify.register(fastifyJwt, {
  secret: config.JWT_ACCESS_SECRET,
  namespace: 'tenant',
  jwtVerify: 'tenantJwtVerify',
  jwtSign: 'tenantJwtSign',
});

// JWT for admin realm
await fastify.register(fastifyJwt, {
  secret: config.JWT_ADMIN_ACCESS_SECRET,
  namespace: 'admin',
  jwtVerify: 'adminJwtVerify',
  jwtSign: 'adminJwtSign',
});

// Wave 0-B: Realm guard middleware (must run after JWT registration)
import { realmGuardMiddleware } from '../server/src/middleware/realmGuard.js';
fastify.addHook('onRequest', realmGuardMiddleware);

// Health check endpoint
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root API info endpoint
fastify.get('/api', async () => {
  return {
    name: 'TexQtic API',
    version: '0.1.0',
    status: 'running',
  };
});

// Kill switch check
fastify.addHook('onRequest', async (request, reply) => {
  if (config.KILL_SWITCH_ALL && !request.url.startsWith('/api/health')) {
    reply.code(503).send({
      success: false,
      error: {
        code: 'KILL_SWITCH_ACTIVE',
        message: 'Platform is temporarily unavailable for maintenance',
      },
    });
  }
});

// Register application routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(controlRoutes, { prefix: '/api/control' });
await fastify.register(tenantRoutes, { prefix: '/api' });
await fastify.register(adminCartSummariesRoutes, { prefix: '/api/control/marketplace' });

// Error handler
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);

  const err = toErrorLike(error);
  const statusCode =
    typeof err.statusCode === 'number' && isFinite(err.statusCode) ? err.statusCode : 500;

  reply.code(statusCode).send({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// Ensure Fastify is ready before handling requests
await fastify.ready();

/**
 * Vercel Serverless Handler
 *
 * This handler is invoked for each incoming request.
 * It delegates to Fastify's internal request handler without calling .listen()
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Emit request to Fastify's internal HTTP server
  // This bypasses the need for fastify.listen()
  await fastify.server.emit('request', req, res);
}
