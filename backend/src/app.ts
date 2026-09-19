import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { errorMiddleware } from './middleware/errorMiddleware';

// Routes
import healthRoutes  from './routes/healthRoutes';
import authRoutes    from './routes/authRoutes';
import wellRoutes    from './routes/wellRoutes';
import eventRoutes   from './routes/eventRoutes';
import reportRoutes  from './routes/reportRoutes';
import searchRoutes  from './routes/searchRoutes';
import intelligenceRoutes from './routes/intelligenceRoutes';
import riskRoutes from './routes/riskRoutes';
import recommendationRoutes from './routes/recommendationRoutes';

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(env.UPLOADS_DIR)));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/health',  healthRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/wells',   wellRoutes);
app.use('/api/events',  eventRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search',  searchRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/recommendations', recommendationRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Centralized error handler ─────────────────────────────────
app.use(errorMiddleware);

export default app;
