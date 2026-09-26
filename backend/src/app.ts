import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorMiddleware } from './middleware/errorMiddleware';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import apiRoutes from './routes/api';

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorMiddleware);

export default app;
