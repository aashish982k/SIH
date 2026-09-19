'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Droplets, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setIsAdmin = useAppStore(s => s.setIsAdmin);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    if (data.username === 'admin' && data.password === 'admin@123') {
      localStorage.setItem('nwis_role', 'admin');
      // Set cookie so middleware can protect /admin
      document.cookie = 'nwis_role=admin; path=/; max-age=86400; SameSite=Lax';
      setIsAdmin(true);
      router.push('/admin');
    } else {
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-64px-80px)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Droplets className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to access the NWIS Admin Panel</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-xs font-medium">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  className="mt-1.5 h-10"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-xs text-destructive mt-1">{errors.username.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
                <Lock className="w-4 h-4" />
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Demo credentials: <code className="bg-muted px-1 rounded">admin</code> / <code className="bg-muted px-1 rounded">admin@123</code>
        </p>
      </motion.div>
    </div>
  );
}
