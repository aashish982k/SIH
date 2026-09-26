'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  FileText, AlertTriangle,
  Plus, Trash2, Download, Shield, LogOut, CheckCircle2,
  Server, Database, Activity, RefreshCw, Key
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, currentUser, logout, setUser, fetchWells } = useAppStore();

  const [wellsList, setWellsList] = useState<any[]>([]);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add Well Modal
  const [addWellOpen, setAddWellOpen] = useState(false);
  const [savingWell, setSavingWell] = useState(false);
  const [newWellName, setNewWellName] = useState('');
  const [newWellNumber, setNewWellNumber] = useState('');
  const [newFieldName, setNewFieldName] = useState('Duliajan North');
  const [newTotalDepth, setNewTotalDepth] = useState('12500');
  const [newStatus, setNewStatus] = useState('active');
  const [newPrimaryFormation, setNewPrimaryFormation] = useState('Barail Sand');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [wellsRes, eventsRes, healthRes] = await Promise.allSettled([
        api.wells.list({ limit: 100 }),
        api.events.list({ limit: 50 }),
        api.health(),
      ]);

      if (wellsRes.status === 'fulfilled' && wellsRes.value?.data?.wells) {
        setWellsList(wellsRes.value.data.wells);
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value?.data?.events) {
        setIncidentsList(eventsRes.value.data.events);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
        setHealthStatus(healthRes.value.data);
      }
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Demo auto-login as admin
  const handleQuickAdminLogin = async () => {
    try {
      const res = await api.auth.login('admin@nwis.com', 'admin1234');
      if (res.data?.token && res.data?.user) {
        setUser(res.data.user, res.data.token);
        loadData();
      }
    } catch (err: any) {
      alert('Login failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCreateWell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWellName) return;

    try {
      setSavingWell(true);
      await api.wells.create({
        name: newWellName,
        well_number: newWellNumber || `OIL-${Date.now().toString().slice(-4)}`,
        field_name: newFieldName,
        total_depth_ft: Number(newTotalDepth) || 12000,
        status: newStatus,
        primary_formation: newPrimaryFormation,
        latitude: 27.35 + Math.random() * 0.1,
        longitude: 95.30 + Math.random() * 0.1,
        operator: 'Oil India Limited',
        spud_date: new Date().toISOString().split('T')[0],
      });

      setAddWellOpen(false);
      setNewWellName('');
      setNewWellNumber('');
      setActionSuccess('Well registered successfully in database.');
      setTimeout(() => setActionSuccess(null), 5000);
      await loadData();
      await fetchWells();
    } catch (err: any) {
      alert('Failed to create well: ' + (err.message || 'Error'));
    } finally {
      setSavingWell(false);
    }
  };

  const handleDeleteWell = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete well "${name}"? This action removes associated events and logs.`)) {
      return;
    }

    try {
      await api.wells.delete(id);
      setActionSuccess(`Well "${name}" deleted.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadData();
      await fetchWells();
    } catch (err: any) {
      alert('Failed to delete well: ' + (err.message || 'Error'));
    }
  };

  function handleLogout() {
    logout();
    router.push('/');
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <Card className="max-w-md w-full border-border/60 bg-card p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Administrator Role Required</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-6">
            The NWIS Admin console requires operational administrator clearance. Currently active user:{' '}
            <span className="font-mono text-foreground font-semibold">{currentUser?.email || 'Anonymous'}</span>
          </p>

          <div className="space-y-3">
            <Button
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
              onClick={handleQuickAdminLogin}
            >
              <Key className="w-4 h-4" />
              Sign In as System Admin (admin@nwis.com)
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => router.push('/login')}
            >
              Go to Standard Login Screen
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">NWIS Admin Console</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ROLE: {currentUser?.role?.toUpperCase() || 'ADMINISTRATOR'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assam Shelf Basin Operations · Live Database & Telemetry Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2 text-xs">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={handleLogout}>
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </motion.div>

      {/* System Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Total Wells</p>
              <p className="text-xl font-bold font-mono text-foreground">{wellsList.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Recorded Incidents</p>
              <p className="text-xl font-bold font-mono text-foreground">{incidentsList.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Database Engine</p>
              <p className="text-sm font-semibold text-foreground capitalize">
                {healthStatus?.mysql === 'connected' ? 'MySQL / SQLite' : 'Online'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Knowledge Engine</p>
              <p className="text-sm font-semibold text-foreground capitalize">
                {healthStatus?.qdrant === 'connected' ? 'Qdrant Vector' : 'SQL Relevance'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center gap-2 text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Tabs defaultValue="wells">
        <TabsList className="mb-6">
          <TabsTrigger value="wells" className="gap-2 text-xs">
            <FileText className="w-4 h-4" />
            Well Registry ({wellsList.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs">
            <AlertTriangle className="w-4 h-4" />
            System Incident Log ({incidentsList.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Well Management Tab ─────────────────────────────────────── */}
        <TabsContent value="wells">
          <Card className="border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Active Basin Well Assets</CardTitle>
                <p className="text-xs text-muted-foreground">Manage live wells in Assam basin fields</p>
              </div>
              <Button size="sm" onClick={() => setAddWellOpen(true)} className="gap-1.5 text-xs">
                <Plus className="w-4 h-4" />
                Register Well
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Well Name', 'Well No.', 'Field', 'Status', 'Total Depth', 'Formation', 'Coords', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-4 first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {wellsList.map((well) => (
                    <tr key={well.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 pl-5 pr-4 font-semibold text-foreground">
                        <button
                          onClick={() => router.push(`/wells/${well.id}`)}
                          className="hover:text-primary transition-colors text-left"
                        >
                          {well.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{well.well_number || '—'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{well.field_name}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={cn(
                            'text-[10px] uppercase font-mono',
                            well.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : well.status === 'suspended'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {well.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {Number(well.total_depth_ft || 0).toLocaleString()} ft
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{well.primary_formation || '—'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {Number(well.latitude).toFixed(3)}°N, {Number(well.longitude).toFixed(3)}°E
                      </td>
                      <td className="py-3 px-4 pr-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          onClick={() => handleDeleteWell(well.id, well.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
              <div>
                <CardTitle className="text-sm font-semibold">Live System Operational Incidents</CardTitle>
                <p className="text-xs text-muted-foreground">Historical and active drilling events from database</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => {
                  const csv = ['Well,Event,Severity,Depth,NPT Hours,Date']
                    .concat(
                      incidentsList.map(
                        (i) => `"${i.well_name || i.well_id}","${i.event_type}","${i.severity}","${i.start_depth_ft}","${i.npt_hours || 0}","${i.occurred_at}"`
                      )
                    )
                    .join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `nwis_incidents_${Date.now()}.csv`;
                  a.click();
                }}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Well', 'Event Type', 'Severity', 'Depth', 'NPT (Hours)', 'Mitigation Action', 'Date'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 px-4 first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {incidentsList.map((inc) => (
                    <tr key={inc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pl-5 pr-4 font-semibold text-foreground">
                        {inc.well_name || inc.well_id}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground uppercase font-mono text-[11px]">
                        {inc.event_type?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded font-mono',
                            inc.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : inc.severity === 'high'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          )}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {Number(inc.start_depth_ft || 0).toLocaleString()} ft
                      </td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {inc.npt_hours ? `${inc.npt_hours}h` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate">
                        {inc.mitigation || inc.description || '—'}
                      </td>
                      <td className="py-2.5 px-4 pr-5 text-muted-foreground">
                        {formatDate(inc.occurred_at || inc.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Well Dialog */}
      <Dialog open={addWellOpen} onOpenChange={setAddWellOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Register New Well Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWell} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Well Name</Label>
              <Input
                placeholder="e.g. Naharkatiya-21"
                value={newWellName}
                onChange={(e) => setNewWellName(e.target.value)}
                required
                className="text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Well Identifier Number</Label>
                <Input
                  placeholder="e.g. NHK-021"
                  value={newWellNumber}
                  onChange={(e) => setNewWellNumber(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Field Region</Label>
                <select
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                >
                  <option value="Duliajan North">Duliajan North</option>
                  <option value="Lakwa Central">Lakwa Central</option>
                  <option value="Moran East">Moran East</option>
                  <option value="Naharkatiya">Naharkatiya</option>
                  <option value="Baghjan">Baghjan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Target Total Depth (ft)</Label>
                <Input
                  type="number"
                  placeholder="12500"
                  value={newTotalDepth}
                  onChange={(e) => setNewTotalDepth(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                >
                  <option value="active">Active (Drilling)</option>
                  <option value="suspended">Suspended</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Primary Target Formation</Label>
              <Input
                placeholder="e.g. Barail Sand or Tipam Sandstone"
                value={newPrimaryFormation}
                onChange={(e) => setNewPrimaryFormation(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddWellOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingWell}>
                {savingWell ? 'Registering...' : 'Save to Database'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
