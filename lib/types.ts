// ===== USER / AUTH TYPES =====
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
// Default admin phone number
export const ADMIN_PHONE = '0645159924';
export const USER_PHONE = '0999999999';

// ===== MEMBER TYPES =====
export type MemberStatusIn = {
  house: boolean; // บ้าน
  car: boolean;   // รถ
};

export type MemberStatusOut = 'active' | 'inactive';
export type MemberStatusWorkIn = 'working' | 'off' | 'leave';

// ประเภทสมาชิก (canonical): In = ส่งเข้า(บ้าน/รถ), Out = ส่งออก, WalkIn = ลูกค้าเดิน
export type MemberClass = 'In' | 'Out' | 'WalkIn';


export interface Member {
  id: string;
  name: string;
  class?: MemberClass;
  phone?: string;
  address?: string;
  statusIn: MemberStatusIn;
  statusOut: MemberStatusOut;
  statusWorkIn: MemberStatusWorkIn;
  createdAt: string;
  updatedAt: string;
}

// ===== PRODUCT TYPES =====
export type ProductType = 'XL' | 'S' | 'Coffee' | 'Sandwich' | 'Cup' | 'Cone' | 'D' | 'Car' | 'House';
export type ProductCategory = 'XL' | 'S' | 'Coffee' | 'Sandwich' | 'Cup' | 'Cone' | 'null';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  category: ProductCategory; // for grouping display
  priceIn: number;    // price 1: status in (บ้าน/รถ)
  priceOut: number;   // price 2: out
  priceWalkIn: number; // price 3: walkin
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ===== MONTHLY PROFIT & ORDER SUMMARY =====
export interface MonthlyProfitSummary {
  month: string;           // YYYY-MM
  totalSales: number;      // ยอดขายรวม (บิลทั้งหมดในเดือนนั้น)
  estimatedCost: number;   // ต้นทุนสินค้า (80% ของยอดขาย)
  grossProfit: number;     // ส่วนต่าง/กำไรขั้นต้น (20% ของยอดขาย)
  totalExpenses: number;   // ค่าใช้จ่ายรวมในเดือนนั้น (ค่าน้ำแข็ง, น้ำมัน ฯลฯ)
  netProfit: number;       // กำไรสุทธิ = ส่วนต่าง 20% - ค่าใช้จ่าย
}

// ===== BILL/TRANSACTION TYPES =====
export interface BillItem {
  productId: string;
  productName: string;
  oldStock: number;      // ยอดเก่า (เหลือเมื่อวาน)
  newStock: number;      // ยอดใหม่ที่เบิก
  totalStock: number;    // รวม = เก่า + ใหม่
  returned: number;      // ยอดคืน
  sold: number;          // ขายได้ = total - returned
  priceUsed: number;     // ราคาที่ใช้
}

export interface Bill {
  id: string;
  memberId: string;
  memberName: string;
  buyerName: string;    // ชื่อผู้ขาย (กรอกเอง)
  date: string;          // YYYY-MM-DD
  items: BillItem[];
  ice: string;
  icePrice: number;
  totalSales: number;
  addMoney: number; // เพิ่มเงิน (กรณีลูกค้าจ่ายเกิน)
  amountPaid: number;
  amountOwed: number;
  previousOwed: number; // ยอดค้างชำระจากบิลก่อนหน้า (ถ้ามี)
  notes: string;
  status: 'draft' | 'checkout' | 'completed'; // draft=กำลังเบิก, checkout=เบิกแล้ว, completed=บันทึกยอดแล้ว
  dayClosed: boolean;    // ปิดวันแล้วหรือยัง
  createdAt: string;
  updatedAt: string;
  returnInputs?: Record<string, number>;
}

// ===== DAILY SUMMARY =====
export interface DailySummary {
  date: string;
  totalBills: number;
  totalSales: number;
  totalOwed: number;
  memberSummaries: {
    memberId: string;
    memberName: string;
    totalSales: number;
    totalOwed: number;
  }[];
  closed: boolean;
  createdAt: string;
}

// ===== EXPENSE TYPES =====
export interface ExpenseCategory {
  id: string;
  name: string;      // ชื่อหมวดหมู่ เช่น ค่าน้ำแข็ง, ค่าน้ำมัน
  icon?: string;     // อีโมจิประจำหมวดหมู่เพื่อความสวยงาม
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  date: string;       // วันที่บันทึก (YYYY-MM-DD)
  categoryId: string; // อ้างอิง ID ของหมวดหมู่
  amount: number;     // จำนวนเงิน
  note?: string;      // หมายเหตุเพิ่มเติม
  createdAt: string;
}

// ===== HISTORY LOG (for deleted months) =====
export interface HistoryLog {
  id: string;
  month?: string;       // YYYY-MM (สำหรับ log ลบข้อมูลเก่า)
  totalBills?: number;
  totalSales?: number;
  totalOwed?: number;
  deletedAt?: string;
  // สำหรับ log รายจ่าย/หมวดหมู่
  timestamp?: string;
  action?: string;
  details?: string;
}

// ===== APP STATE =====
export interface AppState {
  members: Member[];
  products: Product[];
  bills: Bill[];
  dailySummaries: DailySummary[];
  historyLogs: HistoryLog[];
  settings: AppSettings;
  lastCleanup: string;  // last auto cleanup date
  expenseCategories: ExpenseCategory[];
  expenses: ExpenseItem[];
  users: User[];        // user accounts
  currentUser: User | null; // logged in user
}

export interface AppSettings {
  retentionMonths: number; // default 3
  reminderExport: boolean;
  lastExportDate: string;
}

// ===== DEFAULT DATA =====
export const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // XL Products (แท่งใหญ่)
  { name: 'แผ่น', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 140, sortOrder: 1 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ถั่วดำ', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 140, sortOrder: 2 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ถั่วแดง', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 140, sortOrder: 3 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ข้าวเหนียวดำ', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 140, sortOrder: 4 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ลอดช่อง', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 140, sortOrder: 5 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ข้าวโพด', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 140, sortOrder: 6 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'เผือก', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 7, imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ชาเย็น', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 8, imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'โอเลี้ยง', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 9 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ป๊อป', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 10 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-29-2991ff28-b43f-4fb2-b922-8f528d8140dd.jpg' },
  { name: 'คาลิโป้', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 11 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ทุเรียน', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 12 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'กะทิ', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 13 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ช็อคโกแลต', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 14 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'สตอเบอรี่', type: 'XL', category: 'XL', priceIn: 6, priceOut: 6, priceWalkIn: 6, sortOrder: 15 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  // S Products (แท่งเล็ก)
  { name: 'ส้ม', type: 'S', category: 'S', priceIn: 5, priceOut: 5, priceWalkIn: 5, sortOrder: 16 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'แดง', type: 'S', category: 'S', priceIn: 5, priceOut: 5, priceWalkIn: 5, sortOrder: 17, imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'โคล่า', type: 'S', category: 'S', priceIn: 5, priceOut: 5, priceWalkIn: 5, sortOrder: 18, imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'จรวด', type: 'S', category: 'S', priceIn: 5, priceOut: 5, priceWalkIn: 5, sortOrder: 19, imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'สามสี', type: 'S', category: 'S', priceIn: 5, priceOut: 5, priceWalkIn: 5, sortOrder: 20, imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'กาแฟ', type: 'Coffee', category: 'Coffee', priceIn: 7.5, priceOut: 8, priceWalkIn: 7.5, sortOrder: 22 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'แซนวิช', type: 'Sandwich', category: 'Sandwich', priceIn: 7.5, priceOut: 8, priceWalkIn: 7.5, sortOrder: 23 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'ถ้วย', type: 'Cup', category: 'Cup', priceIn: 6, priceOut: 7, priceWalkIn: 6, sortOrder: 24 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'โคน', type: 'Cone', category: 'Cone', priceIn: 10, priceOut: 10, priceWalkIn: 10, sortOrder: 25 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'น้ำแข็งแห้ง', type: 'D', category: 'null', priceIn: 25, priceOut: 25, priceWalkIn: 25, sortOrder: 26 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  // New: รถ and บ้าน
  { name: 'รถ', type: 'Car', category: 'null', priceIn: 5, priceOut: 5, priceWalkIn: 5, sortOrder: 27 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
  { name: 'บ้าน', type: 'House', category: 'null', priceIn: 20, priceOut: 20, priceWalkIn: 20, sortOrder: 28 , imageUrl: 'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg' },
];

// Helper functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function createDefaultMember(name: string = ''): Member {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    class: 'In',          // legacy (เผื่อโค้ดเก่าอ่าน)
    phone: '',
    address: '',
    statusIn: { house: false, car: false },
    statusOut: 'active',
    statusWorkIn: 'working',
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultProduct(data: Partial<Product>): Product {
  const now = new Date().toISOString();
  return {
    id: data.id || generateId(),
    name: data.name || '',
    type: data.type || 'XL',
    category: data.category || 'XL',
    priceIn: data.priceIn || 0,
    priceOut: data.priceOut || 0,
    priceWalkIn: data.priceWalkIn || 0,
    imageUrl: data.imageUrl || '',
    sortOrder: data.sortOrder || 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createNewBill(memberId: string, memberName: string, products: Product[], previousBill?: Bill, date?: string, member?: Member): Bill {
  const now = new Date().toISOString();
  const billDate = date || getToday();
  
  // Track which types have had their oldStock assigned (type-level from returnInputs)
  const typeOldStockAssigned = new Set<string>();
  
  const items: BillItem[] = products.map(product => {
    let oldStock = 0;
    
    if (previousBill?.returnInputs) {
      // Use returnInputs[type] from previous bill as old stock for first product of each type
      const typeRemaining = previousBill.returnInputs[product.type] ?? 0;
      if (typeRemaining > 0 && !typeOldStockAssigned.has(product.type)) {
        oldStock = typeRemaining;
        typeOldStockAssigned.add(product.type);
      }
    }
    
    return {
      productId: product.id,
      productName: product.name,
      oldStock,
      newStock: 0,
      totalStock: oldStock,
      returned: 0,
      sold: 0,
      priceUsed: member ? getProductPrice(product, member) : product.priceIn,
    };
  });
  
  return {
    id: generateId(),
    memberId,
    memberName,
    buyerName: '',
    date: billDate,
    items,
    ice: '',
    icePrice: 0,
    totalSales: 0,
    amountPaid: 0,
    amountOwed: 0,
    addMoney: 0, // เพิ่มเงิน (กรณีลูกค้าจ่ายเกิน)
    previousOwed: previousBill?.amountOwed || 0,
    notes: '',
    status: 'draft',
    dayClosed: false,
    returnInputs: {},
    createdAt: now,
    updatedAt: now,
  };
}

// ===== MEMBER CLASS / PRICE HELPERS =====

// แปลงค่า class ของสมาชิกให้เป็นค่ามาตรฐาน 'In' | 'Out' | 'WalkIn' เสมอ
// รองรับทั้งค่าจากฟอร์ม (memberClass: 'in'|'out'|'workin') และฟิลด์เดิม (class)
export function getMemberClass(member?: any | null): MemberClass {
  if (!member) return 'In';

  // ดึงค่าจากฟิลด์ class หรือ memberClass (แปลงเป็น String เพื่อป้องกัน Error)
  const rawClass = String(member.class || member.memberClass || '').trim().toLowerCase();

  switch (rawClass) {
    case 'out':
      return 'Out';
    case 'walkin':
      return 'WalkIn';
    case 'in':
    default:
      return 'In'; // ถ้าเป็นค่าว่าง หรือ 'in' ให้เป็น 'In' ตัวใหญ่เสมอ
  }
}

// types.ts
export function getProductPrice(product: Product, memberOrClass?: Member | MemberClass | null): number {
  const currentClass = typeof memberOrClass === 'string'
    ? memberOrClass
    : getMemberClass(memberOrClass); // ✅ เปลี่ยนจาก memberOrClass?.class เป็น getMemberClass()

  if (currentClass === 'Out') return product.priceOut;
  if (currentClass === 'WalkIn') return product.priceWalkIn;
  return product.priceIn;
}

export function getProductPriceByMemberClass(product: Product, memberClass: MemberClass): number {
  if (!product) return 0;
  switch (memberClass) {
    case 'Out':
      return product.priceOut;
    case 'WalkIn':
      return product.priceWalkIn;
    case 'In':
    default:
      return product.priceIn;
  }
}

export function calculateBillTotals(
  bill: Bill,
  allProducts: Product[],
  member?: Member
): { totalSales: number; amountOwed: number } {
  const memberClass = getMemberClass(member);

  // 1. ประเภทสินค้าหลัก (ไม่รวม Car, House, D)
  const distinctTypes = Array.from(
    new Set(
      allProducts
        .filter((p) => p.type !== 'Car' && p.type !== 'House' && p.type !== 'D')
        .map((p) => p.type)
    )
  );

  // 2. คำนวณยอดขายแยกตาม type
  const itemsTotal = distinctTypes.reduce((grandTotal, type) => {
    const typeProducts = allProducts.filter((p) => p.type === type);
    const typeItems = bill.items.filter((item) =>
      typeProducts.some((p) => p.id === item.productId)
    );

    const totalStockGroup = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
    const returnedInputGroup = bill.returnInputs?.[type] || 0;
    const actualSoldGroup = totalStockGroup - returnedInputGroup;

    const baseProduct = typeProducts[0];
    const price = baseProduct ? getProductPrice(baseProduct, memberClass) : 0;

    return grandTotal + (actualSoldGroup * price);
  }, 0);

  // 3. บวก house/car plan (ใช้ Optional Chaining ?. ป้องกันกรณี statusIn ไม่มีอยู่จริง)
  let planTotal = 0;
  if (memberClass === 'In' && member) {
    if (member.statusIn?.house === true) {
      const houseProd = allProducts.find((p) => p.type === 'House');
      planTotal += houseProd ? getProductPrice(houseProd, memberClass) : 0;
    }
    if (member.statusIn?.car === true) {
      const carProd = allProducts.find((p) => p.type === 'Car');
      planTotal += carProd ? getProductPrice(carProd, memberClass) : 0;
    }
  }

  // 4. คำนวณค่าน้ำแข็งแห้ง (Type D)
  const dProduct = allProducts.find((p) => p.type === 'D');
  const dItem = bill.items?.find((item) => item.productId === dProduct?.id);
  const dQuantity = dItem?.totalStock || 0;
  const dPrice = dProduct ? getProductPrice(dProduct, memberClass) : 0;
  const iceDryPrice = dQuantity * dPrice;

  const totalSales = itemsTotal + planTotal + iceDryPrice;
  const amountOwed = totalSales + (bill.previousOwed || 0) - (bill.amountPaid || 0) + (bill.addMoney || 0);
  // let amountOwed = totalSales - (bill.amountPaid || 0) + bill.previousOwed;
  // if (amountOwed < 0) {
  //   amountOwed = 0;
  // }

  return { totalSales, amountOwed };
}

// Group products by category
export function groupProductsByCategory(products: Product[]): Record<ProductCategory, Product[]> {
  return products.reduce((acc, product) => {
    const cat = product.category || 'Other';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(product);
    return acc;
  }, {} as Record<ProductCategory, Product[]>);
}

// Group products by type (legacy)
export function groupProductsByType(products: Product[]): Record<ProductType, Product[]> {
  return products.reduce((acc, product) => {
    if (!acc[product.type]) {
      acc[product.type] = [];
    }
    acc[product.type].push(product);
    return acc;
  }, {} as Record<ProductType, Product[]>);
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  XL: 'แท่งใหญ่',
  S: 'แท่งเล็ก',
  Sandwich: 'แซนวิช',
  Cup: 'ถ้วย',
  Cone: 'โคน',
  Coffee: 'กาแฟ',
  null: 'อื่นๆ',
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  XL: 'แท่งใหญ่',
  S: 'แท่งเล็ก',
  Coffee: 'กาแฟ',
  Sandwich: 'แซนวิช',
  Cup: 'ถ้วย',
  Cone: 'โคน',
  D: 'น้ำแข็งแห้ง',
  Car: 'รถ',
  House: 'บ้าน',
};
