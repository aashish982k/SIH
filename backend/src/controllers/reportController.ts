import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as reportService from '../services/reportService';
import { documentService } from '../services/documentService';
import { sendSuccess, sendError } from '../utils/response';

export async function uploadReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { sendError(res, 'No file uploaded', 400); return; }

    const { well_id, document_type, document_date, description } = req.body;
    const report = await reportService.uploadReport(
      req.file, req.user!.id, well_id, document_type, document_date, description
    );
    
    // Asynchronously process the document for intelligence (NLP, Chunking, Embedding)
    import('../services/documentService').then(({ documentService }) => {
      documentService.processDocument(report.id.toString()).catch(e => console.error(e));
    });

    sendSuccess(res, { report }, 'Report uploaded successfully', 201);
  } catch (err) { next(err); }
}

export async function listReports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const reports = await reportService.listReports(req.user!.id);
    sendSuccess(res, { reports, count: reports.length });
  } catch (err) { next(err); }
}

export async function getReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await reportService.getReportById(req.params.id, req.user!.id);
    if (!report) { sendError(res, 'Report not found', 404); return; }
    sendSuccess(res, { report });
  } catch (err) { next(err); }
}

export async function getReportStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await reportService.getReportById(req.params.id, req.user!.id);
    if (!report) { sendError(res, 'Report not found', 404); return; }
    sendSuccess(res, {
      id: report.id,
      status: report.status,
      processing_error: report.processing_error,
      processing_checkpoint: report.processing_checkpoint,
      well_id: report.well_id,
      well_resolution: report.well_resolution,
      resolved_well_name: report.resolved_well_name,
      resolved_latitude: report.resolved_latitude,
      resolved_longitude: report.resolved_longitude,
      message: report.status === 'processed'
        ? 'Document extracted, indexed, and available in Knowledge.'
        : report.status === 'failed'
          ? report.processing_error ?? 'Document processing failed'
          : 'Document is being extracted and indexed.',
    });
  } catch (err) { next(err); }
}

export async function getGlobalReportStats(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, { stats: await reportService.getGlobalReportStats() });
  } catch (err) { next(err); }
}

export async function listUnresolvedDocuments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'administrator' || req.user!.role === 'admin';
    const documents = await reportService.listUnresolvedDocuments(req.user!.id, isAdmin);
    sendSuccess(res, { documents, count: documents.length });
  } catch (err) { next(err); }
}

export async function resolveWell(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'administrator' || req.user!.role === 'admin';
    const report = await reportService.getReportById(req.params.id, req.user!.id);
    if (!report) { sendError(res, 'Document not found', 404); return; }
    if (report.uploaded_by !== req.user!.id && !isAdmin) {
      sendError(res, 'You are not allowed to resolve this document', 403);
      return;
    }
    const result = await documentService.createWellFromManualInput(req.params.id, req.body, req.user!.id, isAdmin);
    sendSuccess(res, result, 'Document linked to new well');
  } catch (err) { next(err); }
}
