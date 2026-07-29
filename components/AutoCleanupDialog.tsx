'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { getCurrentMonth, getToday, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sparkles,
  ImageDown,
  FileSpreadsheet,
  FileJson,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

// ===== ค่าคงที่หัวบิล (ปรับตามร้านจริงได้) =====
const SHOP_NAME = 'ร้านไอศครีมโบราณ คลอง 7';
const SHOP_PHONES = ['090-417-1125', '064-419-4456', '064-515-9924'];
const ICE_PRICE_PER_UNIT_LABEL = 'ค่าแพ็คเกจประจำเดือน';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface StepState {
  key: string;
  label: string;
  status: StepStatus;
}

const INITIAL_STEPS: StepState[] = [
  { key: 'jpg', label: 'กำลังสร้างรูปบิล (JPG)', status: 'pending' },
  { key: 'csv', label: 'กำลังสร้างสรุปยอดรายวัน (CSV)', status: 'pending' },
  { key: 'json', label: 'กำลังบันทึกยอดยกมา (expenses.json)', status: 'pending' },
  { key: 'clear', label: 'กำลังล้างข้อมูลสำหรับรอบถัดไป', status: 'pending' },
];

function formatDateThai(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'กำลังเบิก';
    case 'checkout': return 'เบิกแล้ว';
    case 'completed': return 'ปิดวันแล้ว';
    default: return status;
  }
}

// ดึงราคาตาม class สมาชิก เหมือนกับ logic ใน page.tsx
function getMemberPrice(baseProduct: any, memberClass: string | undefined): number {
  if (!baseProduct) return 0;
  if (memberClass === 'Out') return baseProduct.priceOut || 0;
  if (memberClass === 'WalkIn') return baseProduct.priceWorkIn || 0;
  return baseProduct.priceIn || 0;
}

interface TypeRow {
  typeName: string;
  oldStock: number;
  newStock: number;
  totalStock: number;
  returned: number;
  sold: number;
  price: number;
  subtotal: number;
}

function buildBillRows(bill: any, products: any[], members: any[]): TypeRow[] {
  const productTypes = Array.from(new Set(products.map((p) => p.type)));
  const member = members.find((m) => m.id === bill.memberId);
  const memberClass = member?.class ?? 'In';

  const rows: TypeRow[] = [];
  productTypes.forEach((type) => {
    if (type === 'Car' || type === 'House' || type === 'D') return;
    const typeProducts = products.filter((p) => p.type === type);
    const typeItems = bill.items.filter(
      (item: any) =>
        typeProducts.some((p) => p.id === item.productId) &&
        (item.totalStock > 0 || item.newStock > 0)
    );
    if (typeItems.length === 0) return;

    const oldStock = typeItems.reduce((s: number, i: any) => s + i.oldStock, 0);
    const newStock = typeItems.reduce((s: number, i: any) => s + i.newStock, 0);
    const totalStock = typeItems.reduce((s: number, i: any) => s + i.totalStock, 0);
    const returned = bill.returnInputs?.[type] || 0;
    const sold = Math.max(0, totalStock - returned);
    const baseProduct = typeProducts[0];
    const price = getMemberPrice(baseProduct, memberClass);
    const subtotal = sold * price;
    const typeName = PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

    rows.push({ typeName, oldStock, newStock, totalStock, returned, sold, price, subtotal });
  });

  return rows;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== Bill template: Format 2 (เต็มรูปแบบ ตามภาพตัวอย่าง) =====
function BillFormat2({ bill, rows }: { bill: any; rows: TypeRow[] }) {
  return (
    <div
      style={{
        width: 420,
        background: '#ffffff',
        padding: 24,
        fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
        color: '#1f2933',
        border: '1px solid #e4e7eb',
        borderRadius: 12,
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
        🍦 ใบเบิกสินค้าไอศครีม
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
        📍 {SHOP_NAME}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#52606d', marginBottom: 12 }}>
        📞 {SHOP_PHONES.join('  ')}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span>👤 ผู้เบิก/ลูกค้า:</span>
        <strong>{bill.memberName}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
        <span>📅 วันที่:</span>
        <strong>{formatDateThai(bill.date)}</strong>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #cbd2d9', color: '#52606d' }}>
            <th style={{ textAlign: 'left', padding: '4px 2px' }}>รายการสินค้า</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>รวม</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>เหลือ</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>ขาย</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>ราคา</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>รวมเงิน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.typeName} style={{ borderBottom: '1px dashed #e4e7eb' }}>
              <td style={{ padding: '4px 2px' }}>{r.typeName}</td>
              <td style={{ textAlign: 'right', padding: '4px 2px' }}>{r.totalStock}</td>
              <td style={{ textAlign: 'right', padding: '4px 2px' }}>{r.returned}</td>
              <td style={{ textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>{r.sold}</td>
              <td style={{ textAlign: 'right', padding: '4px 2px' }}>{r.price}</td>
              <td style={{ textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>
                {r.subtotal.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px solid #cbd2d9', marginTop: 10, paddingTop: 8, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span>🧊 {ICE_PRICE_PER_UNIT_LABEL}</span>
          <span>+{(bill.icePrice || 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 6 }}>
          <span>ค่าสินค้าไอศครีมรวมวันนี้:</span>
          <span>{rows.reduce((s, r) => s + r.subtotal, 0).toLocaleString()} บาท</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 6 }}>
          <span>ยอดเบิกรวมสุทธิวันนี้:</span>
          <span>{Math.round(bill.totalSales).toLocaleString()} บาท</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span>หนี้เก่าสะสม:</span>
          <span>{Math.round(bill.previousOwed || 0).toLocaleString()} บาท</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span>ชำระเงินวันนี้:</span>
          <span>-{Math.round(bill.amountPaid).toLocaleString()} บาท</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            padding: '6px 8px',
            background: '#f0fdf4',
            borderRadius: 8,
            fontWeight: 700,
            color: '#16794d',
          }}
        >
          <span>ยอดหนี้สะสมรวมทั้งหมด:</span>
          <span>{Math.round(bill.amountOwed).toLocaleString()} บาท</span>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#52606d' }}>
        สถานะ: {getStatusLabel(bill.status)}
        {bill.notes ? ` • หมายเหตุ: ${bill.notes}` : ''}
      </div>
    </div>
  );
}

// ===== Bill template: Format 1 (ย่อ — สรุปสั้น สำหรับแปะกลุ่มไลน์/ส่งลูกค้าเร็วๆ) =====
function BillFormat1({ bill, rows }: { bill: any; rows: TypeRow[] }) {
  const totalSold = rows.reduce((s, r) => s + r.sold, 0);
  return (
    <div
      style={{
        width: 320,
        background: '#1f2933',
        color: '#f5f7fa',
        padding: 18,
        fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>🍦 {SHOP_NAME}</div>
      <div style={{ fontSize: 11, color: '#9aa5b1', marginBottom: 10 }}>
        {formatDateThai(bill.date)}
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{bill.memberName}</div>

      <div style={{ fontSize: 11, color: '#cbd2d9', marginBottom: 10 }}>
        {rows.map((r) => `${r.typeName} ${r.sold}`).join(' · ')} (รวม {totalSold} ชิ้น)
      </div>

      <div
        style={{
          background: '#323f4b',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>ยอดเบิกวันนี้</span>
          <span>{Math.round(bill.totalSales).toLocaleString()} บ.</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>ชำระแล้ว</span>
          <span>{Math.round(bill.amountPaid).toLocaleString()} บ.</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: 15,
          color: '#ff8a65',
        }}
      >
        <span>ยอดค้างชำระ</span>
        <span>{Math.round(bill.amountOwed).toLocaleString()} บาท</span>
      </div>
    </div>
  );
}

export function AutoCleanupDialog() {
  const { bills, products, members, expenses, getLastBillForMember, addExpenseCarryForward, clearForNewCycle } =
    useStore() as any;

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ deletedBillCount: number; deletedExpenseCount: number } | null>(null);

  const captureHostRef = useRef<HTMLDivElement>(null);

  const setStepStatus = (key: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status } : s)));
  };

  const resetState = () => {
    setSteps(INITIAL_STEPS);
    setErrorMessage(null);
    setResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (running) return; // ห้ามปิดระหว่างทำงาน
    setOpen(next);
    if (!next) resetState();
  };

  const run = async () => {
    setRunning(true);
    setErrorMessage(null);

    try {
      // ===== STEP 1: JPG — บิลล่าสุดของสมาชิกทุกคน 2 รูปแบบ =====
      setStepStatus('jpg', 'running');
      const html2canvas = (await import('html2canvas')).default;
      const host = captureHostRef.current;
      if (!host) throw new Error('ไม่พบพื้นที่สำหรับ render บิล');

      const membersWithBills = members
        .map((m: any) => ({ member: m, bill: getLastBillForMember(m.id) }))
        .filter((x: any) => !!x.bill);

      for (const { member, bill } of membersWithBills) {
        const rows = buildBillRows(bill, products, members);

        // mount ชั่วคราวใน host ที่ซ่อนอยู่นอกจอ แล้ว capture ทีละ format
        for (const format of ['format2', 'format1'] as const) {
          const container = document.createElement('div');
          host.appendChild(container);
          const ReactDOMClient = await import('react-dom/client');
          const root = ReactDOMClient.createRoot(container);
          const React = await import('react');
          root.render(
            format === 'format2'
              ? React.createElement(BillFormat2, { bill, rows })
              : React.createElement(BillFormat1, { bill, rows })
          );
          // รอ 1 frame ให้ render เสร็จก่อน capture
          await sleep(50);
          const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
            backgroundColor: format === 'format2' ? '#ffffff' : '#1f2933',
            scale: 2,
          });
          const blob: Blob = await new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92)
          );
          downloadBlob(`bill-${format}-${member.name}-${bill.date}.jpg`, blob);
          root.unmount();
          host.removeChild(container);
          // หน่วงเล็กน้อยกันเบราว์เซอร์บล็อกดาวน์โหลดหลายไฟล์รวด
          await sleep(250);
        }
      }
      setStepStatus('jpg', 'done');

      // ===== STEP 2: CSV — สรุปยอดเงินรายวัน เรียงล่าสุดอยู่บน =====
      setStepStatus('csv', 'running');
      const dailyMap = new Map<string, { totalSales: number; amountPaid: number; amountOwed: number; billCount: number }>();
      bills.forEach((b: any) => {
        const entry = dailyMap.get(b.date) || { totalSales: 0, amountPaid: 0, amountOwed: 0, billCount: 0 };
        entry.totalSales += b.totalSales || 0;
        entry.amountPaid += b.amountPaid || 0;
        entry.amountOwed += b.amountOwed || 0;
        entry.billCount += 1;
        dailyMap.set(b.date, entry);
      });

      const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => b.localeCompare(a)); // ล่าสุดอยู่บน
      const csvHeaders = ['วันที่', 'จำนวนบิล', 'ยอดเบิกรวม (บาท)', 'ชำระแล้ว (บาท)', 'ค้างชำระ (บาท)'];
      const csvRows = sortedDates.map((date) => {
        const e = dailyMap.get(date)!;
        return [
          formatDateThai(date),
          e.billCount.toString(),
          Math.round(e.totalSales).toLocaleString(),
          Math.round(e.amountPaid).toLocaleString(),
          Math.round(e.amountOwed).toLocaleString(),
        ];
      });
      const csv = [csvHeaders.join(','), ...csvRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      downloadBlob(`bills-summary-${getCurrentMonth()}.csv`, new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
      setStepStatus('csv', 'done');

      // ===== STEP 3: บันทึกยอดยกมาใน expenses.json =====
      setStepStatus('json', 'running');
      const expensesTotal = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const periodStart = sortedDates.length ? sortedDates[sortedDates.length - 1] : getToday();
      const periodEnd = sortedDates.length ? sortedDates[0] : getToday();
      // หมายเหตุ: ยังไม่รวม Supply ตามที่ตกลงไว้ จึงบันทึกเฉพาะยอดรายจ่ายไว้เป็นยอดยกมา
      // (เมื่อเพิ่ม Supply ในอนาคต ค่อยนำ supplyTotal - expensesTotal มาเป็นกำไรสุทธิ)
      await Promise.resolve(
        addExpenseCarryForward({
          amount: expensesTotal,
          note: 'ยอดยกมา (auto cleanup) — รวมรายจ่ายของรอบนี้ ยังไม่รวม Supply',
          periodStart,
          periodEnd,
        })
      );
      setStepStatus('json', 'done');

      // ===== STEP 4: ล้างข้อมูล เหลือไว้บิลล่าสุดของแต่ละสมาชิก =====
      setStepStatus('clear', 'running');
      const clearResult = clearForNewCycle();
      setResult(clearResult);
      setStepStatus('clear', 'done');
    } catch (err: any) {
      console.error('Auto cleanup workflow failed:', err);
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      setSteps((prev) =>
        prev.map((s) => (s.status === 'running' ? { ...s, status: 'error' } : s))
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        <Sparkles className="w-4 h-4 mr-2" />
        Auto Clean Up &amp; สร้างบิล
      </Button>

      {/* host ซ่อนนอกจอ สำหรับ render บิลชั่วคราวก่อน capture เป็น JPG */}
      <div
        ref={captureHostRef}
        style={{ position: 'fixed', top: 0, left: -99999, opacity: 0, pointerEvents: 'none' }}
        aria-hidden
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Auto Clean Up & สร้างบิล
            </DialogTitle>
            <DialogDescription>
              ระบบจะดาวน์โหลด JPG บิลล่าสุดของทุกคน (2 รูปแบบ), CSV สรุปยอดรายวัน, บันทึกยอดยกมา
              แล้วล้างข้อมูล — เหลือไว้เฉพาะบิลล่าสุดของสมาชิกแต่ละคน
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm ${
                  step.status === 'done'
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                    : step.status === 'error'
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                    : step.status === 'running'
                    ? 'bg-muted/60 border-border'
                    : 'bg-muted/20 border-border/60 text-muted-foreground'
                }`}
              >
                {step.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                {step.status === 'error' && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {step.status === 'pending' && (
                  <span className="w-4 h-4 shrink-0 rounded-full border border-muted-foreground/40" />
                )}
                {step.key === 'jpg' && <ImageDown className="w-4 h-4 shrink-0 opacity-60" />}
                {step.key === 'csv' && <FileSpreadsheet className="w-4 h-4 shrink-0 opacity-60" />}
                {step.key === 'json' && <FileJson className="w-4 h-4 shrink-0 opacity-60" />}
                {step.key === 'clear' && <Trash2 className="w-4 h-4 shrink-0 opacity-60" />}
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          {errorMessage && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
              เกิดข้อผิดพลาด: {errorMessage} — ขั้นตอนก่อนหน้าที่ทำสำเร็จแล้ว (เช่น ไฟล์ที่ดาวน์โหลดไปแล้ว)
              จะไม่ถูกย้อนกลับ กรุณาตรวจสอบแล้วลองใหม่
            </div>
          )}

          {result && (
            <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md p-2">
              เสร็จสิ้น: ลบบิลเก่า {result.deletedBillCount} ใบ, ล้างรายจ่าย {result.deletedExpenseCount} รายการ
              (เหลือบิลล่าสุดของสมาชิกแต่ละคนไว้)
            </div>
          )}

          <DialogFooter>
            {!running && !result && (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                ยกเลิก
              </Button>
            )}
            {!result ? (
              <Button onClick={run} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังทำงาน...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    เริ่ม Auto Clean Up
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => handleOpenChange(false)}>ปิด</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
