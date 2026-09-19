'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatFileSize, formatDate } from '@/lib/utils';
import { FileText, Upload, CheckCircle, Trash2 } from 'lucide-react';
import type { Report } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
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
            {isDragActive ? 'Drop to upload' : 'Drop PDF reports here'}
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

  const handleUpload = useCallback(async (files: File[]) => {
    // Basic simplified mock upload process
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
      
      try {
        await fetch('/api/reports/upload', {
          method: 'POST',
          body: formData,
        });
        
        clearInterval(interval);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });

        // Add to local list (Mock)
        setReports(prev => [{
          id: fileId,
          title: file.name.replace('.pdf', ''),
          type: 'DDR',
          uploadedAt: new Date().toISOString(),
          status: 'saved',
          fileName: file.name,
          fileSizeBytes: file.size,
        }, ...prev]);

        setUploadSuccess('Report uploaded successfully!');
        setTimeout(() => setUploadSuccess(null), 5000);
      } catch (e) {
        clearInterval(interval);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      }
    });
  }, []);

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
          <UploadZone onUpload={handleUpload} />

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

          {/* Success Message */}
          <AnimatePresence>
            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 p-4 bg-risk-low/10 border border-[var(--risk-low)] text-[var(--risk-low)] rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold text-sm">{uploadSuccess}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.uploadedAt)} · {formatFileSize(r.fileSizeBytes)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setReports(prev => prev.filter(x => x.id !== r.id))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
