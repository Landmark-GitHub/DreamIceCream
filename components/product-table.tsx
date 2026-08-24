'use client';

import { useState, useRef, type PointerEvent, type MouseEvent } from 'react';
import { Bill, Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { List, LayoutGrid } from 'lucide-react';
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

// ลำดับประเภทสินค้าหลักที่ต้องการให้เรียง (Type 1 > Type 2 > ... > Type N)
const DISPLAY_ORDER = ['XL', 'S', 'Coffee', 'Sandwich', 'Cup', 'Cone', 'D'];

interface ProductTableProps {
  bill: Bill;
  products: Product[];
  mode: 'checkout' | 'return';
  readOnly?: boolean;
  onItemChange: (productId: string, field: 'newStock' | 'returned', value: number) => void;
}

export function ProductTable({ bill, products, mode, readOnly, onItemChange }: ProductTableProps) {
  const [viewMode, setViewMode] = useState<'accordion' | 'grid'>('grid');

  // Ref สำหรับตรวจจับว่าเป็นการ "จิ้ม" (tap) หรือ "ลาก" (scroll)
  // เก็บตำแหน่งเริ่มต้นของนิ้ว/เมาส์ตอนกดลงไป และ flag ว่ามีการลากเกิน threshold หรือไม่
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const DRAG_THRESHOLD = 10; // px - ถ้าขยับเกินนี้ถือว่าเป็นการลาก ไม่ใช่การจิ้ม

  const handleCardPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // จำตำแหน่งเริ่มต้นไว้ และรีเซ็ต flag การลาก
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  };

  const handleCardPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    // ถ้าขยับเกิน threshold แสดงว่ากำลังเลื่อน (scroll) → ตั้ง flag ไว้ไม่ให้ focus ตอน click
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
    }
  };

  // ใช้ onClick แทน onPointerUp เพราะเป็น trusted user-gesture event ที่แท้จริง
  // ทำให้การเปิดคีย์บอร์ดบนมือถือเสถียร ไม่เด้งขึ้นแล้วหุบลงทันที
  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const wasDragging = isDraggingRef.current;
    pointerStartRef.current = null;
    isDraggingRef.current = false;

    // ถ้าเพิ่งลากอยู่ (scroll) ไม่ต้อง focus input
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

  // 2. จัดกลุ่มข้อมูลแยกตาม Type เพื่อนำไปใช้จัดการลำดับกลุ่ม
  const groupedProducts: Record<string, Product[]> = {};
  filteredProducts.forEach((product) => {
    const typeGroup = product.type; 
    if (!groupedProducts[typeGroup]) {
      groupedProducts[typeGroup] = [];
    }
    groupedProducts[typeGroup].push(product);
  });

  // 3. เรียงลำดับรายการสินค้าใน Grid Mode ตามกลุ่ม Type (Type 1 -> Type N) และเรียง sortOrder ภายในกลุ่ม
  const sortedProductsInOrder = DISPLAY_ORDER.reduce((acc, type) => {
    const typeProducts = groupedProducts[type] || [];
    // เรียงลำดับภายในกลุ่มตาม sortOrder เดิมที่มีอยู่
    const sorted = [...typeProducts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return [...acc, ...sorted];
  }, [] as Product[]);

  // รวมถึงดักสินค้าที่อาจจะมี Type นอกเหนือจากในแผง DISPLAY_ORDER ให้ไปต่อท้ายสุด
  const fallbackProducts = filteredProducts.filter(p => !DISPLAY_ORDER.includes(p.type));
  const finalSortedProducts = [...sortedProductsInOrder, ...fallbackProducts];

  // คำนวณยอดรวมบนกลุ่ม Tab ด้านบนแบบ Real-time
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

    acc[type] = { oldTotal: oldSum, inputTotal: inputSum };
    return acc;
  }, {} as Record<string, { oldTotal: number; inputTotal: number }>);

  // 4. ฟังก์ชันจัดการอินพุตตัวเลข
  const handleInputChange = (productId: string, valueStr: string, maxStock: number = Infinity) => {
    if (readOnly) return;
    const finalVal = parseInt(valueStr) || 0;
    if (finalVal < 0) return;
    if (mode === 'return' && finalVal > maxStock) return;

    onItemChange(productId, mode === 'checkout' ? 'newStock' : 'returned', finalVal);
  };

  // 5. กำหนด Palette สีคงที่สำหรับโมเดลหลัก
  const PRODUCT_TYPE_COLORS: Record<string, { bg: string; text: string; flag: string; borderCheckout: string; ringCheckout: string; bgCheckout: string }> = {
    XL: { 
      bg: 'bg-blue-100 dark:bg-blue-950/50', 
      text: 'text-blue-700 dark:text-blue-300',
      flag: 'bg-blue-500',
      borderCheckout: 'border-blue-500', 
      ringCheckout: 'ring-blue-500/20', 
      bgCheckout: 'bg-blue-500/[0.02]' 
    },
    S: { 
      bg: 'bg-lime-100 dark:bg-lime-950/50', 
      text: 'text-lime-700 dark:text-lime-300',
      flag: 'bg-lime-600',
      borderCheckout: 'border-lime-500', 
      ringCheckout: 'ring-lime-500/20', 
      bgCheckout: 'bg-lime-500/[0.02]' 
    },
    Sandwich: { 
      bg: 'bg-purple-100 dark:bg-purple-950/50', 
      text: 'text-purple-700 dark:text-purple-300',
      flag: 'bg-purple-500',
      borderCheckout: 'border-purple-500', 
      ringCheckout: 'ring-purple-500/20', 
      bgCheckout: 'bg-purple-500/[0.02]' 
    },
    Cup: { 
      bg: 'bg-pink-100 dark:bg-pink-950/50', 
      text: 'text-pink-700 dark:text-pink-300',
      flag: 'bg-pink-500',
      borderCheckout: 'border-pink-500', 
      ringCheckout: 'ring-pink-500/20', 
      bgCheckout: 'bg-pink-500/[0.02]' 
    },
    Coffee: { 
      bg: 'bg-amber-200 dark:bg-amber-950/50', 
      text: 'text-amber-800 dark:text-amber-300',
      flag: 'bg-amber-700',
      borderCheckout: 'border-amber-500', 
      ringCheckout: 'ring-amber-500/20', 
      bgCheckout: 'bg-amber-500/[0.02]' 
    },
    Cone: { 
      bg: 'bg-red-200 dark:bg-red-950/50', 
      text: 'text-red-700 dark:text-red-300',
      flag: 'bg-red-500',
      borderCheckout: 'border-red-500', 
      ringCheckout: 'ring-red-500/20', 
      bgCheckout: 'bg-red-500/[0.02]' 
    },
    D: { 
      bg: 'bg-slate-100 dark:bg-slate-800', 
      text: 'text-slate-700 dark:text-slate-300',
      flag: 'bg-slate-500',
      borderCheckout: 'border-slate-500', 
      ringCheckout: 'ring-slate-500/20', 
      bgCheckout: 'bg-slate-500/[0.02]' 
    },
  };

  const FALLBACK_COLORS = [
    { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', flag: 'bg-emerald-500', borderCheckout: 'border-emerald-500', ringCheckout: 'ring-emerald-500/20', bgCheckout: 'bg-emerald-500/[0.02]' },
    { bg: 'bg-indigo-100 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300', flag: 'bg-indigo-500', borderCheckout: 'border-indigo-500', ringCheckout: 'ring-indigo-500/20', bgCheckout: 'bg-indigo-500/[0.02]' },
    { bg: 'bg-rose-100 dark:bg-rose-950/50', text: 'text-rose-700 dark:text-rose-300', flag: 'bg-rose-500', borderCheckout: 'border-rose-500', ringCheckout: 'ring-rose-500/20', bgCheckout: 'bg-rose-500/[0.02]' },
    { bg: 'bg-teal-100 dark:bg-teal-950/50', text: 'text-teal-700 dark:text-teal-300', flag: 'bg-teal-500', borderCheckout: 'border-teal-500', ringCheckout: 'ring-teal-500/20', bgCheckout: 'bg-teal-500/[0.02]' },
    { bg: 'bg-violet-100 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-300', flag: 'bg-violet-500', borderCheckout: 'border-violet-500', ringCheckout: 'ring-violet-500/20', bgCheckout: 'bg-violet-500/[0.02]' },
  ];

  function getTypeColor(type: string) {
    if (PRODUCT_TYPE_COLORS[type]) return PRODUCT_TYPE_COLORS[type];
    if (!type) return { bg: 'bg-muted', text: 'text-muted-foreground', flag: 'bg-muted-foreground/70', borderCheckout: 'border-muted', ringCheckout: 'ring-muted/20', bgCheckout: 'bg-muted/5' };
    
    const index = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % FALLBACK_COLORS.length;
    return FALLBACK_COLORS[index];
  }

  return (
    <div className="w-full space-y-2 p-2 px-1">
      {/* ส่วนหัว: ปุ่มควบคุมการสลับโหมดมุมมอง (นำปุ่มตั้งค่าออกแล้ว) */}
      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === 'accordion' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('accordion')}
          className="gap-1.5 h-9 rounded-lg text-xs"
        >
          <List className="w-4 h-4" /> แบบกลุ่ม
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className="gap-1.5 h-9 rounded-lg text-xs"
        >
          <LayoutGrid className="w-4 h-4" /> แบบตารางภาพ
        </Button>
      </div>

      {/* ================= โหมดที่ 1: ACCORDION MODE ================= */}
      {viewMode === 'accordion' && (
        <Accordion type="multiple" className="w-full space-y-3">
          {DISPLAY_ORDER.map((type) => {
            const typeProducts = groupedProducts[type] || [];
            if (typeProducts.length === 0) return null;

            const categoryItems = typeProducts.map((product) => {
              const item = bill.items.find((i) => i.productId === product.id) || {
                productId: product.id, oldStock: 0, newStock: 0, totalStock: 0, returned: 0, sold: 0
              };
              return { product, item };
            });

            return (
              <AccordionItem key={type} value={type} className="border rounded-xl bg-card px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-2">
                    {/* ส่วนชื่อประเภท */}
                    <span className="font-bold text-base text-foreground">
                      {PRODUCT_TYPE_LABELS[type] || `ประเภท ${type}`}
                    </span>

                    {/* ส่วนของ Badges แสดงจำนวน */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* ยอดเก่า */}
                      <span className="bg-muted text-muted-foreground text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        เก่า {typeTotals[type]?.oldTotal || 0}
                      </span>

                      {/* ยอดที่มีการเปลี่ยนแปลง (แสดงเฉพาะเมื่อมีการกรอกข้อมูลเข้ามา > 0) */}
                      {typeTotals[type]?.inputTotal > 0 && (
                        <span className={cn(
                          "text-xs px-2.5 py-0.5 rounded-full font-semibold text-white",
                          mode === 'checkout' ? "bg-green-600" : "bg-amber-600"
                        )}>
                          {mode === 'checkout' 
                            ? `ใหม่ +${typeTotals[type].inputTotal}` 
                            : `คืน -${typeTotals[type].inputTotal}` /* ปรับเครื่องหมายตามบริบทโหมด */}
                        </span>
                      )}

                      {/* ยอดรวมทั้งหมด (แยกออกมาอยู่นอกเงื่อนไขเพื่อให้แสดงตลอดเวลา) */}
                      <span className="bg-primary text-primary-foreground text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        รวม {(typeTotals[type]?.oldTotal || 0) + (mode === 'checkout' ? (typeTotals[type]?.inputTotal || 0) : -(typeTotals[type]?.inputTotal || 0))}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-1 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryItems
                      .sort((a, b) => a.product.sortOrder - b.product.sortOrder)
                      .map(({ product, item }) => {
                        const currentQty = mode === 'checkout' ? (item?.newStock || 0) : (item?.returned || 0);
                        const isRowSelected = currentQty > 0;

                        return (
                          <div
                            key={product.id}
                            className={cn(
                              "flex items-center gap-3 p-2 pr-3 rounded-lg border bg-muted/30 transition-colors",
                              mode === 'checkout' && isRowSelected && 'bg-green-500/10 border-green-500 border-2',
                              mode === 'return' && isRowSelected && 'bg-amber-500/10 border-amber-500 border-2'
                            )}
                          >
                            {/* รูปภาพสินค้าขนาดย่อ */}
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-background">
                              {product.imageUrl ? (
                                <Image
                                  src={product.imageUrl}
                                  alt={product.name}
                                  fill
                                  sizes="44px"
                                  referrerPolicy="no-referrer"
                                  unoptimized
                                  className="object-cover pointer-events-none"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-xl select-none">🍦</span>
                              )}
                            </div>

                            <span className="flex-1 text-sm font-medium text-foreground truncate">{product.name}</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="off"
                              min="0"
                              max={mode === 'return' ? item?.totalStock : undefined}
                              value={currentQty || ''}
                              onChange={(e) => handleInputChange(product.id, e.target.value, item?.totalStock)}
                              disabled={readOnly}
                              className="w-20 h-9 text-center text-sm font-semibold bg-background shrink-0"
                              placeholder="0"
                            />
                          </div>
                        );
                      })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* ================= โหมดที่ 2: GRID MODE ================= */}
      {viewMode === 'grid' && (
        <div>
          {/* ตารางสินค้า Grid - เรียงตามลำดับกลุ่มประเภทเรียบร้อยแล้ว */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4 px-2 sm:gap-4">
            {finalSortedProducts.map((product) => {
              const item = bill.items.find((i) => i.productId === product.id) || {
                productId: product.id, oldStock: 0, newStock: 0, totalStock: 0, returned: 0, sold: 0
              };
              const currentQty = mode === 'checkout' ? (item.newStock || 0) : (item.returned || 0);
              const isSelected = currentQty > 0;
              
              const typeColor = getTypeColor(product.type);

              return (
                <div
                  key={product.id}
                  className={cn(
                    "relative bg-card border rounded-2xl overflow-hidden flex flex-col select-none group transition-all shadow-sm min-w-0",

                    // สถานะปกติ (ยังไม่เลือก) ใช้เส้นขอบเรียบเบา ๆ
                    !isSelected && "border-border/70",

                    // เลือกแล้วในโหมด checkout -> ไฮไลต์ด้วยสีของประเภทสินค้า แบบทินท์อ่อน อ่านง่ายทั้ง light/dark
                    isSelected && mode === 'checkout' && [
                      typeColor.borderCheckout,
                      "ring-2",
                      typeColor.ringCheckout,
                      typeColor.bg,
                    ],
                    // เลือกแล้วในโหมด return -> ไฮไลต์โทนอำพัน (คงคอนเซปต์เดิม) แบบทินท์อ่อนแทนสีทึบเต็มใบ
                    isSelected && mode === 'return' && "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 dark:bg-amber-950/40"
                  )}
                  onPointerDown={handleCardPointerDown}
                  onPointerMove={handleCardPointerMove}
                  onClick={handleCardClick}
                >
                  {/* ป้ายธงประเภทสินค้า มุมซ้ายบน ลอยทับรูป */}
                  <span className={cn(
                    "absolute -left-px top-2 z-10 rounded-r-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors",
                    typeColor.flag
                  )}>
                    {product.type}
                  </span>

                  {/* เครื่องหมายถูก มุมขวาบน ลอยทับรูป แสดงเมื่อเลือกแล้ว */}
                  {isSelected && (
                    <span className={cn(
                      "absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white shadow",
                      mode === 'checkout' ? typeColor.flag : 'bg-amber-500'
                    )}>
                      ✓
                    </span>
                  )}

                  {/* รูปภาพสินค้า - เต็มความกว้าง กินพื้นที่ครึ่งบนของการ์ด */}
                  <div className={cn(
                    "relative w-full aspect-[4/3] shrink-0 overflow-hidden transition-colors",
                    isSelected ? "bg-background" : "bg-muted/50"
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
                      <span className="absolute inset-0 flex items-center justify-center text-4xl select-none">🍦</span>
                    )}
                  </div>

                  {/* ชื่อสินค้า + ช่องกรอกจำนวน */}
                  <div className="flex flex-col items-center gap-2 p-2 pt-1.5">
                    <div className="min-h-[1.15rem] w-full px-0.5 text-center text-[13.5px] font-bold line-clamp-1 text-foreground">
                      {product.name}
                    </div>

                    {/* ช่องกรอกจำนวนสินค้า - คั่นด้วยเส้นประเหมือนตั๋ว อ่านง่าย คมชัด */}
                    <div className="w-full border-t border-dashed border-border/70 pt-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        autoComplete="off"
                        min="0"
                        max={mode === 'return' ? item.totalStock : undefined}
                        value={currentQty || ''}
                        onChange={(e) => handleInputChange(product.id, e.target.value, item.totalStock)}
                        disabled={readOnly}
                        placeholder="0"
                        className={cn(
                          "w-full h-9 text-center font-black text-lg rounded-lg bg-muted/40 border border-transparent focus-visible:ring-1 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1 transition-colors text-foreground",
                          isSelected && "bg-background"
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