'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { db, handleFirestoreError } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  DollarSign,
  Save,
  Trash2,
  PieChart,
  Plus,
  FileText,
  ArrowLeft,
  Home,
  Eye,
  Loader2,
  Settings,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toJpeg } from 'html-to-image';

// ฟังก์ชันแมปสีพาสเทลตามชื่อรสชาติ/ชนิดย่อยเพื่อความสวยงามและแยกแยะง่าย
const getFlavorColorClass = (flavor: string) => {
  switch (flavor) {
    case 'ทุเรียน':
      return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    case 'กะทิ':
    case 'วานิลา':
    case 'วาลิลา':
      return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300';
    case 'ช็อค':
      return 'bg-amber-200/60 border-amber-400 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
    case 'สตอ':
      return 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
    case 'ถั่วดำ':
      return 'bg-slate-200 border-slate-400 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    case 'ถั่วแดง':
      return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950/40 dark:text-red-300';
    case 'เหนียว':
    case 'ข้าวเหนียว':
      return 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'กาแฟ':
      return 'bg-stone-200 border-stone-400 text-stone-800 dark:bg-stone-800 dark:text-stone-200';
    case 'ชาเขียว':
      return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-950/40 dark:text-green-300';
    case 'โคล่า':
      return 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
    case 'ส้ม':
      return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300';
    default:
      return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  }
};

// ข้อมูลตั้งต้นสำหรับสินค้าหลัก
const INITIAL_MASTER_PRODUCTS = [
  { id: 'p1', name: 'แผ่น', unitPrice: 720, flavors: ['ทุเรียน', 'กะทิ', 'ช็อค', 'สตอ'] },
  { id: 'p2', name: 'ถั่ว', unitPrice: 120, flavors: ['ถั่วดำ', 'ถั่วแดง', 'เหนียว'] },
  { id: 'p3', name: 'ลอดช่อง', unitPrice: 120, flavors: [] },
  { id: 'p4', name: 'ข้าวโพด', unitPrice: 120, flavors: [] },
  { id: 'p5', name: 'เผือก', unitPrice: 120, flavors: [] },
  { id: 'p6', name: 'ชา', unitPrice: 120, flavors: [] },
  { id: 'p7', name: 'โอเลี้ยง', unitPrice: 120, flavors: [] },
  { id: 'p8', name: 'ส้ม', unitPrice: 100, flavors: [] },
  { id: 'p9', name: 'แดง', unitPrice: 100, flavors: [] },
  { id: 'p10', name: 'โคล่า', unitPrice: 100, flavors: [] },
  { id: 'p11', name: 'ป๊อป', unitPrice: 120, flavors: [] },
  { id: 'p12', name: 'จรวด', unitPrice: 100, flavors: [] },
  { id: 'p13', name: 'สามสี', unitPrice: 100, flavors: [] },
  { id: 'p14', name: 'แซนวิช', unitPrice: 90, flavors: ['ช็อค', 'วานิลา'] },
  { id: 'p15', name: 'ตุ๊กตา', unitPrice: 1500, flavors: [] },
  { id: 'p16', name: 'ถ้วยแหลม', unitPrice: 750, flavors: ['กาแฟ', 'ชาเขียว'] },
  { id: 'p17', name: 'ถ้วย', unitPrice: 600, flavors: ['ช็อค', 'วานิลา', 'กะทิ', 'สตอ'] },
  { id: 'p18', name: 'โคน', unitPrice: 1000, flavors: ['ช็อค', 'วานิลา', 'กะทิ', 'สตอ'] },
  { id: 'p19', name: 'คาลิปโป้', unitPrice: 600, flavors: ['โคล่า', 'ส้ม', 'สตอ'] },
];

// ===== API / Firestore helpers =====
async function fetchOrders(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'orders'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    handleFirestoreError(err, 'list' as any, 'orders');
    return [];
  }
}

async function saveOrders(orders: any[]): Promise<void> {
  try {
    for (const order of orders) {
      const cleanOrder = JSON.parse(JSON.stringify(order));
      await setDoc(doc(db, 'orders', order.id), cleanOrder, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, 'write' as any, 'orders');
  }
}

export default function SupplyPage() {
  const [masterProducts, setMasterProducts] = useState<any[]>(INITIAL_MASTER_PRODUCTS);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [supplyHistory, setSupplyHistory] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'all'>('all');

  // States สำหรับ CRUD Master Products Modal
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodFlavors, setProdFlavors] = useState('');

  // States สำหรับ Extra Income Modal (รายรับพิเศษ)
  const [isExtraIncomeModalOpen, setIsExtraIncomeModalOpen] = useState(false);
  const [extraIncomeList, setExtraIncomeList] = useState<any[]>([]);
  const [extraIncomeAmount, setExtraIncomeAmount] = useState('');
  const [extraIncomeNote, setExtraIncomeNote] = useState('');

  const { expenses = [] } = useStore();
  const printRef = useRef<HTMLDivElement>(null);

  // โหลดข้อมูล Master Products และ Extra Income จาก Firestore
  useEffect(() => {
    async function loadSettings() {
      try {
        const masterDoc = await getDoc(doc(db, 'supplySettings', 'masterProducts'));
        if (masterDoc.exists() && masterDoc.data()?.list) {
          setMasterProducts(masterDoc.data().list);
        }
        const extraDoc = await getDoc(doc(db, 'supplySettings', 'extraIncome'));
        if (extraDoc.exists() && extraDoc.data()?.list) {
          setExtraIncomeList(extraDoc.data().list);
        }
      } catch (e) {
        console.error('Error loading supply settings:', e);
      }
    }
    loadSettings();
  }, []);

  const saveMasterToStorage = async (updatedList: any[]) => {
    setMasterProducts(updatedList);
    try {
      await setDoc(doc(db, 'supplySettings', 'masterProducts'), { list: updatedList });
    } catch (e) {
      console.error(e);
    }
  };

  // ===== Extra Income helpers =====
  const saveExtraIncomeToStorage = async (updatedList: any[]) => {
    setExtraIncomeList(updatedList);
    try {
      await setDoc(doc(db, 'supplySettings', 'extraIncome'), { list: updatedList });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddExtraIncome = () => {
    const amount = parseFloat(extraIncomeAmount);
    if (!amount || amount <= 0) return alert('กรุณากรอกยอดเงินที่ถูกต้อง');
    if (!extraIncomeNote.trim()) return alert('กรุณากรอกโน็ต/แหล่งที่มา');
    const newEntry = {
      id: `ei-${Date.now()}`,
      amount,
      note: extraIncomeNote.trim(),
      date: new Date().toISOString(),
      viewMode,
    };
    const updated = [...extraIncomeList, newEntry];
    saveExtraIncomeToStorage(updated);
    setExtraIncomeAmount('');
    setExtraIncomeNote('');
  };

  const handleDeleteExtraIncome = (id: string) => {
    if (!confirm('ลบรายรับพิเศษนี้?')) return;
    saveExtraIncomeToStorage(extraIncomeList.filter((e) => e.id !== id));
  };

  // โหลดข้อมูลจาก API ครั้งแรก
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const orders = await fetchOrders();
      setSupplyHistory(orders);
    } catch (err) {
      alert('โหลดข้อมูลไม่สำเร็จ: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setSelectedOrderId(null);
    setQuantities({});
  }, [selectedDate]);

  const handleEditOrder = (order: any) => {
    setSelectedDate(order.date);
    setSelectedOrderId(order.id);
    const newQuantities: Record<string, number> = {};
    order.items.forEach((item: any) => {
      if (item.details && item.details.length > 0) {
        item.details.forEach((det: any) => {
          newQuantities[`${item.productId}-${det.flavorName}`] = det.quantity;
        });
      } else {
        newQuantities[`${item.productId}-total`] = item.totalQuantity;
      }
    });
    setQuantities(newQuantities);
  };

  const handleClearForm = () => {
    setSelectedOrderId(null);
    setQuantities({});
  };

  const calculateCurrentForm = () => {
    let totalOrderAmount = 0;
    const items: any[] = [];
    masterProducts.forEach((p) => {
      let totalQty = 0;
      const details: any[] = [];
      if (p.flavors && p.flavors.length > 0) {
        p.flavors.forEach((flv: string) => {
          const qty = quantities[`${p.id}-${flv}`] || 0;
          if (qty > 0) {
            totalQty += qty;
            details.push({ flavorName: flv, quantity: qty });
          }
        });
      } else {
        totalQty = quantities[`${p.id}-total`] || 0;
      }
      if (totalQty > 0) {
        const amount = totalQty * p.unitPrice;
        totalOrderAmount += amount;
        items.push({
          productId: p.id,
          productName: p.name,
          unitPrice: p.unitPrice,
          totalQuantity: totalQty,
          totalAmount: amount,
          details,
        });
      }
    });
    const marginAmount = totalOrderAmount * 0.2;
    return { items, totalOrderAmount, marginAmount };
  };

  const { items: currentItems, totalOrderAmount: currentTotal, marginAmount: currentMargin } = calculateCurrentForm();

  const handleSaveOrder = async () => {
    if (currentItems.length === 0) return alert('กรุณากรอกจำนวนอย่างน้อย 1 รายการก่อนบันทึก');
    setIsSaving(true);
    try {
      let updatedHistory = [...supplyHistory];
      let successMsg = '';

      if (selectedOrderId) {
        updatedHistory = updatedHistory.map((o) =>
          o.id === selectedOrderId
            ? { ...o, date: selectedDate, items: currentItems, totalOrderAmount: currentTotal, marginAmount: currentMargin }
            : o
        );
        successMsg = 'อัปเดตใบสั่งซื้อเรียบร้อยแล้ว';
      } else {
        const newOrder = {
          id: `sup-${Date.now()}`,
          date: selectedDate,
          items: currentItems,
          totalOrderAmount: currentTotal,
          marginAmount: currentMargin,
          createdAt: new Date().toISOString(),
        };
        updatedHistory.push(newOrder);
        setSelectedOrderId(newOrder.id);
        successMsg = 'บันทึกใบสั่งซื้อใหม่เรียบร้อยแล้ว';
      }

      await saveOrders(updatedHistory);
      setSupplyHistory(updatedHistory);
      alert(successMsg);
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('ยืนยันที่จะลบประวัติการสั่งของใบนี้?')) return;
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'orders', id));
      const updated = supplyHistory.filter((o) => o.id !== id);
      setSupplyHistory(updated);
      if (selectedOrderId === id) handleClearForm();
    } catch (err) {
      alert('ลบไม่สำเร็จ: ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (currentItems.length === 0) return alert('กรุณากรอกข้อมูลก่อนสั่งพิมพ์');
    if (!printRef.current) return;
    try {
      const dataUrl = await toJpeg(printRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `bill-${selectedDate}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('บันทึกรูปภาพไม่สำเร็จ: ' + String(err));
    }
  };

  // ===== ลอจิกการเปิดฟอร์ม/จัดการ Master Product สินค้าหลัก =====
  const openAddMasterProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice(0);
    setProdFlavors('');
  };

  const openEditMasterProduct = (prod: any) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdPrice(prod.unitPrice);
    setProdFlavors(prod.flavors ? prod.flavors.join(', ') : '');
  };

  const handleSaveMasterProduct = () => {
    if (!prodName.trim()) return alert('กรุณากรอกชื่อสินค้า');
    if (prodPrice <= 0) return alert('กรุณากรอกราคาที่ถูกต้อง');

    const flavorArray = prodFlavors
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (editingProduct) {
      // อัปเดตสินค้าเดิม
      const updated = masterProducts.map((p) =>
        p.id === editingProduct.id
          ? { ...p, name: prodName, unitPrice: prodPrice, flavors: flavorArray }
          : p
      );
      saveMasterToStorage(updated);
    } else {
      // เพิ่มสินค้าใหม่
      const newProduct = {
        id: `p-${Date.now()}`,
        name: prodName,
        unitPrice: prodPrice,
        flavors: flavorArray,
      };
      saveMasterToStorage([...masterProducts, newProduct]);
    }
    openAddMasterProduct(); // ล้างฟอร์ม
  };

  const handleDeleteMasterProduct = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้าชิ้นนี้ออกจากระบบตารางหลัก?')) return;
    const updated = masterProducts.filter((p) => p.id !== id);
    saveMasterToStorage(updated);
    openAddMasterProduct();
  };

  // ===== คำนวณสรุปรายเดือนและวันปัจจุบัน =====
  const currentMonthStr = selectedDate.substring(0, 7);
  const monthlyOrders = supplyHistory.filter((o) => o.date.startsWith(currentMonthStr));
  const monthlyTotalMargin = monthlyOrders.reduce((sum, o) => sum + o.marginAmount, 0);
  const monthlyExpenses = expenses
    .filter((e: any) => e.date && e.date.startsWith(currentMonthStr))
    .reduce((sum: number, e: any) => sum + e.amount, 0);
  const monthlyNetProfit = monthlyTotalMargin - monthlyExpenses;
  const monthlyTotalSupply = monthlyOrders.reduce((sum, o) => sum + o.totalOrderAmount, 0);
  const monthlyMargin = monthlyOrders.reduce((sum, o) => sum + o.marginAmount, 0);
  const monthlyActualExpense = monthlyTotalSupply - monthlyMargin;

  // ===== คำนวณสรุปแบบทั้งหมด (all-time) =====
  const allOrders = supplyHistory;
  const allTotalMargin = allOrders.reduce((sum, o) => sum + o.marginAmount, 0);
  const allExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const allNetProfit = allTotalMargin - allExpenses;
  const allTotalSupply = allOrders.reduce((sum, o) => sum + o.totalOrderAmount, 0);
  const allMargin = allOrders.reduce((sum, o) => sum + o.marginAmount, 0);
  const allActualExpense = allTotalSupply - allMargin;

  // ===== เลือกตัวเลขตาม viewMode =====
  const displayTotalMargin = viewMode === 'all' ? allTotalMargin : monthlyTotalMargin;
  const displayExpenses = viewMode === 'all' ? allExpenses : monthlyExpenses;
  const displayNetProfit = viewMode === 'all' ? allNetProfit : monthlyNetProfit;
  const displayTotalSupply = viewMode === 'all' ? allTotalSupply : monthlyTotalSupply;
  const displayMargin = viewMode === 'all' ? allMargin : monthlyMargin;
  const displayActualExpense = viewMode === 'all' ? allActualExpense : monthlyActualExpense;

  // ===== Extra Income totals =====
  const currentMonthExtraIncome = extraIncomeList
    .filter((e) => e.date && e.date.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);
  const allExtraIncome = extraIncomeList.reduce((sum, e) => sum + e.amount, 0);
  const displayExtraIncome = viewMode === 'all' ? allExtraIncome : currentMonthExtraIncome;

  const todaySavedOrders = supplyHistory.filter((o) => o.date === selectedDate);
  const todayTotalAmount = todaySavedOrders.reduce((sum, o) => sum + o.totalOrderAmount, 0);
  const todayTotalMargin = todaySavedOrders.reduce((sum, o) => sum + o.marginAmount, 0);

  const isFormEmpty = currentItems.length === 0;
  const showDaySummary = !selectedOrderId && isFormEmpty;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* ส่วนหัวแผงควบคุมระบบ */}
      <div className="flex flex-col gap-4 bg-muted/40 p-5 rounded-xl border print:hidden">
        <div className="flex justify-between items-start gap-4">

          <div>
            <h1 className="text-2xl font-bold tracking-tight">ระบบจัดซื้อสั่งของเข้าร้าน</h1>
            <p className="text-sm text-muted-foreground">คำนวณประมวลผลตัวเลขเชื่อมโยงตามโครงสร้างตารางข้อมูลกำไรและต้นทุนสั่งของ</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMasterModalOpen(true)}
              className="gap-1.5 bg-background shadow-sm border-primary/30 text-primary hover:bg-primary/5 h-9"
            >
              <Settings className="w-4 h-4" />
              <span>จัดการรายการสินค้าหลัก</span>
            </Button>
            {/* Toggle โหมดแสดงผลสรุป */}

            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-background text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                รายเดือน
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'all'
                    ? 'bg-background text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ทั้งหมด
              </button>
            </div>

          </div>

        </div>
        <div className="flex flex-wrap items-center gap-3 justify-start">
          <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 shadow-sm">
            <Link href="/">
              <Home className="w-4 h-4" />
              กลับหน้าหลัก
            </Link>
          </Button>
          <div className="flex items-center gap-2 bg-background px-3 h-9 rounded-lg border shadow-sm">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Label htmlFor="date-select" className="sr-only">เลือกวันที่</Label>
            <Input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 focus-visible:ring-0 w-36 p-0 h-auto font-medium bg-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* สรุปตัวเลข */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <Link href="/expenses" className="no-underline">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                {viewMode === 'all'
                  ? 'สรุปทุกเดือนรวมกัน (ทั้งหมด)'
                  : `สรุปรอบเดือนปัจจุบัน (${currentMonthStr})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ค่าใช้จ่ายทั้งหมด:</span>
                  <span className="font-medium text-destructive">-{displayExpenses.toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ควรได้กำไร:</span>
                  <span className="font-medium text-emerald-600">+{displayTotalMargin.toLocaleString()} บาท</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between items-baseline">
                  <span className="text-sm font-bold">ยอดเงินที่ใช้ได้วันพรุ่งนี้:</span>
                  <span className={`text-xl font-black ${displayNetProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {displayNetProfit.toLocaleString()} บาท
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>


        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {viewMode === 'all' ? 'สรุปยอดบัญชีสะสมทุกเดือน' : 'สรุปยอดบัญชีสะสมเดือนนี้'}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExtraIncomeModalOpen(true)}
              className="mt-1 h-7 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 self-start"
            >
              <Plus className="w-3 h-3" />
              เพิ่มรายรับพิเศษ
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ยอดบิลรวม (ยอดเต็ม):</span>
                <span className="font-semibold text-foreground">+{displayTotalSupply.toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ยอดจ่ายจริง (โรงงาน):</span>
                <span className="font-semibold text-destructive">-{displayActualExpense.toLocaleString()} บาท</span>
              </div>
              {displayExtraIncome > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">รายรับพิเศษ:</span>
                  <span className="font-semibold text-violet-600">+{displayExtraIncome.toLocaleString()} บาท</span>
                </div>
              )}
              <div className="border-t pt-1.5 flex justify-between items-baseline">
                <span className="text-sm font-bold">
                  {viewMode === 'all' ? 'กำไรส่วนต่างสะสมทั้งหมด:' : 'กำไรส่วนต่างสะสมเดือนนี้:'}
                </span>
                <span className="text-xl font-black text-emerald-600">
                  +{(displayMargin + displayExtraIncome).toLocaleString()} บาท
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={selectedOrderId ? 'border-emerald-200 bg-emerald-50/10' : showDaySummary ? 'border-blue-200 bg-blue-50/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between text-muted-foreground">
              <span>
                {selectedOrderId
                  ? '📋 กำลังแก้ไขใบสั่งซื้อ'
                  : showDaySummary
                  ? `📅 ยอดรวมสะสมของวันที่ ${selectedDate}`
                  : '✨ รายการที่กำลังคีย์ใหม่'}
              </span>
              {selectedOrderId && (
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={handleClearForm}>
                  <Plus className="w-3 h-3 mr-1" /> สร้างใบใหม่เพิ่ม
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {(showDaySummary ? todayTotalAmount : currentTotal).toLocaleString()}{' '}
              <span className="text-sm font-normal text-muted-foreground">บาท</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ส่วนลด:{' '}
              <span className="font-semibold text-emerald-600">
                {showDaySummary ? todayTotalMargin.toLocaleString() : currentMargin.toLocaleString()} บาท
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ยอดจ่าย :{' '}
              <span className="font-semibold text-emerald-600">
                {showDaySummary
                  ? (todayTotalAmount - todayTotalMargin).toLocaleString()
                  : (currentTotal - currentMargin).toLocaleString()}{' '}
                บาท
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ฟอร์มตารางสินค้าหลัก + ประวัติ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="border-b bg-muted/20 px-4 py-3 sm:py-4 print:hidden">
              <CardTitle className="text-sm sm:text-base flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 w-full">
                <div className="flex items-center flex-wrap gap-2 text-foreground min-w-0">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-bold tracking-tight truncate">
                    ฟอร์มจัดซื้อประจำวันที่ <span className="text-primary">{selectedDate}</span>
                  </span>
                  {selectedOrderId && (
                    <span className="text-[10px] sm:text-xs font-medium text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      แก้ไขใบเดิม
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start sm:justify-end">
                  {!isFormEmpty && (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 sm:flex-initial gap-1.5 h-8 text-xs font-medium text-muted-foreground hover:bg-muted"
                        onClick={handleClearForm}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>ย้อนกลับ</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-initial gap-1.5 h-8 text-xs font-medium shadow-sm"
                        onClick={() => setIsPreviewOpen(true)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>รีวิวบิล</span>
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto ml-0 lg:ml-1">
                    <Button
                      size="sm"
                      disabled={isSaving}
                      className="flex-1 sm:flex-initial gap-1.5 h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                      onClick={handleSaveOrder}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{selectedOrderId ? 'บันทึกการแก้ไข' : 'บันทึกใบใหม่'}</span>
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>

            {/* ตารางฟอร์มสินค้าที่ได้รับการใส่สีแยกพาสเทลตามรสชาติย่อยอย่างชัดเจน */}
            <CardContent className="p-0 overflow-x-auto print:overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b text-xs font-bold text-muted-foreground">
                    <th className="p-3 pl-4 w-1/4">รายการสินค้า</th>
                    <th className="p-3 text-center w-20">รวม</th>
                    <th className="p-3">รายละเอียดรสชาติย่อย / จำนวนสั่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {masterProducts.map((prod) => {
                    let rowTotal = 0;
                    if (prod.flavors && prod.flavors.length > 0) {
                      prod.flavors.forEach((flv: string) => {
                        rowTotal += (quantities[`${prod.id}-${flv}`] || 0);
                      });
                    } else {
                      rowTotal = quantities[`${prod.id}-total`] || 0;
                    }

                    return (
                      <tr key={prod.id} className="hover:bg-muted/10 transition-colors group">
                        {/* คอลัมน์ชื่อสินค้า */}
                        <td className="p-3 pl-4 align-middle">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {prod.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {prod.unitPrice} บาท/แพ็ค
                          </div>
                        </td>

                        {/* ยอดรวมสะสมแถว */}
                        <td className="p-3 align-middle text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-black ${rowTotal > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {rowTotal}
                          </span>
                        </td>

                        {/* กล่องใส่รสชาติย่อยพร้อมสีพาสเทลเฉพาะเจาะจง */}
                        <td className="p-3 align-middle">
                          {prod.flavors && prod.flavors.length > 0 ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-2">
                              {prod.flavors.map((flavor: string) => {
                                const colorClass = getFlavorColorClass(flavor);
                                return (
                                  <div key={flavor} className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-md shadow-sm min-w-[105px] transition-all ${colorClass}`}>
                                    <span className="text-xs font-bold truncate">{flavor}</span>
                                    <input
                                      type="number"
                                      inputMode="numeric" /* จุดที่ 1: บังคับแป้นตัวเลขบน iOS/Android */
                                      pattern="[0-9]*"    /* จุดที่ 2: ช่วยบังคับให้ปุ่มกดเป็นแป้นตัวเลขบนอุปกรณ์รุ่นเก่า */
                                      min="0"
                                      placeholder="0"
                                      value={quantities[`${prod.id}-${flavor}`] || ''}
                                      onChange={(e) =>
                                        setQuantities({
                                          ...quantities,
                                          [`${prod.id}-${flavor}`]: Math.max(0, parseInt(e.target.value) || 0),
                                        })
                                      }
                                      className="w-12 h-6 text-right bg-white dark:bg-slate-900 border border-input focus:border-primary rounded px-1 text-xs font-black text-foreground"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="numeric" /* จุดที่ 1: บังคับแป้นตัวเลขบน iOS/Android */
                              pattern="[0-9]*"    /* จุดที่ 2: ช่วยบังคับให้ปุ่มกดเป็นแป้นตัวเลขบนอุปกรณ์รุ่นเก่า */
                                min="0"
                                placeholder="0"
                                value={quantities[`${prod.id}-total`] || ''}
                                onChange={(e) =>
                                  setQuantities({
                                    ...quantities,
                                    [`${prod.id}-total`]: Math.max(0, parseInt(e.target.value) || 0),
                                  })
                                }
                                className="w-20 h-8 text-right bg-background border rounded-md px-2 text-sm font-semibold"
                              />
                              <span className="text-xs text-muted-foreground">ถุง/ชิ้น</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* ประวัติย้อนหลัง */}
        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base">รายการสั่งของย้อนหลัง</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleClearForm}>
                <Plus className="w-3.5 h-3.5 mr-1" /> คีย์ใบใหม่เพิ่ม
              </Button>
            </CardHeader>
            <CardContent className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังโหลด...
                </div>
              ) : supplyHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">ไม่มีประวัติการบันทึกจัดซื้อในคลังไฟล์</p>
              ) : (
                supplyHistory
                  .slice()
                  .reverse()
                  .map((history) => {
                    const currentExpense = history.totalOrderAmount - history.marginAmount;
                    const isCurrentEditing = selectedOrderId === history.id;
                    return (
                      <div
                        key={history.id}
                        onClick={() => handleEditOrder(history)}
                        className={`p-3 border rounded-lg space-y-2 text-xs transition-all bg-background cursor-pointer hover:border-blue-400 ${
                          isCurrentEditing ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50/5' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {history.date}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteOrder(history.id, e)}
                            disabled={isSaving}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-between text-muted-foreground border-b pb-1">
                          <span>ยอดรวม (ยอดเต็ม):</span>
                          <span className="font-semibold text-foreground">{history.totalOrderAmount.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>ส่วนลด :</span>
                          <span className="font-semibold text-emerald-600">+{history.marginAmount.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground border-b pb-1">
                          <span>ยอดจ่ายจริง (โรงงาน):</span>
                          <span className="font-semibold text-destructive">-{currentExpense.toLocaleString()} บาท</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Modal สำหรับ Add Update Delete ข้อมูล MASTER_PRODUCTS */}
      <Dialog open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6 bg-white rounded-xl">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Settings className="w-5 h-5 text-primary" /> จัดการโครงสร้างรายการสินค้าหลักของระบบ (MASTER PRODUCTS)
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ฟอร์ม เพิ่ม/แก้ไข */}
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-700 border-b pb-1.5 flex items-center justify-between">
                <span>{editingProduct ? '📝 แก้ไขข้อมูลสินค้า' : '✨ เพิ่มสินค้าหลักชิ้นใหม่'}</span>
                {editingProduct && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs p-1" onClick={openAddMasterProduct}>
                    ล้างฟอร์ม/คีย์ใหม่
                  </Button>
                )}
              </h3>
              
              <div className="space-y-1">
                <Label htmlFor="prod-name" className="text-xs font-semibold">ชื่อเรียกสินค้า</Label>
                <Input
                  id="prod-name"
                  type="text"
                  placeholder="เช่น แซนวิชโบราณ, สติ๊กเกอร์"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="h-9 bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-price" className="text-xs font-semibold">ราคาต้นทุนต่อแพ็ค/หน่วย (บาท)</Label>
                <Input
                  id="prod-price"
                  type="number"
                  placeholder="0"
                  value={prodPrice || ''}
                  onChange={(e) => setProdPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9 bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-flavors" className="text-xs font-semibold">
                  รสชาติหรือชนิดย่อย (คั่นด้วยเครื่องหมายจุลภาค `,`)
                </Label>
                <Input
                  id="prod-flavors"
                  type="text"
                  placeholder="ทุเรียน, กะทิ, ช็อค (ปล่อยว่างหากไม่มีรสชาติย่อย)"
                  value={prodFlavors}
                  onChange={(e) => setProdFlavors(e.target.value)}
                  className="h-9 bg-background"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  *ตัวอย่าง: ทุเรียน, กะทิ, ช็อค, สตอ
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1 bg-primary text-white text-xs font-semibold h-9"
                  onClick={handleSaveMasterProduct}
                >
                  {editingProduct ? 'อัปเดตการแก้ไข' : 'เพิ่มลงในฐานข้อมูล'}
                </Button>
                {editingProduct && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 text-xs font-semibold px-2"
                    onClick={() => handleDeleteMasterProduct(editingProduct.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* ตารางแสดงสินค้าปัจจุบัน */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">รายการสินค้าหลักปัจจุบัน ({masterProducts.length})</h3>
              <div className="border rounded-md divide-y max-h-[45vh] overflow-y-auto bg-background text-xs">
                {masterProducts.map((p) => (
                  <div key={p.id} className="p-2.5 flex justify-between items-center hover:bg-muted/40 group transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground font-normal">({p.unitPrice} บ.)</span>
                      </div>
                      {p.flavors && p.flavors.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.flavors.map((f: string) => (
                            <span key={f} className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-600 dark:text-slate-400">
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic mt-0.5 block">- ไม่มีรสย่อย -</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-70 group-hover:opacity-100 text-blue-600"
                      onClick={() => openEditMasterProduct(p)}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsMasterModalOpen(false)}>
              ปิดหน้าต่างจัดการ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extra Income Modal - รายรับพิเศษ */}
      <Dialog open={isExtraIncomeModalOpen} onOpenChange={setIsExtraIncomeModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-6 bg-white rounded-xl">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Plus className="w-5 h-5 text-violet-600" /> เพิ่มรายรับพิเศษ
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">เงินทุน • เงินยืม • เงินถูกหวย ที่นำเข้างบหลัก</p>
          </DialogHeader>

          {/* ฟอร์มเพิ่ม */}
          <div className="space-y-4 p-4 border rounded-lg bg-violet-50/40">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">ยอดเงิน (บาท)</Label>
              <Input
                type="number"
                placeholder="0"
                value={extraIncomeAmount}
                onChange={(e) => setExtraIncomeAmount(e.target.value)}
                className="h-9 bg-background text-right font-mono text-base font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">โน็ต / แหล่งที่มา</Label>
              <Input
                type="text"
                placeholder="เช่น เงินทุนเพิ่ม, เงินยืมพ่อ, ถูกหวยงวด 1/67"
                value={extraIncomeNote}
                onChange={(e) => setExtraIncomeNote(e.target.value)}
                className="h-9 bg-background"
              />
            </div>
            <Button
              className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-1.5 h-9 text-sm font-semibold"
              onClick={handleAddExtraIncome}
            >
              <Plus className="w-4 h-4" /> บันทึกรายรับพิเศษ
            </Button>
          </div>

          {/* รายการที่บันทึกแล้ว */}
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-bold text-slate-700">
              รายการทั้งหมด ({extraIncomeList.length} รายการ)
            </h3>
            {extraIncomeList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 italic">ยังไม่มีรายรับพิเศษ</p>
            ) : (
              <div className="border rounded-md divide-y max-h-[35vh] overflow-y-auto bg-background text-xs">
                {extraIncomeList
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className="p-3 flex justify-between items-start gap-2 hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-violet-700 font-mono">
                          +{entry.amount.toLocaleString()} บาท
                        </div>
                        <div className="text-slate-600 mt-0.5 truncate">{entry.note}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(entry.date).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={() => handleDeleteExtraIncome(entry.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
            {extraIncomeList.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t text-sm font-bold text-violet-700">
                <span>รวมรายรับพิเศษทั้งหมด:</span>
                <span>+{allExtraIncome.toLocaleString()} บาท</span>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsExtraIncomeModalOpen(false)}>
              ปิดหน้าต่าง
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-xl">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <FileText className="w-5 h-5 text-blue-600" /> รีวิวใบเสนอรายการสั่งซื้อสินค้าประจำวันที่ {selectedDate}
            </DialogTitle>
          </DialogHeader>

          <div ref={printRef} className="border rounded-lg overflow-hidden bg-slate-50 text-slate-900 text-sm">
            <div className="grid grid-cols-12 font-bold py-2.5 px-4 text-center">
              <div className="col-span-3 text-left">รายการสินค้า</div>
              <div className="col-span-1">จำนวนรวม</div>
              <div className="col-span-6"> </div>
              {/* <div className="col-span-2 text-right">ราคารวม (บาท)</div> */}
            </div>
            <div className="divide-y divide-slate-200 bg-white">
              {currentItems.map((item) => (
                <div key={item.productId} className="grid grid-cols-12 items-center py-2 px-4 hover:bg-slate-50/80 text-center">
                  <div className="col-span-3 text-left font-semibold text-slate-700">{item.productName}</div>
                  <div className="col-span-1 font-bold bg-slate-100 py-1 rounded text-slate-800">{item.totalQuantity}</div>
                  <div className="col-span-6 text-left px-3 flex flex-wrap gap-2">
                    {item.details && item.details.length > 0 ? (
                      item.details.map((det: any) => (
                        <span key={det.flavorName} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 font-medium">
                          {det.flavorName}: <strong className="text-slate-900 font-bold">{det.quantity}</strong>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">-</span>
                    )}
                  </div>
                  {/* <div className="col-span-2 text-right font-mono font-bold text-slate-800">
                    {item.totalAmount.toLocaleString()}
                  </div> */}
                </div>
              ))}
            </div>
            {/* <div className="bg-slate-900 text-white p-4 space-y-1.5 text-right font-medium">
              <div>
                <span className="text-slate-400 mr-4 text-xs">ยอดรวมทั้งสิ้น (ยอดเต็ม):</span>
                <span className="text-lg font-mono font-bold">{currentTotal.toLocaleString()} บาท</span>
              </div>
              <div className="text-emerald-400 text-xs">
                <span className="mr-4">ส่วนต่างกำไรของร้าน (20%):</span>
                <span className="font-mono font-bold">+{currentMargin.toLocaleString()} บาท</span>
              </div>
              <div className="text-rose-400 text-xs">
                <span className="mr-4">ยอดจ่ายจริงหน้าโรงงานบิลนี้:</span>
                <span className="font-mono font-bold">{(currentTotal - currentMargin).toLocaleString()} บาท</span>
              </div>
            </div> */}
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePrint}>
              <FileText className="w-4 h-4" /> บันทึกเป็นรูปภาพ (.jpg)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
