'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Droplets, Lock, AlertTriangle, Eye, EyeOff, UserCheck, Shield } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore(s => s.setUser);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('engineer');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@nwis.com',
      password: 'admin1234',
    },
  });

  async function onSubmit(data: LoginFormData) {
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        const res = await api.auth.register(regName || 'Operations Engineer', data.email, data.password, regRole);
        const { user, token } = res.data;
        setUser(user, token);
        document.cookie = `nwis_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
        router.push('/overview');
      } else {
        const res = await api.auth.login(data.email, data.password);
        const { user, token } = res.data;
        setUser(user, token);
        document.cookie = `nwis_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;

        if (user.role === 'administrator') {
          router.push('/admin');
        } else {
          router.push('/overview');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  const handleQuickLogin = (email: string, pw: string) => {
    setValue('email', email);
    setValue('password', pw);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8 bg-[#070A0E]">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Droplets className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">eRTMAC — NWIS</h1>
          <p className="text-xs text-muted-foreground mt-1">
            National Well Intelligence System · Oil India Limited
          </p>
        </div>

        <Card className="border-[#1B2533] bg-[#0C121B] shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-3 border-b border-[#182332]">
            <CardTitle className="text-base text-white flex items-center justify-between">
              <span>{isRegisterMode ? 'Create Field Account' : 'Operational Login'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                JWT Auth Active
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {isRegisterMode 
                ? 'Register credentials for secure drilling data access'
                : 'Enter registered credentials to access basin telemetry & risk intelligence'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5 text-xs bg-rose-500/10 border-rose-500/30 text-rose-300">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              {isRegisterMode && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <Input
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="h-9 text-xs bg-[#101724] border-[#1E2B3D] text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Role</Label>
                    <select
                      value={regRole}
                      onChange={e => setRegRole(e.target.value)}
                      className="w-full h-9 rounded-md text-xs bg-[#101724] border border-[#1E2B3D] text-white px-2.5"
                    >
                      <option value="engineer">Drilling Engineer</option>
                      <option value="operator">Rig Operator</option>
                      <option value="administrator">System Administrator</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Work Email</Label>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="name@nwis.com"
                  className="h-9 text-xs bg-[#101724] border-[#1E2B3D] text-white"
                />
                {errors.email && (
                  <p className="text-[11px] text-rose-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-9 text-xs bg-[#101724] border-[#1E2B3D] text-white pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-rose-400">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black mt-2 font-mono uppercase tracking-wider"
              >
                {loading ? 'Authenticating...' : (isRegisterMode ? 'Register Account' : 'Secure Login')}
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-2 border-t border-[#182332]">
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2 text-center">
                Instant Demo Access (Seeded Users):
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@nwis.com', 'admin1234')}
                  className="p-1.5 rounded bg-[#101724] border border-[#1E2B3D] hover:border-amber-500/60 text-white/90 transition-all text-center"
                >
                  <span className="block font-bold text-amber-400">Admin</span>
                  <span className="text-[8px] text-muted-foreground">admin1234</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('rahul.sharma@nwis.com', 'engineer1234')}
                  className="p-1.5 rounded bg-[#101724] border border-[#1E2B3D] hover:border-cyan-500/60 text-white/90 transition-all text-center"
                >
                  <span className="block font-bold text-cyan-400">Engineer</span>
                  <span className="text-[8px] text-muted-foreground">engineer1234</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('operator@nwis.com', 'operator1234')}
                  className="p-1.5 rounded bg-[#101724] border border-[#1E2B3D] hover:border-emerald-500/60 text-white/90 transition-all text-center"
                >
                  <span className="block font-bold text-emerald-400">Operator</span>
                  <span className="text-[8px] text-muted-foreground">operator1234</span>
                </button>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError('');
                }}
                className="text-xs text-muted-foreground hover:text-amber-400 underline underline-offset-4 transition-colors"
              >
                {isRegisterMode ? 'Already have an account? Sign in' : "Need a new account? Register"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
