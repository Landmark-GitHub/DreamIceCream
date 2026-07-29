'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getCurrentMonth, PRODUCT_TYPE_LABELS } from '@/lib/types';
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
  RefreshCw,
  Settings2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  FlaskConical,
} from 'lucide-react';

export default function DataManagementPage() {
  const {
    bills,
    products,
    members,
    expenses,
    expenseCategories,
    settings,
    runAutoCleanup,
    updateSettings,
    resetAll,
  } = useStore();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState(getCurrentMonth());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  // Cleanup pre-download tracking
  const [monthsToDelete, setMonthsToDelete] = useState<{ bills: string[]; expenses: string[] }>({ bills: [], expenses: [] });
  const [downloadedBillMonths, setDownloadedBillMonths] = useState<Set<string>>(new Set());
  const [downloadedExpenseMonths, setDownloadedExpenseMonths] = useState<Set<string>>(new Set());

  // Get available months from bills / expenses
  const availableMonths = [...new Set(bills.map((b) => b.date.slice(0, 7)))].sort().reverse();
  const availableExpenseMonths = [...new Set(expenses.map((e) => e.date.slice(0, 7)))].sort().reverse();

  // คำนวณเดือนที่จะถูกลบเมื่อ cleanup
  const getMonthsToDelete = () => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - settings.retentionMonths);
    const cutoffMonth = cutoffDate.toISOString().slice(0, 7);
    const billMonths = [...new Set(bills.filter((b) => b.date.slice(0, 7) < cutoffMonth).map((b) => b.date.slice(0, 7)))].sort();
    const expenseMonths = [...new Set(expenses.filter((e) => e.date.slice(0, 7) < cutoffMonth).map((e) => e.date.slice(0, 7)))].sort();
    return { bills: billMonths, expenses: expenseMonths };
  };

  // ตรวจสอบว่า download ครบทุกเดือนที่จะถูกลบแล้วหรือยัง
  const allDownloaded =
    monthsToDelete.bills.every((m) => downloadedBillMonths.has(m)) &&
    monthsToDelete.expenses.every((m) => downloadedExpenseMonths.has(m));

  const hasAnythingToDelete = monthsToDelete.bills.length > 0 || monthsToDelete.expenses.length > 0;

  // Auto cleanup check on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const store = useStore.getState();
    if (store.lastCleanup !== today) {
      // Will be triggered on next interaction
    }
  }, []);

  // Helper functions
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
      case 'draft': return 'กำลังเบิก';
      case 'checkout': return 'เบิกแล้ว';
      case 'completed': return 'ปิดวันแล้ว';
      default: return status;
    }
  };

  // Improved CSV Export
  const handleExportCSV = () => {
    const filteredBills = bills.filter((b) => b.date.startsWith(selectedMonth));
    
    if (filteredBills.length === 0) {
      alert('ไม่มีข้อมูลในเดือนที่เลือก');
      return;
    }

    // CSV Header - Thai labels matching frontend display
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
      'สถานะ'
    ];
    
    const rows: string[][] = [];
    
    // Sort bills by date
    const sortedBills = [...filteredBills].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedBills.forEach((bill) => {
      let isFirstItem = true;
      
      // Group items by type for better readability
      const productTypes = Array.from(new Set(products.map(p => p.type)));
      
      productTypes.forEach((type) => {
        // Skip special types
        if (type === 'Car' || type === 'House' || type === 'D') return;
        
        const typeProducts = products.filter(p => p.type === type);
        const typeItems = bill.items.filter(item => 
          typeProducts.some(p => p.id === item.productId) && 
          (item.totalStock > 0 || item.newStock > 0)
        );
        
        if (typeItems.length === 0) return;
        
        // Calculate type totals
        const typeOldStock = typeItems.reduce((sum, i) => sum + i.oldStock, 0);
        const typeNewStock = typeItems.reduce((sum, i) => sum + i.newStock, 0);
        const typeTotalStock = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
        const typeReturned = bill.returnInputs?.[type] || 0;
        const typeSold = Math.max(0, typeTotalStock - typeReturned);
        
        // Get price based on member class
        const member = members.find(m => m.id === bill.memberId);
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
          isFirstItem ? (bill.notes || '-') : '',
          isFirstItem ? getStatusLabel(bill.status) : '',
        ]);
        
        isFirstItem = false;
      });
      
      // Add empty row between bills for readability
      if (!isFirstItem) {
        rows.push(Array(headers.length).fill(''));
      }
    });
    
    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

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
      .filter((e) => e.date.startsWith(selectedExpenseMonth))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    if (monthExpenses.length === 0) {
      alert('ไม่มีข้อมูลรายจ่ายในเดือนที่เลือก');
      return;
    }

    const headers = ['วันที่', 'หมวดหมู่', 'ไอคอน', 'จำนวนเงิน (บาท)', 'หมายเหตุ', 'เวลาบันทึก'];
    const rows = monthExpenses.map((e) => {
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
      return [
        date,
        cat?.name || 'ไม่ทราบ',
        cat?.icon || '',
        e.amount.toLocaleString(),
        e.note || '-',
        time,
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
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
    const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedExpenseMonth));
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

  // ปุ่ม test: ลบข้อมูลแบบเร็ว (ข้าม dialog พิมพ์ยืนยัน) แต่ยังคง confirm ก่อนลบเสมอ
  const handleTestReset = () => {
    const confirmed = window.confirm(
      'ทดสอบ: ต้องการล้างข้อมูลทั้งหมดเลยหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้'
    );
    if (!confirmed) return;
    resetAll();
    window.location.href = '/';
  };

  // Calculate stats
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
              <p className="text-2xl font-bold text-chart-2">{monthBills}</p>
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
            <CardDescription>ดาวน์โหลดข้อมูลเป็นไฟล์ CSV (อ่านง่าย) หรือ JSON</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกเดือน</Label>
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
                    availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExportCSV}
                disabled={availableMonths.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV (Excel)
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExportJSON}
                disabled={availableMonths.length === 0}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              * ไฟล์ CSV รองรับการเปิดด้วย Excel และแสดงข้อมูลเป็นภาษาไทยอ่านง่าย เหมือนหน้า Transaction
            </p>
          </CardContent>
        </Card>

        {/* Expenses Export Section */}
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
                    availableExpenseMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </SelectItem>
                    ))
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
          <CardContent className="space-y-2">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowResetConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              ล้างข้อมูลทั้งหมด
            </Button>
            <Button
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={handleTestReset}
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              test (ลบเร็ว มี confirm)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup Confirmation — บังคับ download ก่อน */}
      <AlertDialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              รัน Cleanup — ต้อง Download ก่อน
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!hasAnythingToDelete
                ? 'ไม่มีข้อมูลเก่าที่ต้องลบในขณะนี้'
                : `ข้อมูลด้านล่างจะถูกลบถาวร ต้อง Download CSV ทุกเดือนให้ครบก่อนจึงจะกด Cleanup ได้`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {hasAnythingToDelete && (
            <div className="space-y-3 py-2 max-h-72 overflow-y-auto">
              {/* บิลที่จะถูกลบ */}
              {monthsToDelete.bills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ข้อมูลบิล</p>
                  {monthsToDelete.bills.map((month) => {
                    const done = downloadedBillMonths.has(month);
                    return (
                      <div key={month} className={`flex items-center justify-between p-2 rounded-lg border ${done ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-muted/40'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{done ? '✅' : '📄'}</span>
                          <span className="text-sm font-medium">
                            {new Date(month + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={done ? 'ghost' : 'outline'}
                          className="h-7 text-xs"
                          onClick={() => handleCleanupExportBillsCSV(month)}
                        >
                          <FileSpreadsheet className="w-3 h-3 mr-1" />
                          {done ? 'Downloaded' : 'Download CSV'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* รายจ่ายที่จะถูกลบ */}
              {monthsToDelete.expenses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">รายจ่าย</p>
                  {monthsToDelete.expenses.map((month) => {
                    const done = downloadedExpenseMonths.has(month);
                    return (
                      <div key={month} className={`flex items-center justify-between p-2 rounded-lg border ${done ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-muted/40'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{done ? '✅' : '💰'}</span>
                          <span className="text-sm font-medium">
                            {new Date(month + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={done ? 'ghost' : 'outline'}
                          className="h-7 text-xs"
                          onClick={() => handleCleanupExportExpensesCSV(month)}
                        >
                          <FileSpreadsheet className="w-3 h-3 mr-1" />
                          {done ? 'Downloaded' : 'Download CSV'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Progress */}
              <div className={`text-center text-xs py-1 rounded-md ${allDownloaded ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
                {allDownloaded
                  ? '✅ Download ครบแล้ว — พร้อม Cleanup'
                  : `⬇️ Download ให้ครบก่อน จึงจะกด Cleanup ได้`}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRunCleanup}
              disabled={hasAnythingToDelete && !allDownloaded}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              ยืนยัน Cleanup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
