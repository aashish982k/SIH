'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatFileSize, formatDate } from '@/lib/utils';
import { FileText, Upload, CheckCircle, Trash2 } from 'lucide-react';
import type { Report } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUpload, disabled }: { onUpload: (files: File[]) => void; disabled: boolean }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    disabled,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
        disabled && 'pointer-events-none opacity-60',
        isDragActive
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-primary/3'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
          isDragActive ? 'bg-primary/15' : 'bg-muted'
        )}>
          <Upload className={cn('w-7 h-7 transition-colors', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {disabled ? 'Loading available wells…' : isDragActive ? 'Drop to upload' : 'Drop PDF reports here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse — WCR, DDR, IADC reports</p>
          <p className="text-xs text-muted-foreground mt-1">PDF only · Max 50 MB per file</p>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Page ──────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const mapReport = useCallback((report: any): Report => ({
    id: report.id,
    title: report.file_name?.replace(/\.[^.]+$/, '') ?? 'Untitled report',
    type: report.document_type === 'mud_log' ? 'Other' : report.document_type ?? 'Other',
    wellId: report.well_id ?? undefined,
    uploadedAt: report.created_at,
    status: report.status === 'processed' ? 'saved' : report.status === 'failed' ? 'error' : report.status,
    fileName: report.file_name,
    fileSizeBytes: Number(report.file_size_bytes ?? 0),
  }), []);

  const loadReports = useCallback(async () => {
    try {
      const response = await fetch('/api/reports', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load reports');
      setReports((payload.data?.reports ?? []).map(mapReport));
    } catch (error) {
      console.error('Unable to load reports:', error);
    }
  }, [mapReport]);

  const pollReportStatus = useCallback((reportId: string) => {
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/reports/${reportId}/status`, { cache: 'no-store' });
        const payload = await response.json();
        const status = payload.data?.status;
        if (status) {
          setReports(prev => prev.map(report => report.id === reportId
            ? { ...report, status: status === 'processed' ? 'saved' : status === 'failed' ? 'error' : status }
            : report));
        }
        if (status === 'processed' || status === 'failed' || attempts >= 30) {
          window.clearInterval(timer);
        }
      } catch {
        if (attempts >= 30) window.clearInterval(timer);
      }
    }, 4000);
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleUpload = useCallback(async (files: File[]) => {
    files.forEach(async (file, i) => {
      const fileId = `upload-${Date.now()}-${i}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = (prev[fileId] || 0) + Math.random() * 20 + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return { ...prev, [fileId]: 100 };
          }
          return { ...prev, [fileId]: Math.min(newProgress, 99) };
        });
      }, 300);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'DDR');
      
      try {
        const response = await fetch('/api/reports/upload', {
          method: 'POST',
          body: formData,
        });
        
        const resData = await response.json();
        
        if (!response.ok) {
          throw new Error(resData.error || 'Upload failed');
        }
        
        clearInterval(interval);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });

        const uploadedReport = resData.data?.report;
        if (uploadedReport) {
          setReports(prev => [mapReport(uploadedReport), ...prev.filter(r => r.id !== uploadedReport.id)]);
          pollReportStatus(uploadedReport.id);
        } else {
          await loadReports();
        }

        setUploadSuccess('Report uploaded successfully.');
        setTimeout(() => setUploadSuccess(null), 5000);
      } catch (e: any) {
        clearInterval(interval);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
        setUploadSuccess(e.message || 'Upload failed. Check your connection and try again.');
        setTimeout(() => setUploadSuccess(null), 5000);
      }
    });
  }, [loadReports, mapReport, pollReportStatus]);

  function removeReport(id: string) {
    setReports(prev => prev.filter(x => x.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground">Upload Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Submit drilling reports securely for processing.</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Upload Column */}
        <div className="space-y-4">
          <UploadZone onUpload={handleUpload} disabled={false} />

          {/* Progress Indication */}
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <Card key={id} className="border-border/60">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span>Uploading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          ))}

          {/* Success / error message */}
          <div aria-live="polite">
            <AnimatePresence>
              {uploadSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn(
                    'flex items-center gap-2 p-4 rounded-lg',
                    uploadSuccess.includes('failed')
                      ? 'bg-risk-high/10 border border-[var(--risk-high)] text-[var(--risk-high)]'
                      : 'bg-risk-low/10 border border-[var(--risk-low)] text-[var(--risk-low)]'
                  )}>
                    <CheckCircle aria-hidden="true" className="w-5 h-5" />
                    <span className="font-semibold text-sm">{uploadSuccess}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* My Uploads Column */}
        <div>
          <h2 className="font-semibold text-foreground mb-4">My Uploads</h2>
          {reports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-muted/10">
              <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {reports.map(r => (
                  <motion.div
                    key={r.id}
                initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText aria-hidden="true" className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatDate(r.uploadedAt)} · {formatFileSize(r.fileSizeBytes)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {confirmDeleteId === r.id ? (
                        <>
                          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => removeReport(r.id)}>
                            Delete
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete report ${r.title}`}
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(r.id)}
                        >
                          <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
