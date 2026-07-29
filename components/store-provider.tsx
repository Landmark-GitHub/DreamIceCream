'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadData = useStore((state) => state.loadData);
  const isLoaded = useStore((state) => state._isLoaded);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
