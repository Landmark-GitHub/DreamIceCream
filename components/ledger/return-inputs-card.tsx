'use client';

import { Bill, Product, Member, getMemberClass, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { getCheckoutProductTypes, getMemberPriceByClass, } from '@/lib/ledger-utils';
import { Calculator } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, Lock } from 'lucide-react';
import { AddonFeeRows } from './addon-fee-rows';

interface ReturnInputsCardProps {
  bill: Bill;
  products: Product[];
  member: Member | undefined;
  totalSales: number;
  onUpdateReturnInput: (type: string, value: number) => void;
  onSkipCheck: () => void;
  onCloseDay: () => void;
  onReturnGoods: () => void;
  isPaymentComplete: boolean; // 1. เพิ่มการรับ Props ตัวนี้เข้ามา
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
  isPaymentComplete, // 2. ประกาศดึงไปใช้งาน
}: ReturnInputsCardProps) {
  const RETURN_TYPE_ORDER = ['XL', 'S', 'Coffee', 'Sandwich','Cup', 'Cone'];
  const productTypes = [...getCheckoutProductTypes(products)].sort((a, b) => {
    const ia = RETURN_TYPE_ORDER.indexOf(a);
    const ib = RETURN_TYPE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const isCompleted = bill.status === 'completed';
  const memberClass = getMemberClass(member);


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

        <div className="space-y-4 pt-2 border-t border-border">
          {productTypes.map((type) => {
            const typeProducts = products.filter(
              (p) => p.type === type && p.type !== 'D'
            );
            const typeItems = bill.items.filter((item) =>
              typeProducts.some((p) => p.id === item.productId)
            );
            const typeTotal = typeItems.reduce((sum, i) => sum + i.totalStock, 0);

            if (typeItems.length === 0) return null;

            const typeLabel =
              PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

            return (
              <div key={type} className="grid grid-cols-12 items-center gap-2">
                <Label className="col-span-6 text-sm font-medium text-muted-foreground truncate">
                  {typeLabel}
                </Label>
                <div className="col-span-6 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={`ระบบนับ: ${typeTotal}`}
                    disabled={isCompleted || typeTotal === 0}
                    max={typeTotal}
                    min={0}
                    className="text-right h-9"
                    value={
                      bill.returnInputs?.[type] != null
                        ? bill.returnInputs[type]
                        : ''
                    }
                    onChange={(e) => {
                      let val =
                        e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                      if (val < 0) val = 0;
                      if (val > typeTotal) val = typeTotal;
                      onUpdateReturnInput(type, val);
                    }}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">ชิ้น</span>
                </div>
              </div>
            );
          })}
        </div>

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


          <button
            type="button"
            disabled={isCompleted || !isPaymentComplete} // 3. ปุ่มจะล็อกถ้าบิลสำเร็จแล้ว หรือยังจ่ายเงินไม่ครบตามสูตร
            onClick={onReturnGoods}
            className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md text-sm transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Lock className="w-4 h-4 mr-2" />
            {isPaymentComplete ? '📦 คืนของ' : '⚠️ ต้องชำระเงินให้หมดก่อนจึงจะสามารถคืนของได้'}
          </button>
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

