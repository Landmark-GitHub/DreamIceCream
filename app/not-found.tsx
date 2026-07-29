'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">ไม่พบหน้านี้ (404)</h2>
      <p className="text-muted-foreground mb-4">ไม่พบหน้าที่คุณกำลังค้นหา</p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium transition-colors hover:bg-primary/90"
      >
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
