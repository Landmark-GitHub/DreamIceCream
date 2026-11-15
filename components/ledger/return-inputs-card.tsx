'use client';

import { useMemo } from 'react';
import { Bill, Product, Member, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { getCheckoutProductTypes } from '@/lib/ledger-utils';
import { Calculator, Lock, Unlock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddonFeeRows } from './addon-fee-rows';

const RETURN_TYPE_ORDER = ['XL', 'S', 'Coffee', 'Sandwich', 'Cup', 'Cone'];

interface ReturnInputsCardProps {
  bill: Bill;
  products: Product[];
  member: Member | undefined;
  totalSales: number;
  // null = ช่องว่าง (ยังไม่กรอก)
  onUpdateReturnInput: (type: string, value: number | null) => void;
  onSkipCheck: () => void;
  onCloseDay: () => void;
  onReturnGoods: () => void;
  isPaymentComplete: boolean;
}

export function ReturnInputsCard({
  bill,
  products,
  member,
  totalSales,
  onUpdateReturnInput,
  onSkipCheck,
  onCloseDay,
  onReturnGoods,
  isPaymentComplete,
}: ReturnInputsCardProps) {
  const productTypes = useMemo(
    () =>
      [...getCheckoutProductTypes(products)].sort((a, b) => {
        const ia = RETURN_TYPE_ORDER.indexOf(a);
        const ib = RETURN_TYPE_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }),
    [products]
  );

  const isCompleted = bill.status === 'completed';

  const handleSkipCheck = () => {
    if (window.confirm('ยืนยัน "ไม่เช็คยอด" ?')) onSkipCheck();
  };

  const handleCloseDay = () => {
    if (window.confirm('ยืนยัน "ปิดยอด" ? การดำเนินการนี้แก้ไขไม่ได้')) onCloseDay();
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">
              กรอกยอดรวมคงเหลือรายชนิด
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              ตรวจสอบยอดขายแยกตามประเภทสินค้า
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          {/* หัวตาราง */}
          <div className="grid grid-cols-12 items-center gap-1.5 pb-1 text-xs text-muted-foreground">
            <span className="col-span-3">ชนิด</span>
            <span className="col-span-2 text-center">เดิม</span>
            <span className="col-span-2 text-center">ใหม่</span>
            <span className="col-span-5 text-right">คงเหลือ</span>
          </div>

          <div className="space-y-1">
            {productTypes.map((type) => {
              const typeProducts = products.filter((p) => p.type === type);
              const typeItems = bill.items.filter((item) =>
                typeProducts.some((p) => p.id === item.productId)
              );

              if (typeItems.length === 0) return null;

              const typeOriginalOld = typeItems.reduce((sum, i) => sum + i.oldStock, 0);
              const typeTotal = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
              const typeNew = typeItems.reduce((sum, i) => sum + i.newStock, 0);

              const typeLabel =
                PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

              return (
                <div
                  key={type}
                  className="grid grid-cols-12 items-center gap-1.5 py-1.5 border-b border-border last:border-none"
                >
                  <Label
                    className="col-span-3 text-sm font-medium text-muted-foreground truncate"
                    title={typeLabel}
                  >
                    {typeLabel}
                  </Label>

                  <span className="col-span-2 text-xs sm:text-sm text-muted-foreground text-center">
                    {typeOriginalOld}
                  </span>
                  <span className="col-span-2 text-xs sm:text-sm text-muted-foreground text-center">
                    {typeNew}
                  </span>

                  <div className="col-span-5 flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={`${typeTotal}`}
                      disabled={isCompleted || typeTotal === 0}
                      max={typeTotal}
                      min={0}
                      className="text-right h-8 text-sm px-2 w-full"
                      value={bill.returnInputs?.[type] ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          onUpdateReturnInput(type, null);
                          return;
                        }
                        const parsed = parseFloat(raw);
                        if (Number.isNaN(parsed)) return;
                        onUpdateReturnInput(
                          type,
                          Math.min(Math.max(parsed, 0), typeTotal)
                        );
                      }}
                    />
                    <span className="text-xs text-muted-foreground shrink-0">ชิ้น</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
          <button
            type="button"
            disabled={isCompleted}
            onClick={handleSkipCheck}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">⚡ไม่เช็คยอด</span>
          </button>

          <button
            type="button"
            disabled={isCompleted}
            onClick={handleCloseDay}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">🔒ปิดยอด</span>
          </button>

          <button
            type="button"
            disabled={isCompleted || !isPaymentComplete}
            onClick={onReturnGoods}
            className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md text-sm transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPaymentComplete ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            📦 คืนของ
          </button>
          {!isCompleted && !isPaymentComplete && (
            <p className="col-span-2 text-xs text-red-600 text-center">
              ⚠️ ต้องชำระเงินให้หมดก่อนจึงจะสามารถคืนของได้
            </p>
          )}
        </div>

        {/* แพ็กเกจบ้าน / รถ / น้ำแข็งแห้ง ต่อท้ายปุ่มควบคุม */}
        <div className="mt-4 space-y-2">
          <AddonFeeRows
            products={products}
            bill={bill}
            member={member}
            variant="return"
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
          <span className="font-semibold">ยอดเงินรวม</span>
          <span className="text-3xl font-bold text-primary">
            {Math.round(totalSales).toLocaleString()} บาท
          </span>
        </div>
      </CardContent>
    </Card>
  );
}