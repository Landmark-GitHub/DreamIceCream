'use client';

import { useState, useRef, type PointerEvent, type MouseEvent } from 'react';
import { Bill, Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  XL: 'แท่งใหญ่',
  S: 'แท่งเล็ก',
  Sandwich: 'แซนวิช',
  Cup: 'ถ้วย',
  Coffee: 'กาแฟ',
  Cone: 'โคน',
  D: 'น้ำแข็งแห้ง'
};

const DISPLAY_ORDER = ['XL', 'S', 'Coffee', 'Sandwich', 'Cup', 'Cone', 'D'];

interface ProductTableProps {
  bill: Bill;
  products: Product[];
  mode: 'checkout' | 'return';
  readOnly?: boolean;
  onItemChange: (productId: string, field: 'newStock' | 'returned', value: number) => void;
}

export function ProductTable({ bill, products, mode, readOnly, onItemChange }: ProductTableProps) {
  // ค่าเริ่มต้นเปิดหมวดแรกไว้ (Default open) เหมือนเดิมตามที่คุณต้องการ
  const [activeTab, setActiveTab] = useState<string | null>(DISPLAY_ORDER[0]);

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const DRAG_THRESHOLD = 10;

  const handleCardPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  };

  const handleCardPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
    }
  };

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const wasDragging = isDraggingRef.current;
    pointerStartRef.current = null;
    isDraggingRef.current = false;
    if (wasDragging) return;

    const inp = e.currentTarget.querySelector('input');
    if (e.target !== inp && inp) {
      inp.focus();
    }
  };

  // 1. กรองสินค้าตัดเฉพาะกลุ่ม House และ Car ออก
  const filteredProducts = products.filter(
    (product) => product.type !== 'House' && product.type !== 'Car'
  );

  // 2. จัดกลุ่มข้อมูลแยกตาม Type
  const groupedProducts: Record<string, Product[]> = {};
  filteredProducts.forEach((product) => {
    const typeGroup = product.type; 
    if (!groupedProducts[typeGroup]) {
      groupedProducts[typeGroup] = [];
    }
    groupedProducts[typeGroup].push(product);
  });

  // 3. คำนวณยอดรวมของแต่ละชนิด (เก่า + ใหม่ = รวม) แบบ Real-time
  const typeTotals = DISPLAY_ORDER.reduce((acc, type) => {
    const typeProducts = groupedProducts[type] || [];
    let oldSum = 0;
    let inputSum = 0;

    typeProducts.forEach((product) => {
      const item = bill.items.find((i) => i.productId === product.id);
      if (item) {
        oldSum += item.oldStock || 0;
        inputSum += mode === 'checkout' ? (item.newStock || 0) : (item.returned || 0);
      }
    });

    const totalSum = mode === 'checkout' ? (oldSum + inputSum) : (oldSum - inputSum);
    acc[type] = { oldTotal: oldSum, inputTotal: inputSum, totalSum };
    return acc;
  }, {} as Record<string, { oldTotal: number; inputTotal: number; totalSum: number }>);

  const handleInputChange = (productId: string, valueStr: string, maxStock: number = Infinity) => {
    if (readOnly) return;
    const finalVal = parseInt(valueStr) || 0;
    if (finalVal < 0) return;
    if (mode === 'return' && finalVal > maxStock) return;

    onItemChange(productId, mode === 'checkout' ? 'newStock' : 'returned', finalVal);
  };

  const PRODUCT_TYPE_COLORS: Record<string, { bg: string; text: string; flag: string; borderCheckout: string; ringCheckout: string }> = {
    XL: { bg: 'bg-blue-100 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', flag: 'bg-blue-500', borderCheckout: 'border-blue-500', ringCheckout: 'ring-blue-500/20' },
    S: { bg: 'bg-lime-100 dark:bg-lime-950/50', text: 'text-lime-700 dark:text-lime-300', flag: 'bg-lime-600', borderCheckout: 'border-lime-500', ringCheckout: 'ring-lime-500/20' },
    Sandwich: { bg: 'bg-purple-100 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', flag: 'bg-purple-500', borderCheckout: 'border-purple-500', ringCheckout: 'ring-purple-500/20' },
    Cup: { bg: 'bg-pink-100 dark:bg-pink-950/50', text: 'text-pink-700 dark:text-pink-300', flag: 'bg-pink-500', borderCheckout: 'border-pink-500', ringCheckout: 'ring-pink-500/20' },
    Coffee: { bg: 'bg-amber-200 dark:bg-amber-950/50', text: 'text-amber-800 dark:text-amber-300', flag: 'bg-amber-700', borderCheckout: 'border-amber-500', ringCheckout: 'ring-amber-500/20' },
    Cone: { bg: 'bg-red-200 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', flag: 'bg-red-500', borderCheckout: 'border-red-500', ringCheckout: 'ring-red-500/20' },
    D: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', flag: 'bg-slate-500', borderCheckout: 'border-slate-500', ringCheckout: 'ring-slate-500/20' },
  };

  const FALLBACK_COLORS = [
    { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', flag: 'bg-emerald-500', borderCheckout: 'border-emerald-500', ringCheckout: 'ring-emerald-500/20' },
  ];

  function getTypeColor(type: string) {
    if (PRODUCT_TYPE_COLORS[type]) return PRODUCT_TYPE_COLORS[type];
    return FALLBACK_COLORS[0];
  }

  const fallbackProducts = filteredProducts.filter(p => !DISPLAY_ORDER.includes(p.type));
  const allTypes = [...DISPLAY_ORDER];
  if (fallbackProducts.length > 0) {
    allTypes.push('Other');
    groupedProducts['Other'] = fallbackProducts;
  }

  return (
    <div className="w-full space-y-3 pb-6">
      {/* ================= HEAD TABS (แผงปุ่มกดเลือกหมวดหมู่ด้านบน ปลอดภัยไม่ทับ Header หลัก) ================= */}
      <div className="bg-card border border-border rounded-2xl p-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {allTypes.map((type) => {
            const typeProducts = groupedProducts[type] || [];
            if (typeProducts.length === 0) return null;
            const isSelected = activeTab === type;
            const inputTotal = typeTotals[type]?.inputTotal || 0;

            return (
              <button
                key={type}
                onClick={() => {
                  // ถ้าแตะซ้ำที่ Tab เดิม จะทำการปิด (พับเก็บ), ถ้าแตะอันอื่นหรือเปิดใหม่จะกางออก
                  setActiveTab(isSelected ? null : type);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm shrink-0 border",
                  isSelected 
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" 
                    : "bg-muted/50 text-foreground border-border/60 hover:bg-muted"
                )}
              >
                <span>{PRODUCT_TYPE_LABELS[type] || type}</span>
                {inputTotal > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px]",
                    isSelected ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"
                  )}>
                    +{inputTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= ACTIVE TAB CONTENT (แสดงข้อมูลและตารางสินค้าเฉพาะ Tab ที่ถูกเปิดอยู่) ================= */}
      {activeTab && groupedProducts[activeTab] && (
        <div className="space-y-3 animate-in fade-in-50 duration-200">

          {/* Grid Cards สินค้า */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5 pt-1">
            {groupedProducts[activeTab]
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((product) => {
                const item = bill.items.find((i) => i.productId === product.id) || {
                  productId: product.id, oldStock: 0, newStock: 0, totalStock: 0, returned: 0, sold: 0
                };
                const currentQty = mode === 'checkout' ? (item?.newStock || 0) : (item?.returned || 0);
                const isSelectedCard = currentQty > 0;
                const typeColor = getTypeColor(activeTab);

                return (
                  <div
                    key={product.id}
                    className={cn(
                      "relative bg-card border rounded-2xl overflow-hidden flex flex-col select-none group transition-all shadow-sm min-w-0",
                      !isSelectedCard && "border-border/70",
                      isSelectedCard && mode === 'checkout' && [
                        typeColor.borderCheckout,
                        "ring-2",
                        typeColor.ringCheckout,
                        "bg-card",
                      ],
                      isSelectedCard && mode === 'return' && "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 dark:bg-amber-950/40"
                    )}
                    onPointerDown={handleCardPointerDown}
                    onPointerMove={handleCardPointerMove}
                    onClick={handleCardClick}
                  >
                    <span className={cn(
                      "absolute -left-px top-2 z-10 rounded-r-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors",
                      typeColor.flag
                    )}>
                      {product.type}
                    </span>

                    {isSelectedCard && (
                      <span className={cn(
                        "absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white shadow",
                        mode === 'checkout' ? typeColor.flag : 'bg-amber-500'
                      )}>
                        ✓
                      </span>
                    )}

                    <div className={cn(
                      "relative w-full aspect-[4/3] shrink-0 overflow-hidden transition-colors",
                      isSelectedCard ? "bg-background" : "bg-muted/50"
                    )}>
                      {product.imageUrl ? (
                        <Image 
                          src={product.imageUrl}
                          alt={product.name} 
                          fill
                          sizes="200px"
                          referrerPolicy="no-referrer"
                          unoptimized
                          className="object-cover pointer-events-none"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-3xl select-none">🍦</span>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1.5 p-2 pt-1.5">
                      <div className="min-h-[1.15rem] w-full px-0.5 text-center text-[12.5px] font-bold line-clamp-1 text-foreground">
                        {product.name}
                      </div>

                      <div className="w-full border-t border-dashed border-border/70 pt-1.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*"
                          autoComplete="off"
                          min="0"
                          max={mode === 'return' ? item?.totalStock : undefined}
                          value={currentQty || ''}
                          onChange={(e) => handleInputChange(product.id, e.target.value, item?.totalStock)}
                          disabled={readOnly}
                          placeholder="0"
                          className={cn(
                            "w-full h-8 text-center font-black text-base rounded-lg bg-muted/40 border border-transparent focus-visible:ring-1 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1 transition-colors text-foreground",
                            isSelectedCard && "bg-background"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
