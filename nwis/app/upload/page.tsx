'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatFileSize, formatDate } from '@/lib/utils';
import { 
  FileText, Upload, CheckCircle2, AlertTriangle, Loader2, 
  RefreshCw, Database, Layers, Download, Sparkles, FileCode, Check 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

// ─── Multi-Format Upload Zone ─────────────────────────────────────────────────
function UploadZone({ onUpload, disabled }: { onUpload: (files: File[]) => void; disabled?: boolean }) {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: onUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
        isDragActive
          ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
          : 'border-border/60 bg-muted/20 hover:border-cyan-500/50 hover:bg-cyan-500/5',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
          isDragActive ? 'bg-cyan-500/20' : 'bg-muted'
        )}>
          <Upload className={cn('w-6 h-6 transition-colors', isDragActive ? 'text-cyan-400' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">
            {isDragActive ? 'Drop document here to upload' : 'Click or Drag Document File here'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">WCR, DDR, Mud Logs, BHA or Incident Reports</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">PDF</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">DOC / DOCX</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">TXT</span>
            <span className="text-[10px] text-muted-foreground font-mono">· Max 50 MB</span>
          </div>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <p className="text-xs text-rose-400 mt-2 font-mono">
          Unsupported file format. Please select PDF, DOC, DOCX, or TXT.
        </p>
      )}
    </div>
  );
}

// ─── Upload & Report Generation Page ──────────────────────────────────────────
export default function UploadPage() {
  const { wells, fetchWells } = useAppStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Ingest mode vs Generate mode
  const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('upload');

  // Ingest Form State
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedWellId, setSelectedWellId] = useState<string>('');
  const [docType, setDocType] = useState<string>('DDR');
  const [description, setDescription] = useState<string>('');

  // Report Generation Form State
  const [genWellId, setGenWellId] = useState<string>('');
  const [genReportType, setGenReportType] = useState<string>('WCR');
  const [genTitle, setGenTitle] = useState<string>('');
  const [genNotes, setGenNotes] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ report: any; downloadUrl: string } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const res = await api.reports.list();
      const list = res?.data?.reports || res?.data?.documents || [];
      setDocuments(list);
    } catch (e: any) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchWells();
    loadDocuments();
  }, [fetchWells, loadDocuments]);

  // Set default well for generator once wells load
  useEffect(() => {
    if (wells.length > 0 && !genWellId) {
      setGenWellId(wells[0].id);
    }
  }, [wells, genWellId]);

  // Handle actual document file upload
  const handleUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append('file', file);
      if (selectedWellId) formData.append('well_id', selectedWellId);
      formData.append('document_type', docType);
      formData.append('document_date', new Date().toISOString().split('T')[0]);
      if (description) formData.append('description', description);

      const res = await api.reports.upload(formData);
      const newDoc = res?.data?.report || res?.data?.document;

      setUploadSuccess(`Successfully ingested "${file.name}". Stored and indexed in database.`);
      setDescription('');
      
      // Reload reports from backend
      setTimeout(() => {
        loadDocuments();
      }, 500);
      
      setTimeout(() => setUploadSuccess(null), 6000);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document. Please verify backend connection.');
      setTimeout(() => setUploadError(null), 7000);
    } finally {
      setUploading(false);
    }
  }, [selectedWellId, docType, description, loadDocuments]);

  // Handle Real PDF Report Generation from Database
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genWellId) {
      setGenerateError('Please select a target well for the technical dossier.');
      return;
    }

    try {
      setGenerating(true);
      setGenerateError(null);
      setGeneratedResult(null);

      const wellObj = wells.find(w => w.id === genWellId);
      const title = genTitle.trim() || `${wellObj?.name || 'Well'} Technical Drilling & Hazard Dossier`;

      const res = await api.reports.generate({
        well_id: genWellId,
        title,
        report_type: genReportType,
        summary: genNotes || 'Generated comprehensive engineering and offset hazard report.',
      });

      if (res.data?.report && res.data?.downloadUrl) {
        setGeneratedResult(res.data);
        // Refresh document registry so the newly generated report appears
        loadDocuments();
      } else {
        throw new Error('Report generation succeeded but download link was not received.');
      }
    } catch (err: any) {
      setGenerateError(err?.message || 'Failed to generate technical report. Check server logs.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (docId: string) => {
    const url = api.reports.getDownloadUrl(docId);
    window.open(url, '_blank');
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Operational Document Ingestion & Reporting</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              DATABASE-CONNECTED
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Upload PDF, Word, or Text documentation into central storage or generate verified technical PDF dossiers directly from database records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            disabled={loadingDocs}
            className="gap-2 text-xs font-mono"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loadingDocs && 'animate-spin')} />
            Refresh Registry
          </Button>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Action Column (Upload or Generate) - 5 cols */}
        <div className="xl:col-span-5 space-y-4">
          
          {/* Tab Selector: Upload vs Generate */}
          <div className="flex rounded-xl bg-card border border-border/60 p-1 font-mono text-xs">
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                "flex-1 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === 'upload'
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Document
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={cn(
                "flex-1 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === 'generate'
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Report (PDF)
            </button>
          </div>

          {activeTab === 'upload' ? (
            /* ── UPLOAD DOCUMENT PANEL ── */
            <Card className="border-border/60 bg-card">
              <CardContent className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 font-mono">
                  <Database className="w-4 h-4 text-cyan-400" />
                  INGESTION METADATA & ASSIGNMENT
                </h2>

                {/* Target Well Selector */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Target Well (Optional)
                  </label>
                  <select
                    value={selectedWellId}
                    onChange={(e) => setSelectedWellId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="">General Basin / Multi-Well</option>
                    {wells.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.field}) — {w.status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Type Selector */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Report Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['DDR', 'WCR', 'Mud Log', 'BHA Report', 'Casing/Cement', 'Incident'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDocType(type)}
                        className={cn(
                          'px-2 py-1.5 rounded text-xs font-mono border text-center transition-all cursor-pointer',
                          docType === type
                            ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 font-semibold shadow-xs'
                            : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description Input */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Operational Notes / Section Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Drilling 8.5 inch hole at 3100m, high torque observed"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                {/* Multi-Format Dropzone */}
                <div className="pt-2">
                  <UploadZone onUpload={handleUpload} disabled={uploading} />
                </div>

                {/* Uploading Status Indicator */}
                {uploading && (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Streaming file & processing…</p>
                      <p className="text-muted-foreground">Uploading to secure local storage and registering metadata in database</p>
                    </div>
                  </div>
                )}

                {/* Feedback Alerts */}
                <AnimatePresence>
                  {uploadSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-start gap-2.5 text-xs font-mono"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{uploadSuccess}</span>
                    </motion.div>
                  )}

                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg flex items-start gap-2.5 text-xs font-mono"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ) : (
            /* ── GENERATE REPORT PANEL ── */
            <Card className="border-border/60 bg-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 font-mono">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    GENERATE TECHNICAL REPORT (PDF)
                  </h2>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                    PDFKit Real-Time Engine
                  </span>
                </div>

                <form onSubmit={handleGenerateReport} className="space-y-3.5">
                  {/* Target Well Selector */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Target Well Profile <span className="text-cyan-400">*</span>
                    </label>
                    <select
                      value={genWellId}
                      onChange={(e) => setGenWellId(e.target.value)}
                      required
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-cyan-400"
                    >
                      {wells.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.field || 'Field'}) — {w.status.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Report Type Selector */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Report Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { type: 'WCR', label: 'WCR Completion Dossier' },
                        { type: 'DDR', label: 'DDR Daily Operations' },
                        { type: 'HAZARD', label: 'Offset Hazard Review' },
                        { type: 'LITHO', label: 'Formation Lithology' },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setGenReportType(item.type)}
                          className={cn(
                            'px-2.5 py-1.5 rounded text-xs font-mono border text-left transition-all cursor-pointer',
                            genReportType === item.type
                              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 font-semibold shadow-xs'
                              : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Title (Optional) */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Custom Dossier Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Duliajan-1 Post-Drill Comprehensive Engineering Review"
                      value={genTitle}
                      onChange={(e) => setGenTitle(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-cyan-400 font-sans"
                    />
                  </div>

                  {/* Operational Notes */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Executive Summary / Engineering Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specify drilling parameters, interval risks, or operational objectives to highlight..."
                      value={genNotes}
                      onChange={(e) => setGenNotes(e.target.value)}
                      className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-cyan-400 font-sans resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={generating || !genWellId}
                    className="w-full h-10 font-mono text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating PDF Dossier from Database…
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Compile & Generate Official PDF Report
                      </>
                    )}
                  </Button>
                </form>

                {/* Error Banner */}
                {generateError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg flex items-start gap-2.5 text-xs font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{generateError}</span>
                  </div>
                )}

                {/* Generated Result Preview Card */}
                {generatedResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-[#091512] border border-[#10B981]/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#10B981] font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        PDF REPORT GENERATED SUCCESSFULLY
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatFileSize(generatedResult.report?.file_size_bytes || 5500)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white leading-tight">
                        {generatedResult.report?.title || generatedResult.report?.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Target: <span className="text-white">{generatedResult.report?.well_name}</span> · Status: Verified
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#132A24] flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => window.open(generatedResult.downloadUrl, '_blank')}
                        className="w-full font-mono text-xs bg-[#10B981] hover:bg-[#059669] text-black font-bold shadow-md cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download Generated PDF Report
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Ingested Documents Registry (7 cols) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-cyan-400" />
              DATABASE DOCUMENT REGISTRY ({documents.length})
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Live SQLite Records
            </span>
          </div>

          {loadingDocs ? (
            <div className="py-16 text-center border border-dashed border-border/60 rounded-xl bg-card">
              <Loader2 className="w-7 h-7 text-cyan-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono">Loading ingested documents from database…</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border/60 rounded-xl bg-card">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No reports recorded in database</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a document or generate a technical report to populate the registry</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {documents.map((doc: any) => {
                const status = (doc.status || 'uploaded').toLowerCase();
                const statusColors: Record<string, string> = {
                  processed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  uploaded: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                };
                const statusClass = statusColors[status] || 'bg-muted text-muted-foreground border-border';
                const fileName = doc.file_name || doc.fileName || doc.title || 'Untitled Report';
                const ext = fileName.split('.').pop()?.toUpperCase() || 'PDF';

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-lg border border-border/60 bg-card hover:border-cyan-500/30 transition-all flex items-start gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center justify-center shrink-0 mt-0.5 font-mono text-[9px] text-cyan-300 font-bold">
                      <FileText className="w-4 h-4 text-cyan-400 mb-0.5" />
                      {ext}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-cyan-300 transition-colors">
                          {fileName}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border', statusClass)}>
                            {status}
                          </span>
                          {/* Live Download Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(doc.id)}
                            className="h-6 px-2 text-[10px] font-mono border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer flex items-center gap-1"
                            title="Download document file"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground font-mono">
                        {doc.well_name && (
                          <span className="font-medium text-white">
                            Well: {doc.well_name}
                          </span>
                        )}
                        <span>Category: {doc.document_type || 'Technical'}</span>
                        <span>Size: {formatFileSize(doc.file_size_bytes || 0)}</span>
                        <span>Date: {formatDate(doc.document_date || doc.created_at)}</span>
                      </div>

                      {doc.description && (
                        <p className="text-[11px] text-muted-foreground/80 mt-1.5 line-clamp-1 italic bg-muted/30 px-2 py-0.5 rounded">
                          "{doc.description}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
