'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const { currentUser, _isLoaded } = useStore();

  useEffect(() => {
    if (_isLoaded && !currentUser) {
      router.push('/login');
    }
    if (_isLoaded && requireAdmin && currentUser?.role !== 'admin') {
      router.push('/');
    }
  }, [_isLoaded, currentUser, requireAdmin, router]);

  if (!_isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (requireAdmin && currentUser.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
