'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
      <p className="text-muted-foreground mb-4">{error.message || 'เกิดข้อผิดพลาดขึ้นในระบบ'}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium transition-colors hover:bg-primary/90"
      >
        ลองอีกครั้ง
      </button>
    </div>
  );
}
