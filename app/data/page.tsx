'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getCurrentMonth, PRODUCT_TYPE_LABELS } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  Download,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  Image as ImageIcon,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import { BatchExportJPGDialog } from '@/components/data/batch-export-dialog';

export default function DataManagementPage() {
  const {
    bills,
    products,
    members,
    expenses,
    expenseCategories,
    settings,
    updateSettings,
    runAutoCleanup,
    resetAll,
  } = useStore();

  const getMonthsToDelete = () => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - settings.retentionMonths);
    const cutoffMonth = cutoffDate.toISOString().slice(0, 7);
    const billsToDelete = [...new Set(bills.filter(b => b.date.slice(0, 7) < cutoffMonth).map(b => b.date.slice(0, 7)))];
    const expensesToDelete = [...new Set(expenses.filter(e => e.date.slice(0, 7) < cutoffMonth).map(e => e.date.slice(0, 7)))];
    return { bills: billsToDelete, expenses: expensesToDelete };
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState(getCurrentMonth());
  const [selectedSupplyMonth, setSelectedSupplyMonth] = useState(getCurrentMonth());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        setSupplyOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load supply orders:', err);
      }
    };
    fetchOrders();
  }, []);

  // Cleanup pre-download tracking
  const [monthsToDelete, setMonthsToDelete] = useState<{ bills: string[]; expenses: string[] }>({ bills: [], expenses: [] });
  const [downloadedBillMonths, setDownloadedBillMonths] = useState<Set<string>>(new Set());
  const [downloadedExpenseMonths, setDownloadedExpenseMonths] = useState<Set<string>>(new Set());

    // ตรวจสอบว่า download ครบทุกเดือนที่จะถูกลบแล้วหรือยัง
  const allDownloaded =
    monthsToDelete.bills.every((m) => downloadedBillMonths.has(m)) &&
    monthsToDelete.expenses.every((m) => downloadedExpenseMonths.has(m));

  const hasAnythingToDelete = monthsToDelete.bills.length > 0 || monthsToDelete.expenses.length > 0;

  // Get available months from bills & expenses
  const availableMonths = [...new Set(bills.map((b) => b.date.slice(0, 7)))].sort().reverse();
  const availableExpenseMonths = [...new Set(expenses.map((e) => e.date.slice(0, 7)))].sort().reverse();
  const availableSupplyMonths = [...new Set(supplyOrders.map((o) => o.date.slice(0, 7)))].sort().reverse();

  
  
  const formatDateThai = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'กำลังเบิก';
      case 'checkout':
        return 'เบิกแล้ว';
      case 'completed':
        return 'ปิดวันแล้ว';
      default:
        return status;
    }
  };
  const handleExportCSV = () => {
    const filteredBills = selectedMonth === 'all' ? bills : bills.filter((b) => b.date.startsWith(selectedMonth));
    if (filteredBills.length === 0) {
      alert('ไม่มีข้อมูลในเดือนที่เลือก');
      return;
    }

    const headers = [
      'วันที่',
      'ชื่อสมาชิก',
      'ประเภทสินค้า',
      'ยอดเก่า',
      'ยอดใหม่ (เบิก)',
      'ยอดรวม',
      'ยอดเหลือคืน',
      'ยอดขาย',
      'ราคา/ชิ้น',
      'มูลค่าขาย (บาท)',
      'ค่าน้ำแข็ง (บาท)',
      'ยอดขายรวม (บาท)',
      'จ่ายแล้ว (บาท)',
      'ค้างเก่า (บาท)',
      'ค้างชำระ (บาท)',
      'หมายเหตุ',
      'สถานะ',
    ];

    const rows: string[][] = [];
    const sortedBills = [...filteredBills].sort((a, b) => b.date.localeCompare(a.date));

    sortedBills.forEach((bill) => {
      let isFirstItem = true;
      const productTypes = Array.from(new Set(products.map((p) => p.type)));

      productTypes.forEach((type) => {
        if (type === 'Car' || type === 'House' || type === 'D') return;
        const typeProducts = products.filter((p) => p.type === type);
        const typeItems = bill.items.filter(
          (item) =>
            typeProducts.some((p) => p.id === item.productId) &&
            (item.totalStock > 0 || item.newStock > 0)
        );

        if (typeItems.length === 0) return;

        const typeOldStock = typeItems.reduce((sum, i) => sum + (i.oldStock || 0), 0);
        const typeNewStock = typeItems.reduce((sum, i) => sum + (i.newStock || 0), 0);
        const typeTotalStock = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
        const typeReturned = bill.returnInputs?.[type] || 0;
        const typeSold = Math.max(0, typeTotalStock - typeReturned);

        const member = members.find((m) => m.id === bill.memberId);
        const memberClass = member?.class ?? 'In';
        const baseProduct = typeProducts[0];
        let price = 0;
        if (memberClass === 'Out') price = baseProduct?.priceOut || 0;
        else if (memberClass === 'WalkIn') price = baseProduct?.priceWalkIn || 0;
        else price = baseProduct?.priceIn || 0;

        const typeSubtotal = typeSold * price;
        const typeName = PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;

        rows.push([
          isFirstItem ? formatDateThai(bill.date) : '',
          isFirstItem ? bill.memberName : '',
          typeName,
          typeOldStock.toString(),
          typeNewStock.toString(),
          typeTotalStock.toString(),
          typeReturned.toString(),
          typeSold.toString(),
          price.toString(),
          typeSubtotal.toLocaleString(),
          isFirstItem ? (bill.icePrice || 0).toLocaleString() : '',
          isFirstItem ? Math.round(bill.totalSales).toLocaleString() : '',
          isFirstItem ? Math.round(bill.amountPaid).toLocaleString() : '',
          isFirstItem ? Math.round(bill.previousOwed || 0).toLocaleString() : '',
          isFirstItem ? Math.round(bill.amountOwed).toLocaleString() : '',
          isFirstItem ? bill.notes || '-' : '',
          isFirstItem ? getStatusLabel(bill.status) : '',
        ]);

        isFirstItem = false;
      });

      if (!isFirstItem) {
        rows.push(Array(headers.length).fill(''));
      }
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join(
      '\n'
    );
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-icecream-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const handleExportJSON = () => {
    const state = useStore.getState();
    const dataStr = JSON.stringify(
      {
        members: state.members,
        products: state.products,
        bills: state.bills.filter((b) => b.date.startsWith(selectedMonth)),
        expenses: state.expenses.filter((e) => e.date.startsWith(selectedMonth)),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-icecream-${selectedMonth}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const handleExportExpensesCSV = () => {
    const monthExpenses = expenses
      .filter((e) => selectedExpenseMonth === 'all' || e.date.startsWith(selectedExpenseMonth))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    if (monthExpenses.length === 0) {
      alert('ไม่มีข้อมูลรายจ่ายในเดือนที่เลือก');
      return;
    }

    const sumTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const headers = ['วันที่', 'หมวดหมู่', 'ไอคอน', 'จำนวนเงิน (บาท)', 'หมายเหตุ', 'เวลาบันทึก'];
    const rows: string[][] = [];

    // Summary at the top
    rows.push(['สรุปผลรวม', '', '', '', '', '']);
    rows.push(['SUM ยอดรวม', sumTotal.toLocaleString(), '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push(headers);

    monthExpenses.forEach((e) => {
      const cat = expenseCategories.find((c) => c.id === e.categoryId);
      const date = new Date(e.date + 'T00:00:00').toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
      const time = new Date(e.createdAt).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      rows.push([
        date,
        cat?.name || 'ไม่ทราบ',
        cat?.icon || '',
        e.amount.toLocaleString(), // Use toString() for CSV to avoid commas confusing Excel, though we quote it. Let's stick to simple string
        e.note || '-',
        time,
      ]);
    });

    // Empty row and summary at the bottom
    rows.push(Array(headers.length).fill(''));
    rows.push(['', '', 'รวมทั้งหมด', sumTotal.toLocaleString(), '', '']);

    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${selectedExpenseMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExpensesJSON = () => {
    const monthExpenses = selectedExpenseMonth === 'all' ? expenses : expenses.filter((e) => e.date.startsWith(selectedExpenseMonth));
    if (monthExpenses.length === 0) {
      alert('ไม่มีข้อมูลรายจ่ายในเดือนที่เลือก');
      return;
    }

    const dataStr = JSON.stringify(
      {
        expenseCategories,
        expenses: monthExpenses,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${selectedExpenseMonth}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const handleExportSupplyCSV = () => {
    const monthOrders = supplyOrders
      .filter((o) => selectedSupplyMonth === 'all' || o.date.startsWith(selectedSupplyMonth))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (monthOrders.length === 0) {
      alert('ไม่มีข้อมูลใบสั่งของในเดือนที่เลือก');
      return;
    }

    let sumTotal = 0;
    let sumPay = 0;
    let sumMargin = 0;

    monthOrders.forEach((o) => {
      sumTotal += o.totalOrderAmount || 0;
      sumMargin += o.marginAmount || 0;
      sumPay += (o.totalOrderAmount || 0) - (o.marginAmount || 0);
    });

    const headers = ['วันที่', 'รหัสใบสั่ง', 'สินค้า', 'รสชาติ/แบบ', 'จำนวน', 'ราคา/หน่วย (บาท)', 'ยอดรวม (บาท)'];
    const rows: string[][] = [];
    
    // Summary at the top
    rows.push(['สรุปผลรวม', '', '', '', '', '', '']);
    rows.push(['SUM ยอดรวม', sumTotal.toLocaleString(), 'SUM จ่าย', sumPay.toLocaleString(), 'SUM ส่วนต่าง', sumMargin.toLocaleString(), '']);
    rows.push(['', '', '', '', '', '', '']);
    rows.push(headers);

    monthOrders.forEach((order) => {
      let isFirstItem = true;
      order.items.forEach((item: any) => {
        if (item.details && item.details.length > 0) {
          item.details.forEach((detail: any, index: number) => {
            rows.push([
              isFirstItem && index === 0 ? formatDateThai(order.date) : '',
              isFirstItem && index === 0 ? order.id : '',
              index === 0 ? item.productName : '',
              detail.flavorName,
              detail.quantity.toString(),
              index === 0 ? item.unitPrice.toLocaleString() : '',
              index === 0 ? item.totalAmount.toLocaleString() : '',
            ]);
          });
        } else {
          rows.push([
            isFirstItem ? formatDateThai(order.date) : '',
            isFirstItem ? order.id : '',
            item.productName,
            '-',
            item.totalQuantity.toString(),
            item.unitPrice.toLocaleString(),
            item.totalAmount.toLocaleString(),
          ]);
        }
        isFirstItem = false;
      });
      
      const orderTotal = order.totalOrderAmount || 0;
      const orderMargin = order.marginAmount || 0;
      const orderPay = orderTotal - orderMargin;

      rows.push(['', '', '', '', '', 'รวม', orderTotal.toLocaleString()]);
      rows.push(['', '', '', '', '', 'ส่วนต่าง', orderMargin.toLocaleString()]);
      rows.push(['', '', '', '', '', 'จ่าย', orderPay.toLocaleString()]);
      rows.push(Array(headers.length).fill(''));
    });

    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supply-${selectedSupplyMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportSupplyJSON = () => {
    const monthOrders = selectedSupplyMonth === 'all' ? supplyOrders : supplyOrders.filter((o) => o.date.startsWith(selectedSupplyMonth));
    if (monthOrders.length === 0) {
      alert('ไม่มีข้อมูลใบสั่งของในเดือนที่เลือก');
      return;
    }

    const dataStr = JSON.stringify(
      {
        supplyOrders: monthOrders,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supply-${selectedSupplyMonth}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // เปิด dialog cleanup พร้อมคำนวณเดือนที่จะถูกลบ และ reset สถานะ download
  const handleOpenCleanupDialog = () => {
    const toDelete = getMonthsToDelete();
    setMonthsToDelete(toDelete);
    setDownloadedBillMonths(new Set());
    setDownloadedExpenseMonths(new Set());
    setShowCleanupConfirm(true);
  };

  const handleRunCleanup = () => {
    runAutoCleanup();
    setShowCleanupConfirm(false);
    setDownloadedBillMonths(new Set());
    setDownloadedExpenseMonths(new Set());
  };

  // export CSV บิลของเดือนที่จะถูกลบ และ mark ว่า download แล้ว
  const handleCleanupExportBillsCSV = (month: string) => {
    const filteredBills = bills.filter((b) => b.date.startsWith(month));
    if (filteredBills.length === 0) return;

    const headers = ['วันที่','ชื่อสมาชิก','ประเภทสินค้า','ยอดเก่า','ยอดใหม่ (เบิก)','ยอดรวม','ยอดเหลือคืน','ยอดขาย','ราคา/ชิ้น','มูลค่าขาย (บาท)','ค่าน้ำแข็ง (บาท)','ยอดขายรวม (บาท)','จ่ายแล้ว (บาท)','ค้างเก่า (บาท)','ค้างชำระ (บาท)','หมายเหตุ','สถานะ'];
    const rows: string[][] = [];
    const sortedBills = [...filteredBills].sort((a, b) => a.date.localeCompare(b.date));

    sortedBills.forEach((bill) => {
      let isFirstItem = true;
      const productTypes = Array.from(new Set(products.map((p) => p.type)));
      productTypes.forEach((type) => {
        if (type === 'Car' || type === 'House' || type === 'D') return;
        const typeProducts = products.filter((p) => p.type === type);
        const typeItems = bill.items.filter((item) => typeProducts.some((p) => p.id === item.productId) && (item.totalStock > 0 || item.newStock > 0));
        if (typeItems.length === 0) return;
        const typeOldStock = typeItems.reduce((sum, i) => sum + i.oldStock, 0);
        const typeNewStock = typeItems.reduce((sum, i) => sum + i.newStock, 0);
        const typeTotalStock = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
        const typeReturned = bill.returnInputs?.[type] || 0;
        const typeSold = Math.max(0, typeTotalStock - typeReturned);
        const member = members.find((m) => m.id === bill.memberId);
        const memberClass = member?.class ?? 'In';
        const baseProduct = typeProducts[0];
        let price = 0;
        if (memberClass === 'Out') price = baseProduct?.priceOut || 0;
        else if (memberClass === 'WalkIn') price = baseProduct?.priceWalkIn || 0;
        else price = baseProduct?.priceIn || 0;
        const typeSubtotal = typeSold * price;
        const typeName = PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type;
        rows.push([
          isFirstItem ? formatDateThai(bill.date) : '',
          isFirstItem ? bill.memberName : '',
          typeName,
          typeOldStock.toString(), typeNewStock.toString(), typeTotalStock.toString(),
          typeReturned.toString(), typeSold.toString(), price.toString(), typeSubtotal.toLocaleString(),
          isFirstItem ? (bill.icePrice || 0).toLocaleString() : '',
          isFirstItem ? Math.round(bill.totalSales).toLocaleString() : '',
          isFirstItem ? Math.round(bill.amountPaid).toLocaleString() : '',
          isFirstItem ? Math.round(bill.previousOwed || 0).toLocaleString() : '',
          isFirstItem ? Math.round(bill.amountOwed).toLocaleString() : '',
          isFirstItem ? (bill.notes || '-') : '',
          isFirstItem ? getStatusLabel(bill.status) : '',
        ]);
        isFirstItem = false;
      });
      if (!isFirstItem) rows.push(Array(headers.length).fill(''));
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-icecream-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedBillMonths((prev) => new Set([...prev, month]));
  };

  // export CSV รายจ่ายของเดือนที่จะถูกลบ และ mark ว่า download แล้ว
  const handleCleanupExportExpensesCSV = (month: string) => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
    if (monthExpenses.length === 0) {
      setDownloadedExpenseMonths((prev) => new Set([...prev, month]));
      return;
    }

    const headers = ['วันที่', 'หมวดหมู่', 'ไอคอน', 'จำนวนเงิน (บาท)', 'หมายเหตุ', 'เวลาบันทึก'];
    const rows = monthExpenses.map((e) => {
      const cat = expenseCategories.find((c) => c.id === e.categoryId);
      const date = new Date(e.date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
      const time = new Date(e.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return [date, cat?.name || 'ไม่ทราบ', cat?.icon || '', e.amount.toLocaleString(), e.note || '-', time];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedExpenseMonths((prev) => new Set([...prev, month]));
  };
  const handleReset = () => {
    if (confirmText === 'ลบข้อมูล') {
      resetAll();
      setShowResetConfirm(false);
      setConfirmText('');
      window.location.href = '/';
    }
  };

  const totalBills = bills.length;
  const monthBills = bills.filter((b) => b.date.startsWith(selectedMonth)).length;
  const totalSales = bills.reduce((sum, b) => sum + b.totalSales, 0);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-bold text-foreground">จัดการข้อมูล</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สถิติข้อมูล</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{totalBills}</p>
              <p className="text-xs text-muted-foreground">บิลทั้งหมด</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{monthBills}</p>
              <p className="text-xs text-muted-foreground">บิลเดือนนี้</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalSales.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">ยอดขายรวม (บาท)</p>
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4" />
              ส่งออกข้อมูล
            </CardTitle>
            <CardDescription>
              ดาวน์โหลดข้อมูลเป็นไฟล์ CSV (อ่านง่ายบน Excel), JSON หรือรูปภาพบิล (JPG)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกเดือนที่ต้องการส่งออก</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเดือน" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.length === 0 ? (
                    <SelectItem value={getCurrentMonth()} disabled>
                      ไม่มีข้อมูล
                    </SelectItem>
                  ) : (
                    [<SelectItem key="all" value="all">ทั้งหมด</SelectItem>, ...availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </SelectItem>
                    ))]
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={availableMonths.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV (Excel)
              </Button>
              <Button
                variant="outline"
                onClick={handleExportJSON}
                disabled={availableMonths.length === 0}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>

            <Button
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white gap-2"
              onClick={() => setShowBatchExport(true)}
            >
              <ImageIcon className="w-4 h-4" />
              ดูและบันทึกบิลล่าสุดของสมาชิกทุกคน (JPG)
            </Button>

            <p className="text-xs text-muted-foreground">
              * ไฟล์ CSV รองรับการเปิดด้วย Excel ภาษาไทย และมีการแยกยอดยกมา (เก่า) และยอดเบิกเพิ่ม (ใหม่) ครบถ้วน
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4" />
              ส่งออกรายจ่าย (expenses.json)
            </CardTitle>
            <CardDescription>
              ดาวน์โหลดข้อมูลรายจ่ายเป็นไฟล์ CSV หรือ JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกเดือน</Label>
              <Select value={selectedExpenseMonth} onValueChange={setSelectedExpenseMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเดือน" />
                </SelectTrigger>
                <SelectContent>
                  {availableExpenseMonths.length === 0 ? (
                    <SelectItem value={getCurrentMonth()} disabled>
                      ไม่มีข้อมูล
                    </SelectItem>
                  ) : (
                    [<SelectItem key="all" value="all">ทั้งหมด</SelectItem>, ...availableExpenseMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </SelectItem>
                    ))]
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExportExpensesCSV}
                disabled={availableExpenseMonths.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV (Excel)
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExportExpensesJSON}
                disabled={availableExpenseMonths.length === 0}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              * ข้อมูลรายจ่ายบันทึกแยกใน expenses.json ไม่รวมกับ store.json
            </p>
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4" />
              ส่งออกใบสั่งของ (supply.json)
            </CardTitle>
            <CardDescription>
              ดาวน์โหลดข้อมูลใบสั่งของเป็นไฟล์ CSV หรือ JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกเดือน</Label>
              <Select value={selectedSupplyMonth} onValueChange={setSelectedSupplyMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเดือน" />
                </SelectTrigger>
                <SelectContent>
                  {availableSupplyMonths.length === 0 ? (
                    <SelectItem value={getCurrentMonth()} disabled>
                      ไม่มีข้อมูล
                    </SelectItem>
                  ) : (
                    [<SelectItem key="all" value="all">ทั้งหมด</SelectItem>, ...availableSupplyMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </SelectItem>
                    ))]
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExportSupplyCSV}
                disabled={availableSupplyMonths.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV (Excel)
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExportSupplyJSON}
                disabled={availableSupplyMonths.length === 0}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              * ข้อมูลใบสั่งของบันทึกแยกใน Firestore (orders)
            </p>
          </CardContent>
        </Card>

        {/* Retention Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              การเก็บข้อมูล
            </CardTitle>
            <CardDescription>
              ตั้งค่าการลบข้อมูลอัตโนมัติ (เก็บข้อมูล N เดือน)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>จำนวนเดือนที่เก็บข้อมูล</Label>
              <Select
                value={settings.retentionMonths.toString()}
                onValueChange={(v) => updateSettings({ retentionMonths: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 เดือน</SelectItem>
                  <SelectItem value="2">2 เดือน</SelectItem>
                  <SelectItem value="3">3 เดือน (แนะนำ)</SelectItem>
                  <SelectItem value="6">6 เดือน</SelectItem>
                  <SelectItem value="12">12 เดือน</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ข้อมูลที่เก่ากว่า {settings.retentionMonths} เดือนจะถูกลบอัตโนมัติ
                และบันทึกสรุปไว้ในระบบ
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleOpenCleanupDialog}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              รัน Cleanup ตอนนี้
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              โซนอันตราย
            </CardTitle>
            <CardDescription>การกระทำเหล่านี้ไม่สามารถย้อนกลับได้</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowResetConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              ล้างข้อมูลทั้งหมด
            </Button>
          </CardContent>
        </Card>
      </div>

      <BatchExportJPGDialog open={showBatchExport} onOpenChange={setShowBatchExport} />

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบข้อมูล</AlertDialogTitle>
            <AlertDialogDescription>
              การกระทำนี้จะลบข้อมูลทั้งหมดอย่างถาวร ไม่สามารถกู้คืนได้
              <br />
              พิมพ์ <strong>&quot;ลบข้อมูล&quot;</strong> เพื่อยืนยัน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='พิมพ์ "ลบข้อมูล"'
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmText !== 'ลบข้อมูล'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ล้างข้อมูลทั้งหมด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}