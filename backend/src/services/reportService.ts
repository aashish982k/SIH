import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { eq, desc, getTableColumns, sql, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import { documents, wells, users } from '../db/schema';

export type Document = typeof documents.$inferSelect;

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

  try {
    await db.insert(documents).values({
      id,
      well_id:         wellId || null,
      uploaded_by:     userId,
      document_type:   (documentType ?? 'other') as Document['document_type'],
      file_name:       file.originalname,
      file_path:       filePath,
      file_size_bytes: file.size,
      document_date:   documentDate ? new Date(documentDate) : null,
      description:     description ?? null,
      status:          'uploaded',
    });
  } catch (error) {
    await fs.unlink(file.path).catch(() => undefined);
    throw error;
  }

  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return doc;
}

export async function listReports(_userId: string): Promise<any[]> {
  const rows = await db.select({
    ...getTableColumns(documents),
    well_name: wells.name,
    uploaded_by_name: users.name,
  })
    .from(documents)
    .leftJoin(wells, eq(documents.well_id, wells.id))
    .leftJoin(users, eq(documents.uploaded_by, users.id))
    .orderBy(desc(documents.created_at));
    
  return rows;
}

export async function getGlobalReportStats(): Promise<{
  total: number; processed: number; processing: number; failed: number; uploaded: number;
}> {
  const [row] = await db.select({
    total: sql<number>`COUNT(*)`,
    processed: sql<number>`SUM(${documents.status} = 'processed')`,
    processing: sql<number>`SUM(${documents.status} = 'processing')`,
    failed: sql<number>`SUM(${documents.status} = 'failed')`,
    uploaded: sql<number>`SUM(${documents.status} = 'uploaded')`,
  }).from(documents);
  return {
    total: Number(row?.total ?? 0),
    processed: Number(row?.processed ?? 0),
    processing: Number(row?.processing ?? 0),
    failed: Number(row?.failed ?? 0),
    uploaded: Number(row?.uploaded ?? 0),
  };
}

export async function getReportById(id: string, _userId: string): Promise<any | null> {
  const [doc] = await db.select({
    ...getTableColumns(documents),
    well_name: wells.name,
    uploaded_by_name: users.name,
  })
    .from(documents)
    .leftJoin(wells, eq(documents.well_id, wells.id))
    .leftJoin(users, eq(documents.uploaded_by, users.id))
    .where(eq(documents.id, id))
    .limit(1);

  return doc ?? null;
}

export async function listUnresolvedDocuments(userId: string, isAdmin: boolean): Promise<any[]> {
  const ownership = isAdmin ? undefined : eq(documents.uploaded_by, userId);
  return db.select({
    ...getTableColumns(documents),
    uploaded_by_name: users.name,
  })
    .from(documents)
    .leftJoin(users, eq(documents.uploaded_by, users.id))
    .where(ownership ? and(isNull(documents.well_id), ownership) : isNull(documents.well_id))
    .orderBy(desc(documents.created_at));
}
