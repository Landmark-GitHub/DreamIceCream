'use client';

import { create } from 'zustand';
import {
  AppState,
  Member,
  Product,
  Bill,
  DailySummary,
  HistoryLog,
  AppSettings,
  User,
  UserRole,
  DEFAULT_PRODUCTS,
  generateId,
  getToday,
  getCurrentMonth,
  createDefaultMember,
  createDefaultProduct,
  createNewBill,
  calculateBillTotals,
  PRODUCT_TYPE_LABELS,
  ExpenseCategory,
  ExpenseItem,
  ADMIN_PHONE,
} from './types';

import { db, handleFirestoreError, OperationType, testFirestoreConnection } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

// ===== INITIAL STATE HELPERS =====
const getInitialProducts = (): Product[] => {
  const now = new Date().toISOString();
  return DEFAULT_PRODUCTS.map((p, index) => ({
    ...p,
    id: `product-${index + 1}`,
    createdAt: now,
    updatedAt: now,
  }));
};

const getInitialCategories = (): ExpenseCategory[] => {
  const now = new Date().toISOString();
  return [
    { id: 'cat-1', name: 'น้ำแข็ง', icon: '🧊', createdAt: now },
    { id: 'cat-2', name: 'น้ำมันรถ', icon: '⛽', createdAt: now },
    { id: 'cat-3', name: 'อาหาร/สวัสดิการ', icon: '🍲', createdAt: now },
    { id: 'cat-4', name: 'ซื้อของเข้าร้าน', icon: '📦', createdAt: now },
    { id: 'cat-5', name: 'อื่น ๆ', icon: '⚙️', createdAt: now },
    { id: 'cat-6', name: 'ค่ารถ', icon: '🚗', createdAt: now },
    { id: 'cat-7', name: 'ค่าไฟ', icon: '⚡', createdAt: now },
    { id: 'cat-8', name: 'ค่าน้ำ', icon: '💧', createdAt: now },
    { id: 'cat-9', name: 'ค่ากิน', icon: '🍽️', createdAt: now },
    { id: 'cat-10', name: 'ค่าข้าว', icon: '🍚', createdAt: now },
    { id: 'cat-11', name: 'ค่าจิปาถะ', icon: '🛍️', createdAt: now },
    { id: 'cat-12', name: 'Mark', icon: '👤', createdAt: now },
    { id: 'cat-13', name: 'Jan', icon: '👤', createdAt: now },
    { id: 'cat-14', name: 'Yen', icon: '👤', createdAt: now },
    { id: 'cat-15', name: 'Father', icon: '👨', createdAt: now },
    { id: 'cat-16', name: 'อะไหล่รถ', icon: '🔧', createdAt: now },
    { id: 'cat-17', name: 'Faith', icon: '👤', createdAt: now },
    { id: 'cat-18', name: 'Wifi', icon: '🌐', createdAt: now },
    { id: 'cat-19', name: 'Net Mobile', icon: '📱', createdAt: now },
  ];
};

const getDefaultAdmin = (): User => {
  const now = new Date().toISOString();
  return {
    id: 'admin-default',
    phone: ADMIN_PHONE,
    name: 'Admin',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  };
};

const getDefaultUser = (): User => {
  const now = new Date().toISOString();
  return {
    id: 'user-default',
    phone: '0999999999',
    name: 'test',
    role: 'user',
    createdAt: now,
    updatedAt: now,
  };
};

const initialState: AppState = {
  members: [],
  products: getInitialProducts(),
  bills: [],
  dailySummaries: [],
  historyLogs: [],
  settings: {
    retentionMonths: 3,
    reminderExport: true,
    lastExportDate: '',
  },
  lastCleanup: getToday(),
  users: [getDefaultAdmin(), getDefaultUser()],
  currentUser: null,
  expenseCategories: getInitialCategories(),
  expenses: [],
};

export interface ExpenseActions {
  addExpenseCategory: (name: string, icon?: string) => void;
  deleteExpenseCategory: (id: string) => void;
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
}

// ===== FIRESTORE HELPER FUNCTIONS =====
async function saveDocument(collectionName: string, id: string, data: any) {
  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, collectionName, id), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

async function removeDocument(collectionName: string, id: string) {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

async function loadFromFirestore(): Promise<AppState | null> {
  try {
    await testFirestoreConnection();
    const [
      categoriesSnap,
      expensesSnap,
      logsSnap,
      membersSnap,
      productsSnap,
      billsSnap,
      usersSnap,
      settingsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'expenseCategories')),
      getDocs(collection(db, 'expenses')),
      getDocs(collection(db, 'logs')),
      getDocs(collection(db, 'members')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'bills')),
      getDocs(collection(db, 'users')),
      getDoc(doc(db, 'settings', 'appSettings')),
    ]);

    const expenseCategories: ExpenseCategory[] = categoriesSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as ExpenseCategory));

    const expenses: ExpenseItem[] = expensesSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as ExpenseItem));

    const historyLogs: HistoryLog[] = logsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as HistoryLog));

    let members: Member[] = membersSnap.docs.map((d) => {
      const data = d.data();
      let mClass = data.class;
      if (!mClass && data.memberClass) {
        const raw = String(data.memberClass).toLowerCase();
        mClass = raw === 'out' ? 'Out' : raw === 'walkin' ? 'WalkIn' : 'In';
      }
      return {
        id: d.id,
        ...data,
        class: mClass || 'In',
        statusIn: data.statusIn || { house: false, car: false },
      } as Member;
    });

    let products: Product[] = productsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Product));

    if (products.length === 0) {
      products = getInitialProducts();
    }

    const missingTypes = ['House', 'Car'].filter(
      (type) => !products.some((p: any) => p.type === type)
    );
    if (missingTypes.length > 0) {
      const allDefaults = getInitialProducts();
      missingTypes.forEach((type) => {
        const missing = allDefaults.find((p) => p.type === type);
        if (missing) products.push(missing);
      });
    }

    const bills: Bill[] = billsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Bill));

    let users: User[] = usersSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as User));

    if (!users || users.length === 0) {
      users = [getDefaultAdmin(), getDefaultUser()];
    } else {
      const hasAdmin = users.some((u: User) => u.phone === ADMIN_PHONE);
      if (!hasAdmin) {
        users.unshift(getDefaultAdmin());
      }
      const hasDefaultUser = users.some((u: User) => u.phone === '0999999999');
      if (!hasDefaultUser) {
        users.push(getDefaultUser());
      }
    }

    const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;

    return {
      members,
      products,
      bills,
      dailySummaries: [],
      historyLogs,
      settings: settingsData
        ? {
            retentionMonths: settingsData.retentionMonths ?? 3,
            reminderExport: settingsData.reminderExport ?? true,
            lastExportDate: settingsData.lastExportDate ?? '',
          }
        : initialState.settings,
      lastCleanup: settingsData?.lastCleanup || getToday(),
      users,
      currentUser: null,
      expenseCategories: expenseCategories.length > 0 ? expenseCategories : getInitialCategories(),
      expenses,
    };
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return null;
  }
}

// ===== STORE INTERFACE =====
interface StoreActions {
  // Auth
  login: (phone: string) => User | null;
  logout: () => void;
  isAdmin: () => boolean;

  // Users
  addUser: (phone: string, name: string, role: UserRole) => User | null;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  addMember: (name: string) => Member;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => void;

  addProduct: (data: Partial<Product>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  updatePricesByType: (type: string, prices: { priceIn?: number; priceOut?: number; priceWalkIn?: number }) => void;
  deleteProduct: (id: string) => void;
  reorderProducts: (products: Product[]) => void;

  createBill: (memberId: string, date?: string) => { id: string };
  updateBill: (billId: string, updates: Partial<Bill>) => void;
  updateBillItem: (billId: string, productId: string, updates: Partial<Bill['items'][0]>) => void;
  deleteBill: (billId: string) => void;
  confirmCheckout: (billId: string) => void;
  confirmDayClose: (billId: string) => void;

  getTodayBills: () => Bill[];
  getMemberBillsToday: (memberId: string) => Bill[];
  getLastBillForMember: (memberId: string) => Bill | undefined;

  closeDaySummary: () => void;
  exportToCSV: (month?: string) => string;
  runAutoCleanup: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetAll: () => void;
  loadData: () => Promise<void>;
  _isLoaded: boolean;

  // Expense extras
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void;
  reorderExpenseCategories: (newOrder: ExpenseCategory[]) => void;
}

type Store = AppState & StoreActions & ExpenseActions;

// ===== ZUSTAND STORE =====
export const useStore = create<Store>()((set, get) => ({
  ...initialState,
  _isLoaded: false,

  // ===== LOAD DATA FROM FIRESTORE =====
  loadData: async () => {
    const data = await loadFromFirestore();
    if (data) {
      set({ ...data, _isLoaded: true, currentUser: null });
    } else {
      set({ _isLoaded: true });
    }
  },

  // ===== AUTH =====
  login: (phone: string) => {
    const state = get();
    const user = state.users.find((u) => u.phone === phone);
    if (user) {
      set({ currentUser: user });
      return user;
    }
    return null;
  },

  logout: () => {
    set({ currentUser: null });
  },

  isAdmin: () => {
    const { currentUser } = get();
    return currentUser?.role === 'admin';
  },

  // ===== USERS =====
  addUser: (phone: string, name: string, role: UserRole) => {
    const state = get();
    if (state.users.some((u) => u.phone === phone)) {
      return null;
    }
    const now = new Date().toISOString();
    const user: User = {
      id: generateId(),
      phone,
      name,
      role,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ users: [...state.users, user] }));
    saveDocument('users', user.id, user);
    return user;
  },

  updateUser: (id: string, updates: Partial<User>) => {
    set((state) => {
      let updatedUser: User | null = null;
      const users = state.users.map((u) => {
        if (u.id === id) {
          updatedUser = { ...u, ...updates, updatedAt: new Date().toISOString() };
          return updatedUser;
        }
        return u;
      });
      if (updatedUser) saveDocument('users', id, updatedUser);
      return { users };
    });
  },

  deleteUser: (id: string) => {
    const state = get();
    const user = state.users.find((u) => u.id === id);
    if (user?.phone === ADMIN_PHONE) return;

    set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
    removeDocument('users', id);
  },

  // ===== MEMBERS =====
  addMember: (name: string) => {
    const member = createDefaultMember(name);
    set((state) => ({ members: [...state.members, member] }));
    saveDocument('members', member.id, member);
    return member;
  },

  updateMember: (id: string, updates: Partial<Member>) => {
    set((state) => {
      let updatedMember: Member | null = null;
      const members = state.members.map((m) => {
        if (m.id === id) {
          updatedMember = { ...m, ...updates, updatedAt: new Date().toISOString() };
          return updatedMember;
        }
        return m;
      });
      if (updatedMember) saveDocument('members', id, updatedMember);
      return { members };
    });
  },

  deleteMember: (id: string) => {
    set((state) => ({ members: state.members.filter((m) => m.id !== id) }));
    removeDocument('members', id);
  },

  // ===== PRODUCTS =====
  addProduct: (data: Partial<Product>) => {
    const product = createDefaultProduct({
      sortOrder: get().products.length + 1,
      ...data,
    });
    set((state) => ({ products: [...state.products, product] }));
    saveDocument('products', product.id, product);
    return product;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    set((state) => {
      let updatedProduct: Product | null = null;
      const products = state.products.map((p) => {
        if (p.id === id) {
          updatedProduct = { ...p, ...updates, updatedAt: new Date().toISOString() };
          return updatedProduct;
        }
        return p;
      });
      if (updatedProduct) saveDocument('products', id, updatedProduct);
      return { products };
    });
  },

  updatePricesByType: (type: string, prices: { priceIn?: number; priceOut?: number; priceWalkIn?: number }) => {
    set((state) => {
      const products = state.products.map((p) => {
        if (p.type === type) {
          const updated = { ...p, ...prices, updatedAt: new Date().toISOString() };
          saveDocument('products', p.id, updated);
          return updated;
        }
        return p;
      });
      return { products };
    });
  },

  deleteProduct: (id: string) => {
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    removeDocument('products', id);
  },

  reorderProducts: (products: Product[]) => {
    set({ products });
    products.forEach((p) => saveDocument('products', p.id, p));
  },

  // ===== BILLS =====
  createBill: (memberId: string, date?: string) => {
    let newlyCreatedBillId = '';

    set((state) => {
      const member = state.members.find((m) => m.id === memberId);
      if (!member) return state;

      const billDate = date || getToday();

      const prevBill = state.bills
        .filter((b) => b.memberId === memberId && b.status === 'completed')
        .sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })[0];

      const bill = createNewBill(memberId, member.name, state.products, prevBill, billDate, member);

      bill.previousOwed = prevBill ? prevBill.amountOwed : 0;
      newlyCreatedBillId = bill.id;

      saveDocument('bills', bill.id, bill);
      return { bills: [...state.bills, bill] };
    });

    return { id: newlyCreatedBillId };
  },

  updateBill: (billId: string, updates: Partial<Bill>) => {
    set((state) => {
      let targetBill: Bill | null = null;
      const bills = state.bills.map((b) => {
        if (b.id !== billId) return b;
        const updated = { ...b, ...updates, updatedAt: new Date().toISOString() };

        if ('amountOwed' in updates) {
          targetBill = updated;
          return updated;
        }

        const member = state.members.find((m) => m.id === updated.memberId);
        const { totalSales, amountOwed } = calculateBillTotals(updated, state.products, member);
        targetBill = { ...updated, totalSales, amountOwed };
        return targetBill;
      });

      if (targetBill) saveDocument('bills', billId, targetBill);
      return { bills };
    });
  },

  updateBillItem: (billId: string, productId: string, updates: Partial<Bill['items'][0]>) => {
    set((state) => {
      let targetBill: Bill | null = null;
      const bills = state.bills.map((b) => {
        if (b.id !== billId) return b;

        const items = b.items.map((item) => {
          if (item.productId !== productId) return item;

          const updated = { ...item, ...updates };
          updated.totalStock = updated.oldStock + updated.newStock;
          updated.sold = updated.totalStock - updated.returned;

          return updated;
        });

        const updated = { ...b, items, updatedAt: new Date().toISOString() };
        const member = state.members.find((m) => m.id === updated.memberId);
        const { totalSales, amountOwed } = calculateBillTotals(updated, state.products, member);
        targetBill = { ...updated, totalSales, amountOwed };
        return targetBill;
      });

      if (targetBill) saveDocument('bills', billId, targetBill);
      return { bills };
    });
  },

  deleteBill: (billId: string) => {
    set((state) => ({ bills: state.bills.filter((b) => b.id !== billId) }));
    removeDocument('bills', billId);
  },

  confirmCheckout: (billId: string) => {
    set((state) => {
      let targetBill: Bill | null = null;
      const bills = state.bills.map((b) => {
        if (b.id === billId) {
          targetBill = { ...b, status: 'checkout' as const, updatedAt: new Date().toISOString() };
          return targetBill;
        }
        return b;
      });
      if (targetBill) saveDocument('bills', billId, targetBill);
      return { bills };
    });
  },

  confirmDayClose: (billId: string) => {
    set((state) => {
      let targetBill: Bill | null = null;
      const bills = state.bills.map((b) => {
        if (b.id === billId) {
          targetBill = { ...b, status: 'completed' as const, dayClosed: true, updatedAt: new Date().toISOString() };
          return targetBill;
        }
        return b;
      });
      if (targetBill) saveDocument('bills', billId, targetBill);
      return { bills };
    });
  },

  // ===== BILL HELPERS =====
  getTodayBills: () => {
    const today = getToday();
    return get().bills.filter((b) => b.date === today);
  },

  getMemberBillsToday: (memberId: string) => {
    const today = getToday();
    return get().bills.filter((b) => b.memberId === memberId && b.date === today);
  },

  getLastBillForMember: (memberId: string) => {
    return get().bills
      .filter((b) => b.memberId === memberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  },

  // ===== DAILY SUMMARY =====
  closeDaySummary: () => {
    const state = get();
    const today = getToday();
    const todayBills = state.bills.filter((b) => b.date === today);

    if (todayBills.length === 0) return;

    const summary: DailySummary = {
      date: today,
      totalBills: todayBills.length,
      totalSales: todayBills.reduce((sum, b) => sum + b.totalSales, 0),
      totalOwed: todayBills.reduce((sum, b) => sum + b.amountOwed, 0),
      memberSummaries: todayBills.map((b) => ({
        memberId: b.memberId,
        memberName: b.memberName,
        totalSales: b.totalSales,
        totalOwed: b.amountOwed,
      })),
      closed: true,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const updatedBills = state.bills.map((b) =>
        b.date === today ? { ...b, dayClosed: true } : b
      );
      updatedBills.forEach((b) => saveDocument('bills', b.id, b));
      return {
        dailySummaries: [...state.dailySummaries.filter((s) => s.date !== today), summary],
        bills: updatedBills,
      };
    });
  },

  // ===== EXPORT =====
  exportToCSV: (month?: string) => {
    const state = get();
    const targetMonth = month || getCurrentMonth();
    const bills = state.bills.filter((b) => b.date.startsWith(targetMonth));

    if (bills.length === 0) return '';

    const headers = [
      'วันที่', 'ชื่อสมาชิก', 'ประเภทสินค้า', 'ชื่อสินค้า', 'ยอดเก่า', 
      'ยอดใหม่ (เบิก)', 'ยอดรวม', 'ยอดเหลือคืน', 'ยอดขาย', 'ราคา/ชิ้น', 
      'มูลค่าขาย (บาท)', 'ค่าน้ำแข็ง (บาท)', 'ยอดขายรวม (บาท)', 'จ่ายแล้ว (บาท)', 
      'ค้างชำระ (บาท)', 'หมายเหตุ', 'สถานะ'
    ];

    const rows: string[][] = [];
    const sortedBills = [...bills].sort((a, b) => a.date.localeCompare(b.date));

    sortedBills.forEach((bill) => {
      let isFirstItem = true;
      const productTypes = Array.from(new Set(state.products.map((p) => p.type)));

      productTypes.forEach((type) => {
        const typeProducts = state.products.filter((p) => p.type === type);
        const typeItems = bill.items.filter((item) => 
          typeProducts.some((p) => p.id === item.productId) && 
          (item.totalStock > 0 || item.newStock > 0 || item.sold > 0)
        );

        if (typeItems.length === 0) return;

        const typeTotalStock = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
        const typeReturned = bill.returnInputs?.[type] || 0;
        const typeSold = Math.max(0, typeTotalStock - typeReturned);
        const basePrice = typeItems[0]?.priceUsed || 0;
        const typeSubtotal = typeSold * basePrice;
        const typeName = PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

        rows.push([
          isFirstItem ? formatDateThai(bill.date) : '',
          isFirstItem ? bill.memberName : '',
          typeName,
          `รวม ${typeName}`,
          typeItems.reduce((sum, i) => sum + i.oldStock, 0).toString(),
          typeItems.reduce((sum, i) => sum + i.newStock, 0).toString(),
          typeTotalStock.toString(),
          typeReturned.toString(),
          typeSold.toString(),
          basePrice.toString(),
          typeSubtotal.toLocaleString(),
          isFirstItem ? (bill.icePrice || 0).toLocaleString() : '',
          isFirstItem ? Math.round(bill.totalSales).toLocaleString() : '',
          isFirstItem ? Math.round(bill.amountPaid).toLocaleString() : '',
          isFirstItem ? Math.round(bill.amountOwed).toLocaleString() : '',
          isFirstItem ? (bill.notes || '-') : '',
          isFirstItem ? getStatusLabel(bill.status) : '',
        ]);

        isFirstItem = false;
      });
      rows.push(Array(headers.length).fill(''));
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    set((state) => {
      const settings = { ...state.settings, lastExportDate: new Date().toISOString() };
      saveDocument('settings', 'appSettings', settings);
      return { settings };
    });

    return csv;
  },

  // ===== AUTO CLEANUP =====
  runAutoCleanup: () => {
    const state = get();
    const retentionMonths = state.settings.retentionMonths;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
    const cutoffMonth = cutoffDate.toISOString().slice(0, 7);
    const billsToDelete = state.bills.filter((b) => b.date.slice(0, 7) < cutoffMonth);

    if (billsToDelete.length === 0) return;

    billsToDelete.forEach((b) => removeDocument('bills', b.id));

    const monthGroups: Record<string, Bill[]> = {};
    billsToDelete.forEach((b) => {
      const month = b.date.slice(0, 7);
      if (!monthGroups[month]) monthGroups[month] = [];
      monthGroups[month].push(b);
    });

    const newLogs: HistoryLog[] = Object.entries(monthGroups).map(([month, bills]) => ({
      id: generateId(),
      month,
      totalBills: bills.length,
      totalSales: bills.reduce((sum, b) => sum + b.totalSales, 0),
      totalOwed: bills.reduce((sum, b) => sum + b.amountOwed, 0),
      deletedAt: new Date().toISOString(),
    }));

    newLogs.forEach((log) => saveDocument('logs', log.id, log));

    const today = getToday();
    saveDocument('settings', 'appSettings', { ...state.settings, lastCleanup: today });

    set((state) => ({
      bills: state.bills.filter((b) => b.date.slice(0, 7) >= cutoffMonth),
      dailySummaries: state.dailySummaries.filter((s) => s.date.slice(0, 7) >= cutoffMonth),
      historyLogs: [...state.historyLogs, ...newLogs],
      lastCleanup: today,
    }));
  },

  // ===== SETTINGS =====
  updateSettings: (updates: Partial<AppSettings>) => {
    set((state) => {
      const settings = { ...state.settings, ...updates };
      saveDocument('settings', 'appSettings', settings);
      return { settings };
    });
  },

  // ===== RESET =====
  resetAll: () => {
    set(initialState);
  },

  // ===== EXPENSES =====
  addExpenseCategory: (name: string, icon = '📝') => {
    set((state) => {
      const newCategory: ExpenseCategory = {
        id: `cat-${Date.now()}`,
        name,
        icon,
        createdAt: new Date().toISOString(),
      };
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'เพิ่มหมวดหมู่รายจ่าย',
        details: `เพิ่มหมวดหมู่ "${name}"`,
        type: 'activity',
      };
      saveDocument('expenseCategories', newCategory.id, newCategory);
      saveDocument('logs', newLog.id, newLog);
      return {
        expenseCategories: [...state.expenseCategories, newCategory],
        historyLogs: [...state.historyLogs, newLog],
      };
    });
  },

  deleteExpenseCategory: (id: string) => {
    set((state) => {
      const targetCategory = state.expenseCategories.find((c) => c.id === id);
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ลบหมวดหมู่รายจ่าย',
        details: `ลบหมวดหมู่ "${targetCategory?.name || id}" และข้อมูลรายจ่ายที่เกี่ยวข้อง`,
        type: 'activity',
      };
      const expensesToDelete = state.expenses.filter((e) => e.categoryId === id);
      removeDocument('expenseCategories', id);
      expensesToDelete.forEach((exp) => removeDocument('expenses', exp.id));
      saveDocument('logs', newLog.id, newLog);
      return {
        expenseCategories: state.expenseCategories.filter((c) => c.id !== id),
        expenses: state.expenses.filter((e) => e.categoryId !== id),
        historyLogs: [...state.historyLogs, newLog],
      };
    });
  },

  addExpense: (expenseData) => {
    set((state) => {
      const newExpense: ExpenseItem = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const category = state.expenseCategories.find((c) => c.id === expenseData.categoryId);
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'บันทึกรายจ่าย',
        details: `ลงยอด ${expenseData.amount} บาท ในหมวดหมู่ ${category?.name || 'ทั่วไป'}`,
        type: 'activity',
      };
      saveDocument('expenses', newExpense.id, newExpense);
      saveDocument('logs', newLog.id, newLog);
      return {
        expenses: [...state.expenses, newExpense],
        historyLogs: [...state.historyLogs, newLog],
      };
    });
  },

  deleteExpense: (id: string) => {
    set((state) => {
      const targetExpense = state.expenses.find((e) => e.id === id);
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ลบรายการรายจ่าย',
        details: `ลบยอดจำนวน ${targetExpense?.amount || 0} บาท ออกจากระบบ`,
        type: 'activity',
      };
      removeDocument('expenses', id);
      saveDocument('logs', newLog.id, newLog);
      return {
        expenses: state.expenses.filter((e) => e.id !== id),
        historyLogs: [...state.historyLogs, newLog],
      };
    });
  },

  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => {
    set((state) => {
      let updatedCat: ExpenseCategory | null = null;
      const expenseCategories = state.expenseCategories.map((c) => {
        if (c.id === id) {
          updatedCat = { ...c, ...updates };
          return updatedCat;
        }
        return c;
      });
      if (updatedCat) saveDocument('expenseCategories', id, updatedCat);
      return { expenseCategories };
    });
  },

  reorderExpenseCategories: (newOrder: ExpenseCategory[]) => {
    set({ expenseCategories: newOrder });
    newOrder.forEach((cat) => saveDocument('expenseCategories', cat.id, cat));
  },
}));

function formatDateThai(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'กำลังเบิก';
    case 'checkout': return 'เบิกแล้ว';
    case 'completed': return 'ปิดวันแล้ว';
    default: return status;
  }
}

export const selectMembers = (state: Store) => state.members;
export const selectProducts = (state: Store) => state.products;
export const selectBills = (state: Store) => state.bills;
export const selectSettings = (state: Store) => state.settings;
export const selectHistoryLogs = (state: Store) => state.historyLogs;
