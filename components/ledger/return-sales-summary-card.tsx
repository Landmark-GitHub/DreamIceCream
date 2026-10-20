// 'use client';

// import { Bill, Member, Product, getMemberClass, PRODUCT_TYPE_LABELS } from '@/lib/types';
// import { getMemberPriceByClass, getReturnProductTypes } from '@/lib/ledger-utils';
// import { Calculator } from 'lucide-react';
// import { Card, CardContent } from '@/components/ui/card';
// import { AddonFeeRows } from './addon-fee-rows';

// interface ReturnSalesSummaryCardProps {
//   bill: Bill;
//   products: Product[];
//   member: Member | undefined;
//   totalSales: number;
// }

// export function ReturnSalesSummaryCard({
//   bill,
//   products,
//   member,
//   totalSales,
// }: ReturnSalesSummaryCardProps) {
//   const memberClass = getMemberClass(member);
//   const productTypes = getReturnProductTypes(products);

//   return (
//     <Card className="border-primary/30">
//       <CardContent className="p-4">
//         <div className="flex items-center gap-3 mb-4">
//           <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
//             <Calculator className="w-5 h-5 text-primary" />
//           </div>
//           <div>
//             <h3 className="font-semibold text-foreground">สรุปยอดขาย</h3>
//             <p className="text-xs text-muted-foreground">รวม - เหลือ = ขาย</p>
//           </div>
//         </div>

//         <div className="pt-3 border-t border-border space-y-2">
//           <div className="overflow-x-auto">
//             <div className="min-w-[420px]">
//               {/* Header row */}
//               <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1.5fr] items-center gap-1 pb-2 border-b border-border text-xs font-semibold text-muted-foreground">
//                 <span className="text-left pr-1">ชนิด</span>
//                 <span className="text-center">เก่า</span>
//                 <span className="text-center">ใหม่</span>
//                 <span className="text-center">รวม</span>
//                 <span className="text-center">เหลือ</span>
//                 <span className="text-center">ขาย</span>
//                 <span className="text-center">ราคา</span>
//                 <span className="text-right">เป็นเงิน</span>
//               </div>

//               {/* Data rows */}
//               {productTypes.map((type) => {
//                 const typeProducts = products.filter((p) => p.type === type);
//                 const typeItems = bill.items.filter((item) =>
//                   typeProducts.some((p) => p.id === item.productId)
//                 );

//                 const typeStock = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
//                 const typeOldStock = typeItems.reduce((sum, i) => sum + i.oldStock, 0);
//                 const typeNewStock = typeItems.reduce((sum, i) => sum + i.newStock, 0);

//                 if (typeStock === 0) return null;

//                 const returnedInput = bill.returnInputs?.[type] ?? 0;
//                 const actualSold = typeStock - returnedInput;

//                 const baseProduct = typeProducts[0];
//                 const price = baseProduct
//                   ? getMemberPriceByClass(baseProduct, memberClass)
//                   : 0;

//                 const typeLabel =
//                   PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

//                 return (
//                   <div
//                     key={type}
//                     className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1.5fr] items-center gap-1 py-1.5 text-[11px] sm:text-xs border-b border-border/40 last:border-0"
//                   >
//                     <span className="font-medium text-left truncate pr-1">{typeLabel}</span>
//                     <span className="text-muted-foreground text-center">{typeOldStock}</span>
//                     <span className="text-muted-foreground text-center">{typeNewStock}</span>
//                     <span className="text-foreground font-medium text-center">{typeStock}</span>
//                     <span className="text-orange-600 font-medium text-center">{returnedInput}</span>
//                     <span className="text-blue-600 dark:text-blue-400 font-semibold text-center">{Math.max(0, actualSold)}</span>
//                     <span className="text-muted-foreground text-center">{price}</span>
//                     <span className="font-bold text-primary text-right flex items-center justify-end gap-1">
//                       <span className="text-muted-foreground font-normal text-xs">=</span>
//                       <span className="text-xs sm:text-sm">
//                         {Math.max(0, actualSold * price).toLocaleString()}
//                       </span>
//                     </span>
//                   </div>
//                 );
//               })}

//               {/* <AddonFeeRows
//                 products={products}
//                 bill={bill}
//                 member={member}
//                 variant="return"
//               /> */}
//             </div>
//           </div>
//         </div>

//         <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
//           <span className="font-semibold">ยอดเงินรวม</span>
//           <span className="text-3xl font-bold text-primary">
//             {Math.round(totalSales).toLocaleString()} บาท
//           </span>
//         </div>

//       </CardContent>
//     </Card>
//   );
// }


'use client';

import { useState } from 'react';
import { Bill, Member, Product, getMemberClass, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { getMemberPriceByClass, getReturnProductTypes } from '@/lib/ledger-utils';
import { Calculator, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ReturnSalesSummaryCardProps {
  bill: Bill;
  products: Product[];
  member: Member | undefined;
  totalSales: number;
  defaultOpen?: boolean;
}

export function ReturnSalesSummaryCard({
  bill,
  products,
  member,
  totalSales,
  defaultOpen = false,
}: ReturnSalesSummaryCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const memberClass = getMemberClass(member);
  const productTypes = getReturnProductTypes(products);
  const totalText = `${Math.round(totalSales).toLocaleString()} บาท`;

  return (
    <Card className="border-primary/30 overflow-hidden">
      {/* ===== Header (กดเพื่อพับ/ขยาย) ===== */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-primary/5 active:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">สรุปยอดขาย</h3>
          <p className="text-xs text-muted-foreground truncate">รวม - เหลือ = ขาย</p>
        </div>

        {/* ยอดรวมย่อ: แสดงตอนพับ, จางหายตอนขยาย (กันซ้ำกับยอดใหญ่ด้านล่าง) */}
        <span
          className={`text-base font-bold text-primary shrink-0 transition-all duration-300 ${
            open ? 'opacity-0 translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'
          }`}
        >
          {totalText}
        </span>

        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ease-out ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* ===== Body (ขยายด้วย grid-rows trick ไม่ต้องรู้ความสูง) ===== */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="px-4 pb-4 pt-0">
            <div className="pt-3 border-t border-border space-y-2">
              <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                  {/* Header row */}
                  <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1.5fr] items-center gap-1 pb-2 border-b border-border text-xs font-semibold text-muted-foreground">
                    <span className="text-left pr-1">ชนิด</span>
                    <span className="text-center">เก่า</span>
                    <span className="text-center">ใหม่</span>
                    <span className="text-center">รวม</span>
                    <span className="text-center">เหลือ</span>
                    <span className="text-center">ขาย</span>
                    <span className="text-center">ราคา</span>
                    <span className="text-right">เป็นเงิน</span>
                  </div>

                  {/* Data rows */}
                  {productTypes.map((type) => {
                    const typeProducts = products.filter((p) => p.type === type);
                    const typeItems = bill.items.filter((item) =>
                      typeProducts.some((p) => p.id === item.productId)
                    );

                    const typeStock = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
                    const typeOldStock = typeItems.reduce((sum, i) => sum + i.oldStock, 0);
                    const typeNewStock = typeItems.reduce((sum, i) => sum + i.newStock, 0);

                    if (typeStock === 0) return null;

                    const returnedInput = bill.returnInputs?.[type] ?? 0;
                    const actualSold = typeStock - returnedInput;

                    const baseProduct = typeProducts[0];
                    const price = baseProduct
                      ? getMemberPriceByClass(baseProduct, memberClass)
                      : 0;

                    const typeLabel =
                      PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

                    return (
                      <div
                        key={type}
                        className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1.5fr] items-center gap-1 py-1.5 text-[11px] sm:text-xs border-b border-border/40 last:border-0"
                      >
                        <span className="font-medium text-left truncate pr-1">{typeLabel}</span>
                        <span className="text-muted-foreground text-center">{typeOldStock}</span>
                        <span className="text-muted-foreground text-center">{typeNewStock}</span>
                        <span className="text-foreground font-medium text-center">{typeStock}</span>
                        <span className="text-orange-600 font-medium text-center">{returnedInput}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-center">
                          {Math.max(0, actualSold)}
                        </span>
                        <span className="text-muted-foreground text-center">{price}</span>
                        <span className="font-bold text-primary text-right flex items-center justify-end gap-1">
                          <span className="text-muted-foreground font-normal text-xs">=</span>
                          <span className="text-xs sm:text-sm">
                            {Math.max(0, actualSold * price).toLocaleString()}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
              <span className="font-semibold">ยอดเงินรวม</span>
              <span className="text-3xl font-bold text-primary">{totalText}</span>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
