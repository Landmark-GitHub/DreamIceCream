'use client';

import { Bill, Member, Product, getProductPrice, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { getCheckoutProductTypes } from '@/lib/ledger-utils';
import { CheckCircle2, Lock, Package, Trash2 } from 'lucide-react';
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
}: CheckoutSummaryCardProps) {
  const productTypes = getCheckoutProductTypes(products);
  const isCompleted = bill.status === 'completed';
  const isCheckout = bill.status === 'checkout';
  const isDraft = bill.status === 'draft';

  return (
    <Card className="border-primary/30 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">สรุปยอดเบิก</h3>
            <p className="text-xs text-muted-foreground">เก่า + ใหม่ = รวม × ราคา</p>
          </div>
          <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium shrink-0">
            <button
              onClick={() => onSummaryModeChange('type')}
              className={cn(
                'px-2.5 py-1 transition-colors',
                summaryMode === 'type'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              ชนิด
            </button>
            <button
              onClick={() => onSummaryModeChange('all')}
              className={cn(
                'px-2.5 py-1 transition-colors border-l border-border',
                summaryMode === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              ทั้งหมด
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
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
                    className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-medium text-lg">{typeLabel}</span>
                      {/* <span className="text-xs text-muted-foreground/60 font-medium truncate">
                        ({typeOriginalOld} + {typeNew}) = {typeTotal} × {price}
                      </span> */}
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 pl-2">
                      <span className="text-2xl font-bold text-primary">
                        {(typeTotal * price).toLocaleString()}
                      </span>
                      <span className="text-lg text-muted-foreground"> บาท</span>
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
                      className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0"
                    >
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-medium text-base">{prod.name}</span>
                        <span className="text-xs text-muted-foreground/60 font-medium truncate">
                          ({item.oldStock} + {item.newStock}) = {item.totalStock} × {price}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 shrink-0 pl-2">
                        <span className="text-xl font-bold text-primary">
                          {(item.totalStock * price).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground"> บาท</span>
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

        <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
          <span className="text-sm text-muted-foreground">รวมจำนวนชิ้น</span>
          <span>
            <span className="text-xl font-bold text-foreground">{totalStock}</span>
            <span className="text-xs text-muted-foreground ml-1">ชิ้น</span>
          </span>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="font-semibold">ยอดเงินรวม</span>
          <span className="text-3xl font-bold text-primary">
            {Math.round(totalSales).toLocaleString()} บาท
          </span>
        </div>

        <div className="flex gap-2 mt-4">
          {isDraft && (
            <Button
              onClick={onConfirmCheckout}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={totalStock === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              ยืนยันการเบิก
            </Button>
          )}
          {isCheckout && (
            <div className="flex-1 text-center py-2.5 text-sm text-chart-2 bg-chart-2/10 rounded-lg font-medium">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              เบิกสินค้าแล้ว
            </div>
          )}
          {isCompleted && (
            <div className="flex-1 text-center py-2.5 text-sm text-muted-foreground bg-muted rounded-lg">
              <Lock className="w-4 h-4 inline mr-1" />
              ปิดวันแล้ว
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={onDeleteClick}
            disabled={isCompleted}
            className="shrink-0"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
