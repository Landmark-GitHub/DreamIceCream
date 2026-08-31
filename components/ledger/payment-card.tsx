'use client';

import { Bill, Member, Product, calculateBillTotals } from '@/lib/types';
import { Banknote, Lock, AlertCircle } from 'lucide-react';
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
  previousOwed: number; // รับค่ายอดค้าง/เครดิตเดิมเข้ามา
  onAmountPaidChange: (value: number) => void;
  onAddMoneyChange?: (value: number) => void; // ✅ รับฟังก์ชันเปลี่ยนค่า addMoney
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
  onAddMoneyChange,
  onNotesChange,
  onPayFull,
  onReturnGoods,
  onCloseDay,
}: PaymentCardProps) {
  const isDraft = bill.status === 'draft';
  const isCompleted = bill.status === 'completed';

  const addMoney = bill.addMoney || 0;
  const notes = bill.notes?.trim() || '';

  // ตรวจสอบว่าถ้ามีการใส่ addMoney จะต้องมีหมายเหตุเสมอ
  const isNotesRequired = addMoney !== 0;
  const isNotesMissing = isNotesRequired && notes === '';

  // 1. คำนวณยอดขายวันนี้
  const { totalSales: calculatedSales } = calculateBillTotals(bill, products, member);
  
  // 2. คำนวณยอดสุทธิที่ต้องจ่ายทั้งหมดจริง = (ยอดขายวันนี้ + ยอดค้างเดิม + เงินเพิ่ม) - ยอดที่จ่ายวันนี้
  const netAmountOwed = (Math.round(totalSales) + Math.round(previousOwed) +  Math.round(addMoney)) - (bill.amountPaid || 0);

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
          {/* ยอดขายวันนี้ */}
          <div className="flex justify-between items-center bg-sky-500/10 p-2.5 rounded-lg border border-sky-500/20 text-sm">
            <span className="font-medium text-sky-700">ยอดสินค้าวันนี้:</span>
            <span className="font-bold text-sky-700">
              {Math.round(totalSales).toLocaleString()} บาท
            </span>
          </div>

          {/* ยอดค้างสะสม / เครดิตสะสมเดิม */}
          <div className={cn(
            "flex justify-between items-center p-2.5 rounded-lg border text-sm",
            previousOwed < 0 
              ? "bg-emerald-500/10 border-emerald-500/20" 
              : "bg-amber-500/10 border-amber-500/20"
          )}>
            <span className={cn("font-medium", previousOwed < 0 ? "text-emerald-700" : "text-amber-700")}>
              {previousOwed < 0 ? 'เครดิตสะสมเดิม:' : 'ยอดค้างสะสมเดิม:'}
            </span>
            <span className={cn("font-bold", previousOwed < 0 ? "text-emerald-700" : "text-amber-700")}>
              {Math.round(previousOwed).toLocaleString()} บาท
            </span>
          </div>

          {/* ✅ ช่องกรอกเพิ่มเงิน (addMoney) */}
          <div>
            <Label className="text-sm text-muted-foreground flex items-center justify-between">
              <span>ค่าใช้จ่ายเพิ่มเติม</span>
              {isNotesRequired && (
                <span className="text-[11px] text-amber-600 font-medium">* ต้องระบุหมายเหตุ</span>
              )}
            </Label>
            <div className="mt-1">
              <Input
                type="number"
                value={bill.addMoney !== undefined && bill.addMoney !== 0 ? bill.addMoney.toString() : ''}
                onChange={(e) => onAddMoneyChange?.(parseFloat(e.target.value) || 0)}
                placeholder="0"
                disabled={isDraft || isCompleted}
              />
            </div>
          </div>

          {/* ช่องหมายเหตุ (บังคับเมื่อมี addMoney) */}
          <div>
            <div className="flex justify-between items-center">
              <Label className="text-sm text-muted-foreground">
                หมายเหตุ {isNotesRequired && <span className="text-destructive">*</span>}
              </Label>
              {isNotesMissing && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> กรุณาระบุเหตุผลที่เพิ่มเงิน
                </span>
              )}
            </div>
            <Input
              value={bill.notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder={isNotesRequired ? "กรุณาระบุเหตุผลการเพิ่มเงิน..." : "บันทึกเพิ่มเติม..."}
              disabled={isCompleted}
              className={cn("mt-1", isNotesMissing && "border-destructive focus-visible:ring-destructive")}
            />
          </div>

          {/* ยอดค้างสุทธิรวมทั้งหมด (นำ netAmountOwed มาแสดง) */}
          <div
            className={cn(
              'p-3 rounded-lg',
              netAmountOwed > 0
                ? 'bg-destructive/10'
                : netAmountOwed < 0
                ? 'bg-emerald-500/10'
                : 'bg-chart-2/10'
            )}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {netAmountOwed > 0
                  ? 'ยอดค้างสุทธิรวม'
                  : netAmountOwed < 0
                  ? 'ยอดคงเหลือ (เป็นเครดิตสะสม)'
                  : 'ชำระครบพอดี'}
              </span>
              <span
                className={cn(
                  'text-3xl font-bold',
                  netAmountOwed > 0
                    ? 'text-destructive'
                    : netAmountOwed < 0
                    ? 'text-emerald-600'
                    : 'text-chart-2'
                )}
              >
                {Math.round(netAmountOwed).toLocaleString()} บาท
              </span>
            </div>
          </div>
          
          {/* ช่องกรอกเงินที่จ่ายวันนี้ */}
          <div>
            <Label className="text-sm text-muted-foreground">ยอดจ่ายวันนี้ (บาท)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                value={bill.amountPaid !== undefined && bill.amountPaid !== 0 ? bill.amountPaid.toString() : ''}
                onChange={(e) => onAmountPaidChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                disabled={isDraft || isCompleted}
              />
              <Button
                variant="outline"
                onClick={onPayFull}
                disabled={isDraft || isCompleted}
              >
                จ่ายครบ
              </Button>
            </div>
          </div>


          {!isCompleted && (
            <div className="grid grid-rows-1 gap-2">
              <Button 
                onClick={onCloseDay} 
                className="flex-1" 
                disabled={isDraft || isNotesMissing}
              >
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
            <div className="grid grid-rows-1 gap-2">
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