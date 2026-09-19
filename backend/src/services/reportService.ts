import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { query, queryOne } from '../config/db';

export async function uploadReport(
  file: Express.Multer.File,
  userId: string,
  wellId?: string,
  documentType?: string,
  documentDate?: string,
  description?: string
): Promise<any> {
  const id = uuidv4();
  const filePath = path.relative(process.cwd(), file.path);

  await query(
    `INSERT INTO documents (id, well_id, uploaded_by, document_type, file_name, file_path, file_size_bytes, document_date, description, status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      id, wellId ?? null, userId,
      documentType ?? 'other', file.originalname, filePath,
      file.size, documentDate ?? null, description ?? null, 'uploaded',
    ]
  );

  return queryOne('SELECT * FROM documents WHERE id = ?', [id]);
}

export async function listReports(userId: string): Promise<any[]> {
  return query(
    `SELECT d.*, w.name AS well_name, u.name AS uploaded_by_name
     FROM documents d
     LEFT JOIN wells w ON d.well_id = w.id
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.uploaded_by = ?
     ORDER BY d.created_at DESC`,
    [userId]
  );
}

export async function getReportById(id: string, userId: string): Promise<any | null> {
  const doc = await queryOne(
    `SELECT d.*, w.name AS well_name, u.name AS uploaded_by_name
     FROM documents d
     LEFT JOIN wells w ON d.well_id = w.id
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.id = ? AND d.uploaded_by = ?`,
    [id, userId]
  );
  return doc ?? null;
}
