'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileText, Search, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { useApi } from '@/hooks/useApi';
import { Btn, Depth, Empty, EventTag, Panel, PanelHeader, Segmented, SeverityPill, inputCls } from '@/components/kit';
import { cn, OUTCOME_COLOR, OUTCOME_LABEL } from '@/lib/format';
import type { Meta, SearchResult, Well } from '@/lib/types';

const EXAMPLES = [
  'What cured losses in the lower Tipam near this well?',
  'Stuck pipe in Barail coal-shale — what freed the pipe?',
  'Kopili overpressure: at what depth did gas start rising?',
  'Cement jobs with losses at the 9-5/8" shoe',
];

interface AskResult { answer: string | null; sources: SearchResult[]; generated: boolean; reason?: string }

export default function KnowledgePage() {
  const { activeWellId, radiusKm } = useApp();
  const { data: meta } = useApi<Meta>('/meta');
  const { data: wells } = useApi<Well[]>('/wells');
  const active = wells?.find((w) => w.id === activeWellId);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'near' | 'all'>('near');
  const [formation, setFormation] = useState('');
  const [eventType, setEventType] = useState('');
  const [mode, setMode] = useState<'ask' | 'search'>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [searchMode, setSearchMode] = useState<string[]>([]);

  async function run(question = q) {
    if (question.trim().length < 2) return;
    setQ(question); setBusy(true); setError('');
    const body = {
      query: question, formation: formation || undefined, eventType: eventType || undefined,
      ...(scope === 'near' && activeWellId ? { wellId: activeWellId, radiusKm } : {}),
    };
    try {
      if (mode === 'ask') {
        setResult(await api<AskResult>('/knowledge/ask', { method: 'POST', json: body }));
      } else {
        const r = await api<{ results: SearchResult[]; mode: string[] }>('/knowledge/search', { method: 'POST', json: { ...body, limit: 20 } });
        setSearchMode(r.mode);
        setResult({ answer: null, sources: r.results, generated: false });
      }
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid max-w-[1180px] gap-4">
      <Panel className="px-5 py-5">
        <div className="label-caps">Institutional memory · {meta?.capabilities.groq ? `answers by ${meta.capabilities.groqModel}` : 'hybrid semantic + keyword search'}</div>
        <h1 className="mt-1 font-display text-[26px] font-bold">Ask the offset wells</h1>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(); }}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input id="kb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. losses in Tipam within 5 km — what worked?"
              className={cn(inputCls, 'h-11 pl-9 text-[15px]')} />
          </div>
          <Btn variant="primary" type="submit" loading={busy} className="h-11 px-5">{mode === 'ask' ? <><Sparkles className="size-4" />Ask</> : 'Search'}</Btn>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'ask', label: 'Answer with citations' }, { value: 'search', label: 'Search records' }]} />
          <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: 'near', label: `Within ${radiusKm} km of ${active?.name ?? 'active well'}` }, { value: 'all', label: 'All wells' }]} />
          <select aria-label="Formation filter" value={formation} onChange={(e) => setFormation(e.target.value)} className="h-7 rounded-md border border-line bg-inset px-2 text-[12.5px]">
            <option value="">Any formation</option>
            {meta?.formations.map((f) => <option key={f.name}>{f.name}</option>)}
          </select>
          <select aria-label="Event type filter" value={eventType} onChange={(e) => setEventType(e.target.value)} className="h-7 rounded-md border border-line bg-inset px-2 text-[12.5px]">
            <option value="">Any problem</option>
            {meta?.eventTypes.filter((t) => t.key !== 'other').map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        {!result && (
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => void run(ex)} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-[12.5px] text-muted-fg hover:border-line-strong hover:text-fg">{ex}</button>
            ))}
          </div>
        )}
      </Panel>

      {error && <p role="alert" className="text-[13px] text-[var(--r-crit)]">{error}</p>}

      {result && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <Panel className="h-fit lg:sticky lg:top-20">
            <PanelHeader eyebrow={result.generated ? 'Generated from the sources · check before acting' : mode === 'ask' ? 'No written answer' : `Matched by ${searchMode.join(' + ')}`} title={mode === 'ask' ? 'Answer' : `${result.sources.length} matching records`} />
            <div className="px-4 pb-4 text-[14px] leading-relaxed">
              {result.answer ? <CitedAnswer text={result.answer} /> : (
                <p className="text-muted-fg">{result.reason ?? (mode === 'search' ? 'Records ranked by combined semantic and keyword relevance. Numbers match the list on the right.' : 'No answer.')}</p>
              )}
            </div>
          </Panel>
          <div className="grid content-start gap-2.5">
            {result.sources.length === 0 && <Panel><Empty title="Nothing found">Try a wider radius, remove filters, or rephrase with drilling terms such as “losses”, “overpull” or “kick”.</Empty></Panel>}
            {result.sources.map((r, i) => <ResultCard key={r.id} r={r} n={i + 1} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function CitedAnswer({ text }: { text: string }) {
  const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((p, i) => /^\[\d/.test(p)
        ? p.slice(1, -1).split(/,\s*/).map((n) => (
          <a key={`${i}-${n}`} href={`#src-${n}`} className="mx-0.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded bg-accent-soft px-1 align-text-top text-[11px] font-semibold text-accent hover:bg-accent hover:text-accent-fg">{n}</a>
        ))
        : <span key={i}>{p}</span>)}
    </div>
  );
}

function ResultCard({ r, n }: { r: SearchResult; n: number }) {
  return (
    <Panel as="article" className="scroll-mt-20 px-4 py-3">
      <div id={`src-${n}`} className="flex flex-wrap items-center gap-2">
        <span className="grid h-5 min-w-5 place-items-center rounded bg-panel-2 px-1 text-[11px] font-semibold readout">{n}</span>
        {r.well && <Link href={`/wells/${r.well.id}`} className="font-display text-[15px] font-semibold hover:text-accent">{r.well.name}</Link>}
        {r.event_type && <EventTag type={r.event_type} />}
        {r.event?.severity && <SeverityPill severity={r.event.severity} />}
        {r.depth_ft != null && <Depth ft={r.depth_ft} className="text-[12.5px]" />}
        <span className="ml-auto flex items-center gap-1">
          {r.matchedBy.map((m) => <span key={m} className="rounded bg-panel-2 px-1.5 py-0.5 text-[10.5px] uppercase tracking-wider text-faint">{m}</span>)}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-fg">{r.text.replace(/^[^.]+?·[^.]+?\.\s/, '')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
        {r.event?.outcome_rating && <span style={{ color: OUTCOME_COLOR[r.event.outcome_rating] }}>{OUTCOME_LABEL[r.event.outcome_rating]}</span>}
        {r.event?.npt_hours != null && <span className="readout text-faint">{r.event.npt_hours} h NPT</span>}
        {r.document && <span className="inline-flex items-center gap-1 text-faint"><FileText className="size-3" />{r.document.title}{r.page ? `, p.${r.page}` : ''}</span>}
      </div>
    </Panel>
  );
}
