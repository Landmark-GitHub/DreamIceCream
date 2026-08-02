'use client';

import { useRef, useState } from 'react';
import { Bill, Member, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Image as ImageIcon, Save } from 'lucide-react';
import { BillReceiptContent } from '@/components/ledger/bill-print-preview-dialog';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

export function BatchExportJPGDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { bills, members, products } = useStore();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // หาบิล checkout ล่าสุดของสมาชิกแต่ละคน
  const latestBills = members
    .map((member) => {
      const memberBills = bills.filter((b) => b.memberId === member.id && b.status !== 'draft');
      if (memberBills.length === 0) return null;

      // เรียงบิลตามวันที่และเวลาเพื่อหาบิลล่าสุด
      memberBills.sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return b.createdAt.localeCompare(a.createdAt);
      });

      return { member, bill: memberBills[0] };
    })
    .filter(Boolean) as { member: Member; bill: Bill }[];

  const handleExportAll = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    setProgress(0);
    try {
      const { toJpeg } = await import('html-to-image');
      const billElements = containerRef.current.querySelectorAll('.bill-export-item');

      for (let i = 0; i < billElements.length; i++) {
        const el = billElements[i] as HTMLElement;
        const memberName = el.dataset.member || 'Member';
        const billDate = el.dataset.date || '';

        const dataUrl = await toJpeg(el, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          style: {
            transform: 'scale(1)',
            borderRadius: '0px',
            margin: '0',
          },
        });

        const link = document.createElement('a');
        link.download = `ใบเบิกสินค้าไอศกรีม-${memberName}-${billDate}.jpg`;
        link.href = dataUrl;
        link.click();

        setProgress(i + 1);

        // หน่วงเวลาเล็กน้อยเพื่อให้เบราว์เซอร์ดาวน์โหลดไฟล์ได้ทัน
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Failed to export images:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] w-[95vw] p-0 overflow-hidden gap-0 bg-white text-black border border-neutral-200 shadow-xl max-h-[90vh] flex flex-col rounded-xl">
        <DialogTitle className="sr-only">ส่งออกบิลล่าสุดทั้งหมด (JPG)</DialogTitle>

        <div className="flex items-center justify-between p-3 border-b border-neutral-100 bg-neutral-50 shrink-0">
          <div className="flex items-center gap-1.5 text-neutral-700 font-medium text-sm">
            <ImageIcon className="w-4 h-4 text-primary" />
            <span>ตัวอย่างใบเบิกสินค้าไอศกรีมล่าสุด (รวม {latestBills.length} รายการ)</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-neutral-400 hover:text-neutral-600 rounded-lg p-1 hover:bg-neutral-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-6 bg-neutral-100 flex flex-col items-center min-h-0">
          <div ref={containerRef} className="w-full flex flex-col items-center gap-6">
            {latestBills.map(({ member, bill }, index) => {
              const memberBills = bills.filter(
                (b) =>
                  b.memberId === member.id &&
                  b.id !== bill.id &&
                  (b.date < bill.date || (b.date === bill.date && b.createdAt < bill.createdAt))
              );
              const previousOwed =
                memberBills.length > 0
                  ? memberBills.reduce((max, b) => (b.createdAt > max.createdAt ? b : max), memberBills[0])
                      .amountOwed
                  : 0;

              return (
                <div key={member.id} className="w-full flex flex-col items-center">
                  <div className="text-sm font-bold text-neutral-500 mb-2">
                    {index + 1}. {member.name} (วันที่: {bill.date})
                  </div>
                  <div
                    className="bill-export-item bg-white shadow-md border border-neutral-200 shrink-0 overflow-hidden"
                    data-member={member.name}
                    data-date={bill.date}
                    style={{
                      width: '350px',
                      maxWidth: '350px',
                      minHeight: '200px',
                    }}
                  >
                    <div
                      className={cn('font-mono leading-relaxed text-neutral-900 text-[9px] p-2')}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <BillReceiptContent
                        mode="return"
                        bill={bill}
                        products={products}
                        member={member}
                        previousOwed={previousOwed}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {latestBills.length === 0 && <div className="text-neutral-500 text-sm py-10">ไม่พบข้อมูลบิล</div>}
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between shrink-0">
          <div className="text-sm text-neutral-500 font-medium">
            {isExporting ? `กำลังบันทึก ${progress} / ${latestBills.length}...` : `พร้อมบันทึก ${latestBills.length} รูป`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-neutral-500 border-neutral-200"
              disabled={isExporting}
            >
              ปิดหน้าต่าง
            </Button>
            <Button
              size="sm"
              onClick={handleExportAll}
              disabled={isExporting || latestBills.length === 0}
              className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1 px-4 font-medium"
            >
              {isExporting ? (
                <>กำลังบันทึก...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  บันทึกทั้งหมด (JPG)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
