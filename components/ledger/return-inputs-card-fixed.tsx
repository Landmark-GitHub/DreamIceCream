'use client';

import { Bill, Product, Member, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { getCheckoutProductTypes } from '@/lib/ledger-utils';
import { Calculator, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddonFeeRows } from './addon-fee-rows';

// ย้ายออกนอก component เพื่อไม่ให้สร้างใหม่ทุกครั้งที่ render
const RETURN_TYPE_ORDER = ['XL', 'S', 'Coffee', 'Sandwich', 'Cup', 'Cone'];

interface ReturnInputsCardProps {
  bill: Bill;
  products: Product[];
  member: Member | undefined;
  totalSales: number;
  // undefined = ช่องว่าง (ยังไม่ได้กรอก), 0 = นับแล้วเหลือ 0
  onUpdateReturnInput: (type: string, value: number | undefined) => void;
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
  const productTypes = [...getCheckoutProductTypes(products)].sort((a, b) => {
    const ia = RETURN_TYPE_ORDER.indexOf(a);
    const ib = RETURN_TYPE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const isCompleted = bill.status === 'completed';

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        {/* หัวการ์ด */}
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

        {/* รายการแยกตามชนิด */}
        <div className="space-y-2 pt-2 border-t border-border">
          {/* หัวคอลัมน์ */}
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
            <span className="col-span-4">ประเภท</span>
            <span className="col-span-2 text-center">เดิม</span>
            <span className="col-span-2 text-center">ใหม่</span>
            <span className="col-span-4 text-right">คงเหลือ</span>
          </div>

          {productTypes.map((type) => {
            const typeProducts = products.filter(
              (p) => p.type === type && p.type !== 'D'
            );
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
                className="grid grid-cols-12 items-center gap-2 py-1.5 border-b border-border last:border-none"
              >
                <Label
                  className="col-span-4 text-sm font-medium text-muted-foreground truncate"
                  title={typeLabel}
                >
                  {typeLabel}
                </Label>

                <span className="col-span-2 text-sm text-muted-foreground text-center">
                  {typeOriginalOld}
                </span>
                <span className="col-span-2 text-sm text-muted-foreground text-center">
                  {typeNew}
                </span>

                <div className="col-span-4 flex items-center gap-1 min-w-0">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={`${typeTotal}`}
                    disabled={isCompleted || typeTotal === 0}
                    max={typeTotal}
                    min={0}
                    className="text-right h-9 min-w-0 w-full px-2"
                    value={bill.returnInputs?.[type] ?? ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        onUpdateReturnInput(type, undefined);
                        return;
                      }
                      const n = parseInt(e.target.value, 10);
                      const val = Math.min(
                        Math.max(Number.isNaN(n) ? 0 : n, 0),
                        typeTotal
                      );
                      onUpdateReturnInput(type, val);
                    }}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">ชิ้น</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ปุ่มควบคุม */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
          <button
            type="button"
            disabled={isCompleted}
            onClick={onSkipCheck}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">⚡ไม่เช็คยอด</span>
          </button>

          <button
            type="button"
            disabled={isCompleted}
            onClick={onCloseDay}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">🔒ปิดยอด</span>
          </button>

          {/* ล็อกถ้าบิลเสร็จแล้ว หรือยังชำระเงินไม่ครบ */}
          <button
            type="button"
            disabled={isCompleted || !isPaymentComplete}
            onClick={onReturnGoods}
            className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md text-xs sm:text-sm whitespace-normal text-center transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              {isPaymentComplete
                ? '📦 คืนของ'
                : '⚠️ ต้องชำระเงินให้หมดก่อนจึงจะสามารถคืนของได้'}
            </span>
          </button>
        </div>

        {/* แพ็กเกจบ้าน / รถ / น้ำแข็งแห้ง */}
        <div className="mt-4 space-y-2">
          <AddonFeeRows
            products={products}
            bill={bill}
            member={member}
            variant="return"
          />
        </div>

        {/* ยอดรวม */}
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
