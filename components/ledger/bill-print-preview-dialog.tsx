'use client';

import { useRef, useState } from 'react';
import {
  Bill,
  Member,
  Product,
  getMemberClass,
  PRODUCT_TYPE_LABELS,
} from '@/lib/types';
import {
  formatThaiFullDate,
  getMemberPriceByClass,
  getReturnProductTypes,
  LedgerMode,
} from '@/lib/ledger-utils';
import { Image as ImageIcon, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePrintScale } from './use-print-scale';

interface BillPrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LedgerMode;
  bill: Bill | undefined;
  products: Product[];
  member: Member | undefined;
  previousOwed: number;
}

export function BillPrintPreviewDialog({
  open,
  onOpenChange,
  mode,
  bill,
  products,
  member,
  previousOwed,
}: BillPrintPreviewDialogProps) {
  const [isSavingImage, setIsSavingImage] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const printContentRef = useRef<HTMLDivElement>(null);

  usePrintScale(open, printContentRef, printAreaRef, [mode, bill]);

  const handleSaveAsJpg = async () => {
    if (!printAreaRef.current) return;
    setIsSavingImage(true);
    try {
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(printAreaRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          borderRadius: '0px',
        },
      });

      const fileName = `บิล-${member?.name || 'สมาชิก'}-${bill?.date || ''}-${mode}.jpg`;

      // แปลง dataUrl -> Blob -> File (ต้องระบุ type: image/jpeg ชัดเจน
      // ไม่งั้น iOS/iPadOS จะไม่รู้จักว่าเป็นรูปภาพ และจะไม่ขึ้นตัวเลือก
      // "บันทึกภาพ" ใน share sheet ให้ มีแต่ Files / Drive)
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // ใช้ Web Share API ก่อนบนมือถือ (โดยเฉพาะ iOS/iPadOS Safari)
      // เพราะจะเด้ง native share sheet ที่มีปุ่ม "บันทึกภาพ" ให้กดตรงๆ
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
          });
          return;
        } catch (shareError) {
          // ผู้ใช้กดยกเลิก share sheet เอง ไม่ต้อง fallback ไป download ซ้ำ
          if ((shareError as Error)?.name === 'AbortError') {
            return;
          }
          // เหตุผลอื่น (เช่น browser บล็อก) ให้ตกไปใช้วิธี download แบบเดิมด้านล่าง
        }
      }

      // Fallback: desktop / Android หรือกรณี share ไม่ได้
      // -> ดาวน์โหลดไฟล์ลงเครื่องโดยตรงผ่าน <a download>
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(file);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('ไม่สามารถบันทึกรูปภาพได้:', error);
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] w-[95vw] p-0 overflow-hidden gap-0 bg-white text-black border border-neutral-200 shadow-xl max-h-[90vh] flex flex-col rounded-xl">
        <DialogTitle className="sr-only">
          {mode === 'checkout'
            ? 'ตัวอย่างใบเบิกสินค้าไอศกรีม'
            : 'ตัวอย่างใบเสร็จรับเงิน'}
        </DialogTitle>

        <div className="flex items-center justify-between p-3 border-b border-neutral-100 bg-neutral-50 shrink-0">
          <div className="flex items-center gap-1.5 text-neutral-700 font-medium text-sm">
            <ImageIcon className="w-4 h-4 text-primary" />
            <span>ตัวอย่างก่อนบันทึก</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-neutral-400 hover:text-neutral-600 rounded-lg p-1 hover:bg-neutral-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-6 bg-neutral-100 flex flex-col items-center min-h-0">
          <div
            ref={printAreaRef}
            className="bg-white shadow-md border border-neutral-200 shrink-0 my-2 overflow-hidden"
            style={{
              width: mode === 'checkout' ? '280px' : '100%',
              maxWidth: mode === 'checkout' ? '350px' : '100%',
              minHeight: '200px',
            }}
          >
            <div
              ref={printContentRef}
              className={cn(
                'font-mono leading-relaxed text-neutral-900',
                mode === 'checkout' ? 'text-[9px] p-2' : 'text-xs p-6'
              )}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <BillReceiptContent
                mode={mode}
                bill={bill}
                products={products}
                member={member}
                previousOwed={previousOwed}
              />
            </div>
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex gap-2 shrink-0 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-neutral-500 border-neutral-200"
          >
            ปิดหน้าต่าง
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAsJpg}
            disabled={isSavingImage}
            className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1 px-4 font-medium"
          >
            <Save className="w-4 h-4" />
            {isSavingImage ? 'กำลังบันทึก...' : 'บันทึกรูปภาพ (JPG)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BillReceiptContent({
  mode,
  bill,
  products,
  member,
  previousOwed,
}: {
  mode: LedgerMode;
  bill: Bill | undefined;
  products: Product[];
  member: Member | undefined;
  previousOwed: number;
}) {
  const memberClass = getMemberClass(member);

  return (
    <>
      <div className="text-center space-y-0.5 mb-3">
        <h2 className="font-bold tracking-tight text-neutral-950 text-lg">
          {mode === 'checkout'
            ? '📋 ใบเสร็จรับเงิน / ใบส่งสินค้า '
            : '🧾 ใบเบิกสินค้าไอศกรีม'}
        </h2>
      </div>

      <div
        className={cn(
          'space-y-1.5 text-neutral-600 bg-neutral-50 rounded-lg border border-neutral-200/60 mb-3 font-sans',
          mode === 'checkout' ? 'text-[8px] p-1.5' : 'text-[11px] p-3'
        )}
      >
        <div className="text-center border-b border-dashed border-neutral-300 pb-1.5 mb-1.5">
          <h2 className="font-bold text-neutral-950 tracking-wide text-[13px]">
            🍦 ร้านไอศครีมโบราณ คลอง 7
          </h2>
          <p className="text-neutral-500 text-[10px] mt-0.5 leading-relaxed">
            📞 090-417-1125 &nbsp;|&nbsp; 064-419-4456 &nbsp;|&nbsp; 064-515-9924
          </p>
        </div>

        <div className="flex text-xs justify-between items-center border-b border-neutral-100/70 pb-1">
          <span className="text-neutral-500">👤 ผู้เบิก/ลูกค้า:</span>
          <span className="font-bold text-neutral-950">{member?.name || '-'}</span>
        </div>

        <div className="flex text-xs justify-between items-center">
          <span className="text-neutral-500">📅 วันที่:</span>
          <span className="font-medium text-neutral-800">
            {bill ? formatThaiFullDate(bill.date) : '-'}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div
          className={cn(
            'border-b border-dashed border-neutral-300 pb-1 font-bold grid text-neutral-700 text-xs',
            mode === 'checkout' ? 'grid-cols-12' : 'grid-cols-[repeat(18,minmax(0,1fr))]'
          )}
        >
          {mode === 'checkout' ? (
            <>
              <div className="col-span-6">รายการ</div>
              <div className="col-span-2 text-right">จำนวน</div>
              <div className="col-span-2 text-right">ราคา</div>
              <div className="col-span-2 text-right">รวม</div>
            </>
          ) : (
            <>
              <div className="col-span-4">รายการสินค้า</div>
              <div className="col-span-2 text-right">เก่า</div>
              <div className="col-span-2 text-right">ใหม่</div>
              <div className="col-span-2 text-right">รวม</div>
              <div className="col-span-2 text-right">เหลือ</div>
              <div className="col-span-2 text-right">ขาย</div>
              <div className="col-span-2 text-right">ราคา</div>
              <div className="col-span-2 text-right">รวมเงิน</div>
            </>
          )}
        </div>

        <div
          className={cn(
            'space-y-1 py-0.5 text-neutral-800',
            mode === 'checkout' ? 'text-[8px]' : 'text-xs'
          )}
        >
          <ReceiptLineItems
            mode={mode}
            bill={bill}
            products={products}
            member={member}
            memberClass={memberClass}
            previousOwed={previousOwed}
          />
        </div>
      </div>
    </>
  );
}

function ReceiptLineItems({
  mode,
  bill,
  products,
  member,
  memberClass,
  previousOwed,
}: {
  mode: LedgerMode;
  bill: Bill | undefined;
  products: Product[];
  member: Member | undefined;
  memberClass: ReturnType<typeof getMemberClass>;
  previousOwed: number;
}) {
  let totalItemsPriceSum = 0;
  let totalAddonsPriceSum = 0;

  if (mode === 'checkout') {
    const mainItemsHtml = bill?.items
      .filter((item) => {
        const prod = products.find((p) => p.id === item.productId);
        return prod && prod.type !== 'Car' && prod.type !== 'House' && prod.type !== 'D';
      })
      .map((item) => {
        const prod = products.find((p) => p.id === item.productId)!;
        const price = getMemberPriceByClass(prod, memberClass);
        if (item.totalStock === 0 && item.newStock === 0) return null;
        const itemTotalPrice = item.totalStock * price;
        totalItemsPriceSum += itemTotalPrice;
        return (
          <div
            key={item.productId}
            className="grid grid-cols-12 gap-2 items-center text-xl border-b border-neutral-100 pb-0.5 last:border-0"
          >
            <div className="col-span-6 font-medium truncate">{prod.name}</div>
            <div className="col-span-2 text-right font-semibold">{item.totalStock}</div>
            <div className="col-span-2 text-right text-neutral-500">{price}</div>
            <div className="col-span-2 text-right font-bold">
              {itemTotalPrice.toLocaleString()}
            </div>
          </div>
        );
      });

    const dProduct = products.find((p) => p.type === 'D');
    const dItem = dProduct
      ? bill?.items?.find((i) => i.productId === dProduct.id)
      : null;
    const dQuantity = dItem?.totalStock || 0;
    if (dProduct && dQuantity > 0) {
      const dPrice = getMemberPriceByClass(dProduct, memberClass);
      totalAddonsPriceSum += dQuantity * (dPrice || 0);
    }
    if (memberClass === 'In') {
      if (member?.statusIn?.house) {
        const h = products.find((p) => p.type === 'House');
        if (h) totalAddonsPriceSum += h.priceIn || 0;
      }
      if (member?.statusIn?.car) {
        const c = products.find((p) => p.type === 'Car');
        if (c) totalAddonsPriceSum += c.priceIn || 0;
      }
    }

    const finalCheckoutTotalToday = totalItemsPriceSum + totalAddonsPriceSum;
    const totalDebtWithCheckout = finalCheckoutTotalToday + previousOwed;

    return (
      <>
        {mainItemsHtml}
        {totalAddonsPriceSum > 0 && (
          <PrintCheckoutAddons
            products={products}
            member={member}
            memberClass={memberClass}
            dProduct={dProduct}
            dQuantity={dQuantity}
          />
        )}
        <div className="border-t border-dashed border-neutral-300 mt-2 pt-1.5 space-y-0.5 text-xl">
          <div className="flex justify-between text-sm text-neutral-500">
            <span>ค่าสินค้า:</span>
            <span className="text-lg">{totalItemsPriceSum.toLocaleString()} บาท</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-500">
            <span>ค่าบริการเสริม:</span>
            <span className="text-lg">{totalAddonsPriceSum.toLocaleString()} บาท</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-neutral-100 pt-0.5">
            <span>ยอดวันนี้:</span>
            <span className="text-lg">{finalCheckoutTotalToday.toLocaleString()} บาท</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-500">
            <span>หนี้เดิม:</span>
            <span className="text-lg">{Math.round(previousOwed).toLocaleString()} บาท</span>
          </div>
          <div className="flex justify-between font-bold mt-0.5 p-1 rounded border text-xl">
            <span>ยอดสุทธิ์:</span>
            <span
              className={
                totalDebtWithCheckout > 0 ? 'text-red-600 text-xl' : 'text-neutral-950'
              }
            >
              {Math.round(totalDebtWithCheckout).toLocaleString()} บาท
            </span>
          </div>
          {bill?.notes && (
            <div className="mt-1 text-neutral-400 italic bg-neutral-50 p-1 rounded border border-neutral-100">
              * {bill.notes}
            </div>
          )}
        </div>
      </>
    );
  }

  getReturnProductTypes(products).forEach((type) => {
    const tp = products.filter((p) => p.type === type);
    const ti =
      bill?.items.filter((item) => tp.some((p) => p.id === item.productId)) || [];
    const typeStock = ti.reduce((s, i) => s + i.totalStock, 0);
    const returnedInput = bill?.returnInputs?.[type] ?? 0;
    const actualSold = Math.max(0, typeStock - returnedInput);
    const base = tp[0];
    const price = base ? getMemberPriceByClass(base, memberClass) : 0;
    totalItemsPriceSum += actualSold * price;
  });

  const dProductReturn = products.find((p) => p.type === 'D');
  const dItemReturn = dProductReturn
    ? bill?.items?.find((i) => i.productId === dProductReturn.id)
    : null;
  const dQuantityReturn = dItemReturn?.totalStock || 0;
  if (dProductReturn && dQuantityReturn > 0) {
    const dPrice = getMemberPriceByClass(dProductReturn, memberClass);
    totalAddonsPriceSum += dQuantityReturn * (dPrice || 0);
  }
  if (memberClass === 'In') {
    if (member?.statusIn?.house) {
      const h = products.find((p) => p.type === 'House');
      if (h) totalAddonsPriceSum += h.priceIn || 0;
    }
    if (member?.statusIn?.car) {
      const c = products.find((p) => p.type === 'Car');
      if (c) totalAddonsPriceSum += c.priceIn || 0;
    }
  }

  const finalReturnTotalToday = totalItemsPriceSum + totalAddonsPriceSum;
  const amountPaidToday = bill?.amountPaid || 0;
  const finalOwedAmount = finalReturnTotalToday + previousOwed - amountPaidToday;

  return (
    <>
      {getReturnProductTypes(products).map((type) => {
        const tp = products.filter((p) => p.type === type);
        const ti =
          bill?.items.filter((item) => tp.some((p) => p.id === item.productId)) || [];
        // คำนวณยอดยกมา ยอดใหม่ และยอดรวม
        const oldStock = ti.reduce((s, i) => s + (i.oldStock || 0), 0); // ยอดยกมา (เก่า)
        const newStock = ti.reduce((s, i) => s + (i.newStock || 0), 0); // ยอดเบิกเพิ่ม (ใหม่)
        const typeStock = ti.reduce((s, i) => s + i.totalStock, 0);
        if (typeStock === 0) return null;
        const returnedInput = bill?.returnInputs?.[type] ?? 0;
        const actualSold = typeStock - returnedInput;
        const base = tp[0];
        const price = base ? getMemberPriceByClass(base, memberClass) : 0;
        const typeLabel =
          PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

        return (
          <div
            key={type}
            className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-0 text-[10px] items-center text-sm gap-y-0.5 border-b border-neutral-100 pb-1 last:border-0"
          >
            <div className="col-span-4 font-medium truncate">{typeLabel}</div>
            <div className="col-span-2 text-right text-neutral-400">{oldStock}</div>
            <div className="col-span-2 text-right text-neutral-400">{newStock}</div>
            <div className="col-span-2 text-right text-neutral-500">{typeStock}</div>
            <div className="col-span-2 text-right text-neutral-500">{returnedInput}</div>
            <div className="col-span-2 text-right font-semibold">
              {Math.max(0, actualSold)}
            </div>
            <div className="col-span-2 text-right text-neutral-500">{price}</div>
            <div className="col-span-2 text-right font-bold">
              {Math.max(0, actualSold * price).toLocaleString()}
            </div>
          </div>
        );
      })}

      {totalAddonsPriceSum > 0 && (
        <PrintReturnAddons
          products={products}
          member={member}
          memberClass={memberClass}
          dProduct={dProductReturn}
          dQuantity={dQuantityReturn}
        />
      )}

      <div className="border-t border-dashed border-neutral-300 mt-3 pt-2 space-y-1 text-xs">
        <div className="flex justify-between text-neutral-600">
          <span>ค่าสินค้าไอศกรีมรวมวันนี้:</span>
          <span className="font-medium">{totalItemsPriceSum.toLocaleString()} บาท</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>ค่าบริการเสริมรวมวันนี้:</span>
          <span className="font-medium">{totalAddonsPriceSum.toLocaleString()} บาท</span>
        </div>
        <div className="flex justify-between font-semibold border-t border-neutral-100 pt-1">
          <span>ยอดรวมสุทธิวันนี้:</span>
          <span>{finalReturnTotalToday.toLocaleString()} บาท</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>ยอดค้างชำระ:</span>
          <span className="font-medium">{Math.round(previousOwed).toLocaleString()} บาท</span>
        </div>
        <div className="flex justify-between bg-neutral-50 p-1 rounded border border-neutral-150">
          <span className="font-semibold">ชำระเงินวันนี้:</span>
          <span className="font-bold">-{Math.round(amountPaidToday).toLocaleString()} บาท</span>
        </div>
        <div className="flex justify-between items-center font-bold text-sm bg-neutral-50 p-1.5 rounded border border-neutral-200 mt-1">
          <span>ยอดรวมทั้งหมด:</span>
          <span className={finalOwedAmount > 0 ? 'text-red-600' : 'text-emerald-600'}>
            {finalOwedAmount > 0 ? Math.round(finalOwedAmount).toLocaleString() : '0'} บาท
          </span>
        </div>
        {bill?.notes && (
          <div className="mt-2 text-[10px] text-neutral-500 italic bg-neutral-50 p-1.5 rounded border border-neutral-100">
            * หมายเหตุ: {bill.notes}
          </div>
        )}
      </div>
    </>
  );
}

function PrintCheckoutAddons({
  products,
  member,
  memberClass,
  dProduct,
  dQuantity,
}: {
  products: Product[];
  member: Member | undefined;
  memberClass: ReturnType<typeof getMemberClass>;
  dProduct: Product | undefined;
  dQuantity: number;
}) {
  return (
    <div className="space-y-0.5 pt-1 border-t text-xl border-neutral-200 mt-1.5">
      <div className="text-sm text-neutral-400 mb-0.5">ค่าบริการเสริม</div>
      {memberClass === 'In' && member?.statusIn?.house && (() => {
        const h = products.find((p) => p.type === 'House');
        if (!h) return null;
        return (
          <div className="grid grid-cols-12 text-sm">
            <div className="col-span-10">🏠 ค่าแพ็กเกจบ้าน</div>
            <div className="col-span-2 text-right text-lg font-bold">
              +{h.priceIn.toLocaleString()}
            </div>
          </div>
        );
      })()}
      {memberClass === 'In' && member?.statusIn?.car && (() => {
        const c = products.find((p) => p.type === 'Car');
        if (!c) return null;
        return (
          <div className="grid grid-cols-12 text-sm">
            <div className="col-span-10">🚗 ค่าแพ็กเกจรถ</div>
            <div className="col-span-2 text-right text-lg font-bold">
              +{c.priceIn.toLocaleString()}
            </div>
          </div>
        );
      })()}
      {dProduct && dQuantity > 0 && (() => {
        const dPrice = getMemberPriceByClass(dProduct, memberClass);
        return (
          <div className="grid grid-cols-12 text-sm">
            <div className="col-span-10">
              🧊 น้ำแข็งแห้ง {dQuantity} x {dPrice?.toLocaleString()}
            </div>
            <div className="col-span-2 text-right text-lg font-bold">
              +{(dQuantity * (dPrice || 0)).toLocaleString()}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function PrintReturnAddons({
  products,
  member,
  memberClass,
  dProduct,
  dQuantity,
}: {
  products: Product[];
  member: Member | undefined;
  memberClass: ReturnType<typeof getMemberClass>;
  dProduct: Product | undefined;
  dQuantity: number;
}) {
  return (
    <div className="space-y-1 pt-1.5 border-t border-neutral-200 mt-2">
      <div className="text-[10px] font-bold text-neutral-400 mb-1">
        ค่าบริการ / แพ็กเกจเสริม
      </div>
      {memberClass === 'In' && member?.statusIn?.house && (() => {
        const h = products.find((p) => p.type === 'House');
        if (!h) return null;
        return (
          <div className="grid grid-cols-12 text-[11px] text-neutral-700 items-center">
            <div className="col-span-8">🏠 ค่าแพ็กเกจประจำบ้าน</div>
            <div className="col-span-2 text-right text-neutral-600">{h.priceIn}</div>
            <div className="col-span-2 text-right font-bold">+{h.priceIn.toLocaleString()}</div>
          </div>
        );
      })()}
      {memberClass === 'In' && member?.statusIn?.car && (() => {
        const c = products.find((p) => p.type === 'Car');
        if (!c) return null;
        return (
          <div className="grid grid-cols-12 text-[11px] text-neutral-700 items-center">
            <div className="col-span-8">🚗 ค่าแพ็กเกจประจำรถ</div>
            <div className="col-span-2 text-right text-neutral-600">{c.priceIn}</div>
            <div className="col-span-2 text-right font-bold">+{c.priceIn.toLocaleString()}</div>
          </div>
        );
      })()}
      {dProduct && dQuantity > 0 && (() => {
        const dPrice = getMemberPriceByClass(dProduct, memberClass);
        return (
          <div className="grid grid-cols-12 text-[11px] text-neutral-700 items-center">
            <div className="col-span-6">🧊 น้ำแข็งแห้ง (จำนวน {dQuantity})</div>
            <div className="col-span-4 text-right text-neutral-600">{dPrice} / ชิ้น</div>
            <div className="col-span-2 text-right font-bold">
              +{(dQuantity * (dPrice || 0)).toLocaleString()}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
