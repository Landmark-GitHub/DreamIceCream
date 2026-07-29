'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LedgerEmptyMembers() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">ยังไม่มีสมาชิก</h2>
        <p className="text-muted-foreground mb-4">กรุณาเพิ่มสมาชิกในหน้าตั้งค่าก่อน</p>
        <Link href="/settings">
          <Button>ไปหน้าตั้งค่า</Button>
        </Link>
      </div>
    </main>
  );
}
