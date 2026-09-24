'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { MOCK_WELLS } from '@/lib/mock/wells';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { cn, formatDate, getIncidentLabel, getRiskBgClass } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, AlertTriangle,
  Plus, Pencil, Trash2, Download, Shield, LogOut
} from 'lucide-react';
import type { Incident } from '@/lib/types';


// ─── Admin Page ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, logout } = useAppStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Flatten all incidents with their well name once, instead of per-row require() calls
  const allIncidents: (Incident & { wellName: string })[] = MOCK_WELLS.flatMap(w =>
    getIncidentsForWell(w.id).map(inc => ({ ...inc, wellName: w.name }))
  );

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Access Restricted</p>
          <p className="text-sm text-muted-foreground mt-1">Administrator login required</p>
          <Button className="mt-4" onClick={() => router.push('/login')}>
            Sign In as Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Oil India Limited · NWIS System Administration</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />Sign Out
        </Button>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="wells">
        <TabsList className="mb-6">
          <TabsTrigger value="wells" className="gap-2"><FileText className="w-4 h-4" />Well Management</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><AlertTriangle className="w-4 h-4" />Incident Log</TabsTrigger>
        </TabsList>

        {/* ── Well Management Tab ─────────────────────────────────────── */}
        <TabsContent value="wells">
          <Card className="border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Well Registry</CardTitle>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />Add Well
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Well Name', 'Field', 'Block', 'Status', 'Total Depth', 'Spud Date', 'Actions'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-4 first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {MOCK_WELLS.map(well => (
                    <tr key={well.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 pl-5 pr-4 font-semibold text-foreground">{well.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{well.field}</td>
                      <td className="py-3 px-4 text-muted-foreground">{well.block}</td>
                      <td className="py-3 px-4">
                        <Badge className={cn('text-[10px]',
                          well.status === 'active' ? 'bg-risk-low text-[var(--risk-low)]' :
                          well.status === 'suspended' ? 'bg-risk-medium text-[var(--risk-medium)]' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {well.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{well.totalDepthFt.toLocaleString()} ft</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(well.spudDate)}</td>
                      <td className="py-3 px-4 pr-5">
                        <div className="flex items-center gap-1.5">
                          {confirmDeleteId === well.id ? (
                            <>
                              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>
                                Confirm Delete
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" aria-label={`Edit well ${well.name}`} className="h-7 w-7">
                                <Pencil aria-hidden="true" className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete well ${well.name}`}
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setConfirmDeleteId(well.id)}
                              >
                                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Incident Log Tab ────────────────────────────────────────── */}
        <TabsContent value="logs">
          <Card className="border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">System Incident Log</CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />Export CSV
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Well', 'Type', 'Severity', 'Depth', 'Date', 'Duration'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-4 first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {allIncidents.map(inc => (
                      <tr key={inc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pl-5 pr-4 font-medium text-foreground">{inc.wellName}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{getIncidentLabel(inc.type)}</td>
                        <td className="py-2.5 px-4">
                          <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', getRiskBgClass(inc.severity))}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-muted-foreground">{inc.depthFt.toLocaleString()} ft</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(inc.date)}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{inc.durationHours}h</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
