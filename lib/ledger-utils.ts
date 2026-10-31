import { Bill, Member, MemberClass, Product, ProductType } from './types';

export type LedgerMode = 'checkout' | 'return';

export const EXCLUDED_SUMMARY_TYPES: ProductType[] = ['D', 'Car', 'House'];

const PRODUCT_TYPE_ORDER: Record<string, number> = {
  'XL': 1,
  'S': 2,
  'Coffee': 3,
  'Sandwich': 4,
  'Cup': 5,
  'Cone': 6,
  'D': 7,
  'Car': 8,
  'House': 9,
};

export function sortProductTypes(types: string[]): string[] {
  return [...types].filter((type) => type !== 'D').sort((a, b) => {
    const orderA = PRODUCT_TYPE_ORDER[a] ?? 99;
    const orderB = PRODUCT_TYPE_ORDER[b] ?? 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.localeCompare(b);
  });
}

export function dateToString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return dateToString(new Date());
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** ประเภทสินค้าที่ใช้ใน checkout summary / return inputs */
export function getCheckoutProductTypes(products: Product[]): ProductType[] {
  return Array.from(
    new Set(
      products
        .filter((p) => !EXCLUDED_SUMMARY_TYPES.includes(p.type))
        .map((p) => p.type)
    )
  );
}

/** ประเภทสินค้าที่ใช้ใน return sales summary / print preview */
// export function getReturnProductTypes(products: Product[]): ProductType[] {
//   return Array.from(new Set(products.map((p) => p.type))).filter(
//     (type) => !EXCLUDED_SUMMARY_TYPES.includes(type)
//   );
// }

export function getReturnProductTypes(products: Product[]): string[] {
  const types = Array.from(new Set(products.map((p) => p.type)));
  return sortProductTypes(types);
}

export function getPreviousBill(
  bills: Bill[],
  memberId: string,
  selectedDate: string,
  currentBillId?: string // ✅ เพิ่ม currentBillId
): Bill | undefined {
  return bills
    .filter(
      (b) =>
        b.memberId === memberId &&
        b.status === 'completed' &&
        (!currentBillId || b.id !== currentBillId) && // ไม่เอาตัวเอง
        b.date <= selectedDate // ✅ เปลี่ยนจาก < เป็น <= (รวมบิลที่ปิดแล้วของวันนี้ด้วย)
    )
    .sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
}

export function getPreviousOwed(
  bills: Bill[],
  memberId: string,
  selectedDate: string,
  currentBillId?: string
): number {
  const previousBill = getPreviousBill(bills, memberId, selectedDate, currentBillId);
  return previousBill ? previousBill.amountOwed : 0;
}

export function getBillStockTotals(bill: Bill | undefined) {
  return {
    totalOld: bill?.items.reduce((sum, i) => sum + i.oldStock, 0) || 0,
    totalNew: bill?.items.reduce((sum, i) => sum + i.newStock, 0) || 0,
    totalStock: bill?.items.reduce((sum, i) => sum + i.totalStock, 0) || 0,
  };
}

export function getMemberPriceByClass(
  product: Product,
  memberClass: MemberClass
): number {
  if (memberClass === 'Out') return product.priceOut || 0;
  if (memberClass === 'WalkIn') return product.priceWalkIn || 0;
  return product.priceIn || 0;
}

export function formatThaiShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatThaiFullDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export type BillTabEntry = {
  billId: string;
  memberId: string;
  memberName: string;
  status: Bill['status'];
  index: number;
};

export function getBillTabsForDate(
  activeMembers: Member[],
  bills: Bill[],
  selectedDate: string
): BillTabEntry[] {
  const memberById = new Map(activeMembers.map((m) => [m.id, m]));

  return bills
    .filter((b) => b.date === selectedDate && memberById.has(b.memberId))
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .reduce<BillTabEntry[]>((acc, bill) => {
      const member = memberById.get(bill.memberId)!;
      const index = acc.filter((e) => e.memberId === bill.memberId).length;
      acc.push({
        billId: bill.id,
        memberId: bill.memberId,
        memberName: member.name,
        status: bill.status,
        index,
      });
      return acc;
    }, []);
}
