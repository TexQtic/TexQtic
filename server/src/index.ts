import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { config } from './config/index.js';
import controlRoutes from './routes/control.js';
import tenantRoutes from './routes/tenant.js';

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

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      config.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Security plugins
await fastify.register(fastifyHelmet, {
  contentSecurityPolicy: false, // Disable for dev; configure for production
});

await fastify.register(fastifyCors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
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

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root route
fastify.get('/', async () => {
  return {
    name: 'TexQtic API',
    version: '0.1.0',
    status: 'running',
  };
});

// Kill switch check
fastify.addHook('onRequest', async (request, reply) => {
  if (config.KILL_SWITCH_ALL && !request.url.startsWith('/health')) {
    reply.code(503).send({
      success: false,
      error: {
        code: 'KILL_SWITCH_ACTIVE',
        message: 'Platform is temporarily unavailable for maintenance',
      },
    });
  }
});

// Import routes
await fastify.register(controlRoutes, { prefix: '/api/control' });
await fastify.register(tenantRoutes, { prefix: '/api' });

// Error handler
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);

  const err = toErrorLike(error);
  const statusCode = typeof err.statusCode === 'number' && isFinite(err.statusCode)
    ? err.statusCode
    : 500;

  reply.code(statusCode).send({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.PORT, host: config.HOST });
    console.log(`🚀 Server running at http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
