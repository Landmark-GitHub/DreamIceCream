'use client';

import { Bill, Member, Product, calculateBillTotals } from '@/lib/types';
import { Banknote, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PaymentCardProps {
  bill: Bill;
  products: Product[];
  member: Member | undefined;
  totalSales: number;
  previousOwed: number;
  onAmountPaidChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onPayFull: () => void;
  onReturnGoods: () => void;
  onCloseDay: () => void;
}

export function PaymentCard({
  bill,
  products,
  member,
  totalSales,
  previousOwed,
  onAmountPaidChange,
  onNotesChange,
  onPayFull,
  onReturnGoods,
  onCloseDay,
}: PaymentCardProps) {
  const isDraft = bill.status === 'draft';
  const isCompleted = bill.status === 'completed';

  const { totalSales: calculatedSales } = calculateBillTotals(bill, products, member);
  const amountOwed = calculatedSales + previousOwed - (bill.amountPaid || 0);

  return (
    <Card className="border-chart-2/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">บันทึกการจ่ายเงิน</h3>
            <p className="text-xs text-muted-foreground">ยอดที่ได้รับจากผู้ขาย</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center bg-sky-500/10 p-2.5 rounded-lg border border-sky-500/20 text-sm">
            <span className="font-medium text-sky-700">ยอดสินค้า:</span>
            <span className="font-bold text-sky-700">
              {Math.round(totalSales).toLocaleString()} บาท
            </span>
          </div>

          <div className="flex justify-between items-center bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-sm">
            <span className="font-medium text-amber-700">ยอดค้างสะสม:</span>
            <span className="font-bold text-amber-700">
              {Math.round(previousOwed).toLocaleString()} บาท
            </span>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">ยอดจ่ายวันนี้ (บาท)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                value={bill.amountPaid?.toString() || ''}
                onChange={(e) => onAmountPaidChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                disabled={isDraft}
              />
              <Button
                variant="outline"
                onClick={onPayFull}
                disabled={
                  isDraft ||
                  isCompleted ||
                  totalSales + previousOwed <= 0
                }
              >
                จ่ายครบ
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'p-3 rounded-lg',
              amountOwed > 0 ? 'bg-destructive/10' : 'bg-chart-2/10'
            )}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {amountOwed > 0 ? 'ยอดค้างสุทธิรวม' : 'จ่ายครบหมดแล้ว'}
              </span>
              <span
                className={cn(
                  'text-3xl font-bold',
                  amountOwed > 0 ? 'text-destructive' : 'text-chart-2'
                )}
              >
                {amountOwed > 0 ? Math.round(amountOwed).toLocaleString() : '0'} บาท
              </span>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">หมายเหตุ</Label>
            <Input
              value={bill.notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="บันทึกเพิ่มเติม..."
              disabled={isCompleted}
              className="mt-1"
            />
          </div>

          {!isCompleted && (
            <div className="grid grid-rows-2 gap-2">
              <Button onClick={onCloseDay} className="flex-1" disabled={isDraft}>
                <Lock className="w-4 h-4 mr-2" />
                ปิดวัน (บันทึกยอด)
              </Button>
            </div>
          )}

          {isDraft && (
            <p className="text-xs text-muted-foreground text-center">
              ต้องยืนยันการเบิกก่อนจึงจะปิดวันได้
            </p>
          )}

          {isCompleted && (
            <div className="grid grid-rows-2 gap-2">
              <div className="text-center py-2 text-sm text-muted-foreground bg-muted rounded-lg">
                <Lock className="w-4 h-4 inline mr-1" />
                ปิดบิลแล้ว - ไม่สามารถแก้ไขได้
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
