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
  const [viewMode, setViewMode] = useState<'accordion' | 'grid'>('accordion');

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
  const PRODUCT_TYPE_COLORS: Record<string, { bg: string; text: string; borderCheckout: string; ringCheckout: string; bgCheckout: string }> = {
    XL: { 
      bg: 'bg-blue-100 dark:bg-blue-950/50', 
      text: 'text-blue-700 dark:text-blue-300',
      borderCheckout: 'border-blue-500', 
      ringCheckout: 'ring-blue-500/20', 
      bgCheckout: 'bg-blue-500/[0.02]' 
    },
    S: { 
      bg: 'bg-lime-100 dark:bg-lime-950/50', 
      text: 'text-lime-700 dark:text-lime-300',
      borderCheckout: 'border-lime-500', 
      ringCheckout: 'ring-lime-500/20', 
      bgCheckout: 'bg-lime-500/[0.02]' 
    },
    Sandwich: { 
      bg: 'bg-purple-100 dark:bg-purple-950/50', 
      text: 'text-purple-700 dark:text-purple-300',
      borderCheckout: 'border-purple-500', 
      ringCheckout: 'ring-purple-500/20', 
      bgCheckout: 'bg-purple-500/[0.02]' 
    },
    Cup: { 
      bg: 'bg-pink-100 dark:bg-pink-950/50', 
      text: 'text-pink-700 dark:text-pink-300',
      borderCheckout: 'border-pink-500', 
      ringCheckout: 'ring-pink-500/20', 
      bgCheckout: 'bg-pink-500/[0.02]' 
    },
    Coffee: { 
      bg: 'bg-amber-200 dark:bg-amber-950/50', 
      text: 'text-amber-800 dark:text-amber-300',
      borderCheckout: 'border-amber-500', 
      ringCheckout: 'ring-amber-500/20', 
      bgCheckout: 'bg-amber-500/[0.02]' 
    },
    Cone: { 
      bg: 'bg-red-200 dark:bg-red-950/50', 
      text: 'text-red-700 dark:text-red-300',
      borderCheckout: 'border-red-500', 
      ringCheckout: 'ring-red-500/20', 
      bgCheckout: 'bg-red-500/[0.02]' 
    },
    D: { 
      bg: 'bg-slate-100 dark:bg-slate-800', 
      text: 'text-slate-700 dark:text-slate-300',
      borderCheckout: 'border-slate-500', 
      ringCheckout: 'ring-slate-500/20', 
      bgCheckout: 'bg-slate-500/[0.02]' 
    },
  };

  const FALLBACK_COLORS = [
    { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', borderCheckout: 'border-emerald-500', ringCheckout: 'ring-emerald-500/20', bgCheckout: 'bg-emerald-500/[0.02]' },
    { bg: 'bg-indigo-100 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300', borderCheckout: 'border-indigo-500', ringCheckout: 'ring-indigo-500/20', bgCheckout: 'bg-indigo-500/[0.02]' },
    { bg: 'bg-rose-100 dark:bg-rose-950/50', text: 'text-rose-700 dark:text-rose-300', borderCheckout: 'border-rose-500', ringCheckout: 'ring-rose-500/20', bgCheckout: 'bg-rose-500/[0.02]' },
    { bg: 'bg-teal-100 dark:bg-teal-950/50', text: 'text-teal-700 dark:text-teal-300', borderCheckout: 'border-teal-500', ringCheckout: 'ring-teal-500/20', bgCheckout: 'bg-teal-500/[0.02]' },
    { bg: 'bg-violet-100 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-300', borderCheckout: 'border-violet-500', ringCheckout: 'ring-violet-500/20', bgCheckout: 'bg-violet-500/[0.02]' },
  ];

  function getTypeColor(type: string) {
    if (PRODUCT_TYPE_COLORS[type]) return PRODUCT_TYPE_COLORS[type];
    if (!type) return { bg: 'bg-muted', text: 'text-muted-foreground', borderCheckout: 'border-muted', ringCheckout: 'ring-muted/20', bgCheckout: 'bg-muted/5' };
    
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

                        return (
                          <div
                            key={product.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-colors",
                              mode === 'checkout' && (item?.newStock || 0) > 0 && 'bg-green-500/10 border-green-500 border-2',
                              mode === 'return' && (item?.returned || 0) > 0 && 'bg-amber-500/10 border-amber-500 border-2'
                            )}
                          >
                            <span className="text-sm font-medium text-foreground">{product.name}</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="off"
                              min="0"
                              max={mode === 'return' ? item?.totalStock : undefined}
                              value={currentQty || ''}
                              onChange={(e) => handleInputChange(product.id, e.target.value, item?.totalStock)}
                              disabled={readOnly}
                              className="w-20 h-9 text-center text-sm font-semibold bg-background"
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
              
              return (
                <div
                  key={product.id}
                  className={cn(
                    "relative bg-card border rounded-xl flex flex-col items-center p-1 select-none group transition-all shadow-sm gap-2.5 min-w-0",
                    
                    // ปรับสีพื้นหลังให้ทึบ/ชัดเจนตามสีประจำประเภทสินค้า (เหมือนกับป้ายมุมขวาบน)
                    isSelected && mode === 'checkout' && [
                      getTypeColor(product.type).borderCheckout,
                      "ring-2", 
                      getTypeColor(product.type).ringCheckout,
                      getTypeColor(product.type).bg, // เปลี่ยนสีพื้นหลังตัวการ์ดหลักให้เต็มร้อย
                    ],
                    isSelected && mode === 'return' && "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500 text-amber-950 dark:text-amber-50"
                  )}
                  onPointerDown={handleCardPointerDown}
                  onPointerMove={handleCardPointerMove}
                  onClick={handleCardClick}
                >
                  {/* ป้ายชนิดสินค้ามุมขวาบน */}
                  <span className={cn(
                    "absolute top-2 right-2 text-[10px] font-black px-2 rounded transition-colors",
                    getTypeColor(product.type).bg,
                    getTypeColor(product.type).text
                  )}>
                    {product.type}
                  </span> 
                  {/* รูปภาพสินค้า */}
                  <div className="w-full flex justify-center min-h-23.5 items-center">
                    {product.imageUrl ? (
                      <Image 
                        src={product.imageUrl}
                        alt={product.name} 
                        width={58} 
                        height={58} 
                        referrerPolicy="no-referrer"
                        unoptimized
                        className="w-22 h-22 object-cover rounded-lg pointer-events-none bg-background"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xl select-none">🍦5</span>
                    )}
                  </div>

                  {/* ชื่อสินค้า */}
                  <div className={cn(
                    "text-[14px] font-bold text-center line-clamp-1 px-0.5 w-full min-h-4 flex items-center justify-center transition-colors",
                    isSelected ? "text-current" : "text-foreground"
                  )}>
                    {product.name}
                  </div>

                  {/* ช่องกรอกจำนวนสินค้า - แก้ไขตัวเลขให้อ่านง่าย คมชัด ไม่เป็นสีเทา */}
                  <div className="w-full mt-0.5">
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      min="0"
                      max={mode === 'return' ? item.totalStock : undefined}
                      value={currentQty || ''}
                      onChange={(e) => handleInputChange(product.id, e.target.value, item.totalStock)}
                      disabled={readOnly}
                      placeholder="0"
                      className={cn(
                        // สเตตัสปกติ (ยังไม่ได้กรอก) ให้เป็นข้อความสีดำ/เข้มปกติ ไม่ใช้สีเทาจาง
                        "w-full h-10 text-center font-black text-xl rounded-lg bg-muted/40 border border-border focus-visible:ring-1 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1 transition-colors text-foreground",
                        
                        // เมื่อมีค่า (isSelected) ในโหมด checkout -> บังคับให้เป็นสีดำเข้ม (text-black) บนพื้นหลังกล่องขาว เพื่อให้ตัดกับการ์ดสีทึบด้านนอกอย่างชัดเจน
                        isSelected && mode === 'checkout' && [
                          "bg-background font-black border-transparent text-black dark:text-black z-10"
                        ],
                        
                        // เมื่อมีค่า (isSelected) ในโหมด return -> บังคับให้เป็นสีน้ำตาลเข้มจัด (text-amber-950) อ่านง่ายแน่นอน
                        isSelected && mode === 'return' && [
                          "bg-background font-black border-transparent text-amber-950 dark:text-amber-950"
                        ]
                      )}
                    />
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