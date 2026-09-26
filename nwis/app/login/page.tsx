'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/shell/Logo';
import { Btn, Field, inputCls } from '@/components/kit';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import type { User } from '@/lib/types';

const DEMO = [
  { label: 'Drilling engineer', email: 'rahul.sharma@nwis.com', password: 'engineer1234' },
  { label: 'Administrator', email: 'admin@nwis.com', password: 'admin1234' },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useApp((s) => s.setAuth);
  const [email, setEmail] = useState(DEMO[0].email);
  const [password, setPassword] = useState(DEMO[0].password);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { token, user } = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', json: { email, password } });
      setAuth(token, user);
      router.replace('/');
    } catch (err: any) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden border-r border-line bg-panel lg:block">
        <DepthArt />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3"><Logo size={34} /><span className="font-display text-xl font-bold tracking-wide">NWIS</span></div>
          <div className="max-w-md">
            <div className="label-caps mb-3">Oil India Limited · alongside eRTMAC</div>
            <h1 className="font-display text-[40px] font-bold leading-[1.05] text-balance">Every offset well’s experience, one step ahead of the bit.</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-fg">
              Offset wells within your radius, compared formation by formation. Look-ahead warnings before known trouble zones. Past fixes ranked by how often they worked.
            </p>
          </div>
          <p className="text-[12px] text-faint">Demo data is synthetic and modelled on Upper Assam stratigraphy.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><Logo size={30} /><span className="font-display text-lg font-bold">NWIS</span></div>
          <h2 className="font-display text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-[13.5px] text-muted-fg">Use your NWIS account.</p>
          <div className="mt-6 grid gap-4">
            <Field label="Email"><input id="email" className={inputCls} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label="Password"><input id="password" className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
            {error && <p role="alert" className="text-[13px] text-[var(--r-crit)]">{error}</p>}
            <Btn variant="primary" type="submit" loading={busy} className="h-10">Sign in</Btn>
          </div>
          <div className="mt-8 rounded-xl border border-line bg-panel p-3">
            <div className="label-caps mb-2">Demo accounts</div>
            <div className="grid gap-1.5">
              {DEMO.map((d) => (
                <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword(d.password); }}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-panel-2">
                  <span>{d.label}</span><span className="readout text-[11.5px] text-faint">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Decorative formation bands with a well path cutting through them. */
function DepthArt() {
  const bands = ['#C9B99A', '#D8C48A', '#A77B5C', '#E3B64E', '#4B4A4F', '#B99A62', '#5E6B73', '#8FB3C9'];
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.22]" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true">
      {bands.map((c, i) => (
        <path key={c} d={`M0 ${90 + i * 88} C 150 ${70 + i * 88}, 380 ${130 + i * 88}, 600 ${100 + i * 88} L600 ${190 + i * 88} C 380 ${220 + i * 88}, 150 ${160 + i * 88}, 0 ${180 + i * 88} Z`} fill={c} />
      ))}
      <path d="M430 0 L430 260 C 430 380, 360 470, 300 800" stroke="var(--accent)" strokeWidth="5" fill="none" />
      <path d="M180 0 L180 800" stroke="var(--fg)" strokeWidth="2" strokeDasharray="6 8" fill="none" />
      <path d="M520 0 L520 800" stroke="var(--fg)" strokeWidth="2" strokeDasharray="6 8" fill="none" />
    </svg>
  );
}
