'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Check, FileUp, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { Btn, Depth, Empty, EventTag, Field, Panel, PanelHeader, Spinner, inputCls } from '@/components/kit';
import { cn, depth, EVENT_LABEL, FT_PER_M, timeAgo } from '@/lib/format';
import { useApp } from '@/lib/store';
import type { EventType, Meta, Well } from '@/lib/types';

interface DocRow {
  id: string; title: string; file_name: string; document_type: string; status: string; page_count: number | null;
  extraction_method: string | null; error_message: string | null; created_at: string; well_id: string | null; well_name: string | null;
  pending: string | number | null; confirmed: string | number | null; rejected: string | number | null;
}
interface Item {
  id: string; status: 'pending' | 'confirmed' | 'rejected'; confidence: number; source_page: number | null; source_quote: string | null;
  payload: { event_type: EventType; depth_md_ft: number; depth_as_reported: string; formation_name: string | null; description: string; cause: string | null; mitigation: string | null; outcome: string | null; npt_hours: number | null; severity: string };
}
interface DocDetail extends DocRow { items: Item[]; }

const STEPS = ['uploaded', 'processing', 'review', 'processed'];

export default function ReportsPage() {
  const docs = useApi<DocRow[]>('/documents', { refreshMs: 4000 });
  const { data: wells } = useApi<Well[]>('/wells');
  const [selected, setSelected] = useState<string | null>(null);
  const [docType, setDocType] = useState('WCR');
  const [wellId, setWellId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (files: File[]) => {
    setError(''); setUploading(true);
    try {
      for (const f of files) {
        const form = new FormData();
        form.append('file', f);
        form.append('document_type', docType);
        if (wellId) form.append('well_id', wellId);
        const d = await api<DocRow>('/documents', { method: 'POST', body: form });
        setSelected(d.id);
      }
      await docs.reload();
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }, [docType, wellId, docs]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'text/plain': ['.txt'] } });

  useEffect(() => { if (!selected && docs.data?.length) setSelected(docs.data[0].id); }, [docs.data, selected]);

  return (
    <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <Panel className="p-4">
          <div className="label-caps">Report → knowledge</div>
          <h1 className="mt-0.5 font-display text-[22px] font-bold">Digitise a report</h1>
          <p className="mt-1 text-[13px] text-muted-fg">Upload a WCR, DDR or mud log. NWIS reads each page, extracts the drilling problems with the page they came from, and asks you to confirm before anything reaches the offset history.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Report type">
              <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
                <option value="WCR">Well completion report</option><option value="DDR">Daily drilling report</option><option value="mud_log">Mud log</option><option value="other">Other</option>
              </select>
            </Field>
            <Field label="Well (optional)">
              <select id="doc-well" value={wellId} onChange={(e) => setWellId(e.target.value)} className={inputCls}>
                <option value="">Detect from report</option>
                {wells?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
          </div>
          <div {...getRootProps()} className={cn('mt-3 grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            isDragActive ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-accent')}>
            <input {...getInputProps()} />
            {uploading ? <Loader2 className="size-6 animate-spin text-accent" /> : <FileUp className="size-6 text-faint" />}
            <div className="mt-2 text-[13.5px] font-medium">{isDragActive ? 'Drop to upload' : 'Drop PDF, image or text files here, or click to browse'}</div>
            <div className="mt-0.5 text-[12px] text-faint">Scanned pages: upload as PNG/JPG for OCR. Samples are in backend/sample-reports.</div>
          </div>
          {error && <p role="alert" className="mt-2 text-[12.5px] text-[var(--r-crit)]">{error}</p>}
        </Panel>

        <Panel>
          <PanelHeader eyebrow={`${docs.data?.length ?? 0} uploaded`} title="Reports" />
          {!docs.data ? <Spinner /> : docs.data.length === 0 ? <Empty title="No uploads yet">Upload a report to start building the knowledge base.</Empty> : (
            <div className="border-t border-line">
              {docs.data.map((d) => (
                <button key={d.id} onClick={() => setSelected(d.id)} className={cn('grid w-full gap-1 border-b border-line px-4 py-2.5 text-left hover:bg-panel-2', selected === d.id && 'bg-accent-soft')}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{d.title}</span>
                    <StatusChip status={d.status} pending={Number(d.pending ?? 0)} />
                  </div>
                  <div className="text-[12px] text-faint">{d.document_type} · {d.well_name ?? 'well not identified'} · {d.page_count ?? '…'} pages · {timeAgo(d.created_at)}</div>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {selected ? <DocumentReview id={selected} wells={wells ?? []} onChanged={docs.reload} /> : <Panel><Empty title="Choose a report">Its extracted events will appear here for review.</Empty></Panel>}
    </div>
  );
}

function StatusChip({ status, pending }: { status: string; pending: number }) {
  const map: Record<string, [string, string]> = {
    uploaded: ['Queued', 'var(--fg-faint)'], processing: ['Reading…', 'var(--accent)'], review: [`${pending} to review`, 'var(--r-med)'],
    processed: ['Done', 'var(--r-low)'], failed: ['Failed', 'var(--r-crit)'],
  };
  const [label, c] = map[status] ?? [status, 'var(--fg-faint)'];
  return <span className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: c, background: `color-mix(in oklab, ${c} 13%, transparent)` }}>{label}</span>;
}

function DocumentReview({ id, wells, onChanged }: { id: string; wells: Well[]; onChanged: () => void }) {
  const { data, reload } = useApi<DocDetail>(`/documents/${id}`, { refreshMs: 3000 });
  const { data: meta } = useApi<Meta>('/meta');
  if (!data) return <Panel><Spinner label="Opening report" /></Panel>;
  const stepIdx = data.status === 'failed' ? -1 : STEPS.indexOf(data.status);
  const pending = data.items.filter((i) => i.status === 'pending');
  const done = data.items.filter((i) => i.status !== 'pending');

  async function setWell(wellId: string) {
    await api(`/documents/${id}/well`, { method: 'POST', json: { wellId } });
    await reload(); onChanged();
  }

  return (
    <div className="grid content-start gap-4">
      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="label-caps">{data.document_type} · {data.file_name}</div>
            <h2 className="font-display text-[20px] font-bold">{data.title}</h2>
            <div className="mt-0.5 text-[12.5px] text-muted-fg">{data.page_count ?? '…'} pages · extraction: {data.extraction_method ?? 'pending'}</div>
          </div>
          <Field label="Belongs to well">
            <select id="review-well" value={data.well_id ?? ''} onChange={(e) => void setWell(e.target.value)} className={cn(inputCls, 'h-8 w-48', !data.well_id && 'border-[var(--r-med)]')}>
              <option value="" disabled>Choose well…</option>
              {wells.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Processing steps">
          {['Uploaded', 'Reading pages', 'Engineer review', 'In knowledge base'].map((s, i) => (
            <li key={s} className="grid gap-1.5">
              <div className="h-1.5 rounded-full" style={{ background: i <= stepIdx ? 'var(--accent)' : 'var(--inset)' }} />
              <span className={cn('text-[12px]', i <= stepIdx ? 'text-fg' : 'text-faint')}>{s}</span>
            </li>
          ))}
        </ol>
        {data.status === 'failed' && <p className="mt-3 text-[13px] text-[var(--r-crit)]">{data.error_message}</p>}
        {!data.well_id && data.status === 'review' && <p className="mt-3 text-[12.5px] text-[var(--r-med)]">The report names a well that is not in the register. Choose the well before confirming events.</p>}
      </Panel>

      {data.status === 'processing' || data.status === 'uploaded' ? <Panel><Spinner label="Reading pages and extracting events" /></Panel> : null}

      {pending.map((it) => <ItemEditor key={it.id} item={it} eventTypes={meta?.eventTypes ?? []} formations={meta?.formations.map((f) => f.name) ?? []} onDone={async () => { await reload(); onChanged(); }} />)}

      {done.length > 0 && (
        <Panel>
          <PanelHeader eyebrow="Reviewed" title={`${done.filter((d) => d.status === 'confirmed').length} confirmed · ${done.filter((d) => d.status === 'rejected').length} rejected`} />
          <div className="border-t border-line">
            {done.map((it) => (
              <div key={it.id} className="flex items-center gap-3 border-b border-line px-4 py-2 text-[13px] last:border-b-0">
                {it.status === 'confirmed' ? <Check className="size-4 text-[var(--r-low)]" /> : <X className="size-4 text-faint" />}
                <EventTag type={it.payload.event_type} />
                <Depth ft={it.payload.depth_md_ft} />
                <span className="truncate text-muted-fg">{it.payload.description}</span>
                <span className="ml-auto text-[11.5px] text-faint">p.{it.source_page}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {data.status === 'processed' && data.items.length === 0 && <Panel><Empty title="No drilling problems found">The text was indexed for search, but no events were detected.</Empty></Panel>}
    </div>
  );
}

function ItemEditor({ item, eventTypes, formations, onDone }: { item: Item; eventTypes: Array<{ key: string; label: string }>; formations: string[]; onDone: () => Promise<void> }) {
  const unit = useApp((s) => s.unit);
  const [p, setP] = useState(item.payload);
  const [depthText, setDepthText] = useState(depth(item.payload.depth_md_ft, unit, { suffix: false }).replace(/,/g, ''));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const conf = Math.round(item.confidence * 100);

  async function review(action: 'confirm' | 'reject') {
    setBusy(action); setErr('');
    try {
      const ft = unit === 'm' ? Number(depthText) * FT_PER_M : Number(depthText);
      await api(`/documents/items/${item.id}/review`, { method: 'POST', json: { action, edits: action === 'confirm' ? { ...p, depth_md_ft: Math.round(ft * 10) / 10 } : undefined } });
      await onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <EventTag type={p.event_type} />
        <span className="text-[12.5px] text-muted-fg">Page {item.source_page} · reported as “{p.depth_as_reported}”</span>
        <span className="ml-auto flex items-center gap-2 text-[12px]">
          <span className="text-faint">Confidence</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-inset"><span className="block h-full rounded-full" style={{ width: `${conf}%`, background: conf >= 70 ? 'var(--r-low)' : conf >= 45 ? 'var(--r-med)' : 'var(--r-crit)' }} /></span>
          <span className="readout">{conf}%</span>
        </span>
      </div>
      {item.source_quote && <blockquote className="mt-3 border-l-2 border-line-strong pl-3 text-[13px] italic text-muted-fg">“{item.source_quote}”</blockquote>}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Problem">
          <select id={`t-${item.id}`} value={p.event_type} onChange={(e) => setP({ ...p, event_type: e.target.value as EventType })} className={inputCls}>
            {eventTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <Field label={`Depth (${unit} MD)`}>
          <input id={`d-${item.id}`} value={depthText} onChange={(e) => setDepthText(e.target.value)} inputMode="decimal" className={cn(inputCls, 'readout')} />
        </Field>
        <Field label="Formation">
          <select id={`f-${item.id}`} value={p.formation_name ?? ''} onChange={(e) => setP({ ...p, formation_name: e.target.value || null })} className={cn(inputCls, !p.formation_name && 'border-[var(--r-med)]')}>
            <option value="">Not identified</option>
            {formations.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-3"><Field label="What happened"><textarea id={`desc-${item.id}`} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} rows={2} className={cn(inputCls, 'h-auto py-2')} /></Field></div>
        <div className="sm:col-span-2"><Field label="What the crew did"><input id={`m-${item.id}`} value={p.mitigation ?? ''} onChange={(e) => setP({ ...p, mitigation: e.target.value || null })} className={inputCls} /></Field></div>
        <Field label="NPT (hours)"><input id={`n-${item.id}`} value={p.npt_hours ?? ''} onChange={(e) => setP({ ...p, npt_hours: e.target.value ? Number(e.target.value) : null })} inputMode="decimal" className={cn(inputCls, 'readout')} /></Field>
        <div className="sm:col-span-3"><Field label="Outcome"><input id={`o-${item.id}`} value={p.outcome ?? ''} onChange={(e) => setP({ ...p, outcome: e.target.value || null })} className={inputCls} /></Field></div>
      </div>
      {err && <p role="alert" className="mt-2 text-[12.5px] text-[var(--r-crit)]">{err}</p>}
      <div className="mt-3 flex gap-2">
        <Btn variant="primary" loading={busy === 'confirm'} onClick={() => review('confirm')}><Check className="size-4" />Confirm {EVENT_LABEL[p.event_type]?.toLowerCase()}</Btn>
        <Btn variant="ghost" loading={busy === 'reject'} onClick={() => review('reject')}>Reject</Btn>
      </div>
    </Panel>
  );
}
