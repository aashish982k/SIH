import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

if (!fs.existsSync(env.UPLOADS_DIR)) fs.mkdirSync(env.UPLOADS_DIR, { recursive: true });

const ALLOWED = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.txt']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(Object.assign(new Error('Upload a PDF, PNG, JPG or TXT report.'), { statusCode: 400 }));
  },
});
