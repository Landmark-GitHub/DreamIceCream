'use client';

import { Bill, Member, Product, getProductPrice, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { getReturnProductTypes } from '@/lib/ledger-utils';
import { CheckCircle2, Lock, Package, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddonFeeRows } from './addon-fee-rows';

interface CheckoutSummaryCardProps {
  bill: Bill;
  products: Product[];
  member: Member | undefined;
  totalStock: number;
  totalSales: number;
  summaryMode: 'type' | 'all';
  onSummaryModeChange: (mode: 'type' | 'all') => void;
  onConfirmCheckout: () => void;
  onDeleteClick: () => void;
  onRevertToDraft?: () => void;
}

export function CheckoutSummaryCard({
  bill,
  products,
  member,
  totalStock,
  totalSales,
  summaryMode,
  onSummaryModeChange,
  onConfirmCheckout,
  onDeleteClick,
  onRevertToDraft,
}: CheckoutSummaryCardProps) {
  const productTypes = getReturnProductTypes(products);
  const isCompleted = bill.status === 'completed';
  const isCheckout = bill.status === 'checkout';
  const isDraft = bill.status === 'draft';

  return (
    <Card className="border-primary/30 bg-card shadow-md">
      <CardContent className="p-5">
        {/* ส่วนหัวการ์ด */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">สรุปยอดเบิกสินค้า</h3>
          </div>
          <div className="flex rounded-lg border-2 border-primary/40 overflow-hidden text-sm font-bold shrink-0">
            <button
              onClick={() => onSummaryModeChange('type')}
              className={cn(
                'px-3.5 py-2 transition-colors',
                summaryMode === 'type'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted'
              )}
            >
              ชนิด
            </button>
            <button
              onClick={() => onSummaryModeChange('all')}
              className={cn(
                'px-3.5 py-2 transition-colors border-l-2 border-primary/40',
                summaryMode === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted'
              )}
            >
              ทั้งหมด
            </button>
          </div>
        </div>

        {/* รายการสินค้าและวิธีคิด */}
        <div className="pt-3 border-t-2 border-border space-y-3">
          {summaryMode === 'type'
            ? productTypes.map((type) => {
                const typeProducts = products.filter((p) => p.type === type);
                const typeItems = bill.items.filter((item) =>
                  typeProducts.some((p) => p.id === item.productId)
                );

                const typeOriginalOld = typeItems.reduce((sum, i) => sum + i.oldStock, 0);
                const typeNew = typeItems.reduce((sum, i) => sum + i.newStock, 0);
                const typeTotal = typeItems.reduce((sum, i) => sum + i.totalStock, 0);

                if (typeTotal === 0 && typeNew === 0) return null;

                const baseProduct = typeProducts[0];
                const price = baseProduct ? getProductPrice(baseProduct, member) : 0;
                const typeLabel =
                  PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

                return (
                  <div
                    key={type}
                    className="flex justify-between items-center py-2.5 border-b border-border/60 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="font-bold text-lg text-foreground shrink-0">{typeLabel}</span>
                      <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap overflow-x-auto">
                        {typeOriginalOld}&nbsp;&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;{typeNew}&nbsp;&nbsp;&nbsp;=&nbsp;&nbsp;&nbsp;{typeTotal}&nbsp;&nbsp;&nbsp;×&nbsp;&nbsp;&nbsp;{price}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-2xl font-black text-primary">
                        {(typeTotal * price).toLocaleString()}
                      </span>
                      <span className="text-base font-bold text-muted-foreground">บาท</span>
                    </div>
                  </div>
                );
              })
            : bill.items
                .filter((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  return prod && prod.type !== 'D' && prod.type !== 'Car' && prod.type !== 'House';
                })
                .filter((item) => item.totalStock > 0 || item.newStock > 0)
                .map((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  if (!prod) return null;
                  const price = getProductPrice(prod, member);

                  return (
                    <div
                      key={item.productId}
                      className="flex justify-between items-center py-2.5 border-b border-border/60 last:border-0"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-lg text-foreground">{prod.name}</span>
                        {/* แสดงวิธีคิดรายชิ้น */}
                        <span className="text-sm font-semibold text-muted-foreground">
                          ({item.oldStock} เก่า + {item.newStock} ใหม่) = {item.totalStock} ชิ้น × {price} บาท
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 shrink-0">
                        <span className="text-2xl font-black text-primary">
                          {(item.totalStock * price).toLocaleString()}
                        </span>
                        <span className="text-base font-bold text-muted-foreground">บาท</span>
                      </div>
                    </div>
                  );
                })}

          <AddonFeeRows
            products={products}
            bill={bill}
            member={member}
            variant="checkout"
          />
        </div>

        {/* ยอดรวมชิ้น */}
        <div className="flex justify-between items-center pt-4 border-t-2 border-border mt-3">
          <span className="text-base font-bold text-muted-foreground">รวมจำนวนสินค้าทั้งหมด</span>
          <span>
            <span className="text-2xl font-black text-foreground">{totalStock}</span>
            <span className="text-sm font-bold text-muted-foreground ml-1">ชิ้น</span>
          </span>
        </div>

        {/* ยอดเงินรวมสุทธิ */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-bold text-foreground">ยอดเงินรวมสุทธิ</span>
          <span className="text-4xl font-black text-primary">
            {Math.round(totalSales).toLocaleString()} บาท
          </span>
        </div>

        {/* ปุ่มกดดำเนินการ */}
        <div className="flex gap-2.5 mt-5">
          {isDraft && (
            <Button
              onClick={onConfirmCheckout}
              className="flex-1 bg-primary hover:bg-primary/90 text-base font-bold py-6 shadow-md"
              disabled={totalStock === 0}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              ยืนยันการเบิกสินค้า
            </Button>
          )}
          {isCheckout && (
            <div className="flex-1 text-center py-3 text-base text-chart-2 bg-chart-2/15 rounded-xl font-bold flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 inline mr-2" />
              เบิกสินค้าเรียบร้อยแล้ว
            </div>
          )}
          {isCompleted && (
            <div className="flex-1 text-center py-3 text-base text-muted-foreground bg-muted rounded-xl font-bold flex items-center justify-center">
              <Lock className="w-5 h-5 inline mr-2" />
              ปิดวันแล้ว (ล็อกข้อมูล)
            </div>
          )}
          {isCheckout && onRevertToDraft && (
            <Button
              variant="outline"
              size="default"
              onClick={onRevertToDraft}
              disabled={isCompleted}
              className="shrink-0 px-4 py-6 border-2"
              title="กลับไปแก้ไข (เปลี่ยนสถานะเป็นกำลังเบิก)"
            >
              <RotateCcw className="w-5 h-5 text-orange-500 mr-1" />
              <span className="font-bold text-sm">แก้ไข</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="default"
            onClick={onDeleteClick}
            disabled={isCompleted}
            className="shrink-0 px-4 py-6 border-2"
          >
            <Trash2 className="w-5 h-5 text-destructive mr-1" />
            <span className="font-bold text-sm text-destructive">ลบ</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
