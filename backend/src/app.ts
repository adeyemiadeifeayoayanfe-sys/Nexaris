import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import type { HttpRequest, HttpResponse } from './types/http.js';

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL
  })
);
app.use(express.json());

app.get('/', (_request: HttpRequest, response: HttpResponse) => {
  response.json({
    name: 'Nexaris Technologies API',
    status: 'setup-only'
  });
});

app.use('/api', apiRouter);
app.use(errorHandler);
