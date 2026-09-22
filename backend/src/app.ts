import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import type { HttpRequest, HttpResponse } from './types/http.js';

export const app = express();

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.'
  },
  skip: (request) =>
    request.path === '/health' ||
    request.path === '/api/health'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication requests. Please try again later.'
  }
});

const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many submissions. Please wait before submitting again.'
  }
});

app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.FRONTEND_URL
  })
);

app.use(express.json({ limit: '1mb' }));

app.use(generalApiLimiter);

app.get('/', (_request: HttpRequest, response: HttpResponse) => {
  response.json({
    name: 'Nexaris Technologies API',
    status: 'setup-only'
  });
});

app.use('/api/auth', authLimiter);
app.use('/api/public/project-requests', publicSubmissionLimiter);
app.use('/api/public/job-applications', publicSubmissionLimiter);

app.use('/api', apiRouter);
app.use(errorHandler);
