'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { PRODUCT_TYPE_LABELS, getProductPrice } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Calendar, Users, TrendingUp, Package, CreditCard, Edit3, Unlock, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TabType = 'transaction' | 'typeSummary' | 'payment';
type ViewModeType = 'daily' | 'monthly';

interface EditModalState {
  isOpen: boolean;
  billId: string;
  memberName: string;
  amountPaid: number;
}

export default function TransactionPage() {
  const bills = useStore((s) => s.bills);
  const allProducts = useStore((s) => s.products);
  const members = useStore((s) => s.members);
  
  const updateBill = useStore((s) => s.updateBill);

  const handleRevertBillStatus = (billId: string, memberName: string) => {
    const confirmRevert = window.confirm(
      `คุณแน่ใจหรือไม่ที่จะ "ปลดล็อกบิล" ของ "${memberName}"?\n(บิลจะถูกเปลี่ยนสถานะกลับไปเป็น 'กำลังเบิก/ร่าง' เพื่อให้แก้ไขข้อมูลใหม่ได้)`
    );
    
    if (confirmRevert) {
      updateBill(billId, { status: 'draft' });
      alert(`ปลดล็อกบิลของ ${memberName} สำเร็จแล้ว!`);
    }
  };

  // --- States ---
  const [viewMode, setViewMode] = useState<ViewModeType>('daily');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all'); // 1. ตัวเลือกบุคคลหลัก
  const [selectedDate, setSelectedDate] = useState<string>('');             // 2. ตัวเลือกวัน (จะเปลี่ยนไปตามบุคคลที่เลือก)
  const [selectedMonth, setSelectedMonth] = useState<string>('');           // 2. ตัวเลือกเดือน (จะเปลี่ยนไปตามบุคคลที่เลือก)
  const [activeTab, setActiveTab] = useState<TabType>('transaction');

  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    billId: '',
    memberName: '',
    amountPaid: 0,
  });

  // --- 1. ดึงรายชื่อสมาชิกทุกคนที่มีบิลในระบบขึ้นมาก่อน ---
  const allMembersWithBills = useMemo(() => {
    const uniqueMembers = Array.from(new Set(bills.map((b) => b.memberId)));
    return uniqueMembers.map((mId) => {
      const match = members.find((m) => m.id === mId);
      return {
        id: mId,
        name: match ? match.name : bills.find((b) => b.memberId === mId)?.memberName || 'ไม่ระบุชื่อ',
      };
    });
  }, [bills, members]);

  // --- 2. คัดเลือก "วัน/เดือน" ที่มีอยู่จริง "เฉพาะของบุคคลที่เลือก" ---
  const availableDatesAndMonths = useMemo(() => {
    // กรองบิลเอาเฉพาะของคนที่เลือก (ถ้าเลือก 'all' ก็เอาของทุกคน)
    const targetBills = selectedMemberId === 'all' 
      ? bills 
      : bills.filter((b) => b.memberId === selectedMemberId);

    // ดึงเฉพาะวันที่และเดือนที่มีบิลจริง ๆ ออกมาทำเป็นรายการแบบไม่ซ้ำ (Unique)
    const uniqueDates = Array.from(new Set(targetBills.map((b) => b.date))).sort((a, b) => b.localeCompare(a));
    const uniqueMonths = Array.from(new Set(targetBills.map((b) => b.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a));

    return { dates: uniqueDates, months: uniqueMonths };
  }, [bills, selectedMemberId]);

  // --- 3. ผลักดันให้ตัวเลือกเวลาอัปเดตเป็นค่าล่าสุดที่มีเสมอเมื่อผู้ใช้เปลี่ยนบุคคลหรือโหมดเวลา ---
  useEffect(() => {
    if (viewMode === 'daily') {
      if (availableDatesAndMonths.dates.length > 0) {
        // ถ้าวันเดิมที่เคยเลือกไว้ ไม่มีในของคนใหม่ ให้สลับไปใช้วันล่าสุดที่มีของคนนั้นแทน
        if (!availableDatesAndMonths.dates.includes(selectedDate)) {
          setSelectedDate(availableDatesAndMonths.dates[0]);
        }
      } else {
        setSelectedDate('');
      }
    } else {
      if (availableDatesAndMonths.months.length > 0) {
        // ถ้าเดือนเดิมที่เคยเลือกไว้ ไม่มีในของคนใหม่ ให้สลับไปใช้เดือนล่าสุดที่มีของคนนั้นแทน
        if (!availableDatesAndMonths.months.includes(selectedMonth)) {
          setSelectedMonth(availableDatesAndMonths.months[0]);
        }
      } else {
        setSelectedMonth('');
      }
    }
  }, [selectedMemberId, viewMode, availableDatesAndMonths]);

  // --- 4. การแสดงผล (Filtering Bills) ---
  const filteredBills = useMemo(() => {
    // กรองบุคคลก่อน
    let result = bills;
    if (selectedMemberId !== 'all') {
      result = result.filter((bill) => bill.memberId === selectedMemberId);
    }
    // กรองวัน/เดือนที่มีอยู่จริงตามที่ผู้ใช้เลือกจาก Dropdown
    return result.filter((bill) => 
      viewMode === 'daily' ? bill.date === selectedDate : bill.date.startsWith(selectedMonth)
    );
  }, [bills, selectedMemberId, viewMode, selectedDate, selectedMonth]);

  const summary = useMemo(() => {
    return filteredBills.reduce(
      (acc, bill) => {
        acc.totalSales += bill.totalSales || 0;
        acc.totalPaid += bill.amountPaid || 0;
        acc.totalOwed += bill.amountOwed || 0;
        if (bill.status === 'draft' || !bill.status) {
          acc.draftCount += 1;
        }
        return acc;
      },
      { totalSales: 0, totalPaid: 0, totalOwed: 0, draftCount: 0 }
    );
  }, [filteredBills]);

  const recordSummaryByType = useMemo(() => {
    const result: Array<{
      memberName: string;
      date: string;
      type: string;
      typeName: string;
      oldStock: number;
      newStock: number;
      totalStock: number;
      returned: number;
      sold: number;
      netPrice: number;
    }> = [];

    const distinctTypes = Array.from(
      new Set(allProducts.filter((p) => p.type !== 'Car' && p.type !== 'House' && p.type !== 'D').map((p) => p.type))
    );

    if (viewMode === 'daily') {
      filteredBills.forEach((bill) => {
        const member = members.find((m) => m.id === bill.memberId);
        const memberClass = member?.class ?? 'In';

        distinctTypes.forEach((type) => {
          const typeProducts = allProducts.filter((p) => p.type === type);
          const typeItems = bill.items.filter((item) => typeProducts.some((p) => p.id === item.productId));

          const oldStockGroup = typeItems.reduce((sum, i) => sum + (i.oldStock || 0), 0);
          const newStockGroup = typeItems.reduce((sum, i) => sum + (i.newStock || 0), 0);
          const totalStockGroup = typeItems.reduce((sum, i) => sum + (i.totalStock || 0), 0);
          
          const returnedGroup = bill.returnInputs?.[type] || 0;
          const soldGroup = Math.max(0, totalStockGroup - returnedGroup);

          const baseProduct = typeProducts[0];
          const price = baseProduct ? getProductPrice(baseProduct, memberClass) : 0;
          const netPrice = soldGroup * price;

          if (totalStockGroup > 0 || soldGroup > 0) {
            result.push({
              memberName: bill.memberName,
              date: bill.date,
              type,
              typeName: PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type,
              oldStock: oldStockGroup,
              newStock: newStockGroup,
              totalStock: totalStockGroup,
              returned: returnedGroup,
              sold: soldGroup,
              netPrice,
            });
          }
        });
      });
    } else {
      distinctTypes.forEach((type) => {
        let totalOld = 0;
        let totalNew = 0;
        let totalStock = 0;
        let totalReturned = 0;
        let totalSold = 0;
        let totalNetPrice = 0;

        filteredBills.forEach((bill) => {
          const member = members.find((m) => m.id === bill.memberId);
          const memberClass = member?.class ?? 'In';
          const typeProducts = allProducts.filter((p) => p.type === type);
          const typeItems = bill.items.filter((item) => typeProducts.some((p) => p.id === item.productId));

          totalOld += typeItems.reduce((sum, i) => sum + (i.oldStock || 0), 0);
          totalNew += typeItems.reduce((sum, i) => sum + (i.newStock || 0), 0);
          totalStock += typeItems.reduce((sum, i) => sum + (i.totalStock || 0), 0);
          
          const returned = bill.returnInputs?.[type] || 0;
          totalReturned += returned;
          
          const sold = Math.max(0, typeItems.reduce((sum, i) => sum + (i.totalStock || 0), 0) - returned);
          totalSold += sold;

          const baseProduct = typeProducts[0];
          const price = baseProduct ? getProductPrice(baseProduct, memberClass) : 0;
          totalNetPrice += sold * price;
        });

        if (totalStock > 0 || totalSold > 0) {
          result.push({
            memberName: selectedMemberId === 'all' ? 'ทุกคนรวมกัน' : (members.find(m => m.id === selectedMemberId)?.name || 'ไม่ระบุชื่อ'),
            date: selectedMonth,
            type,
            typeName: PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] || type,
            oldStock: totalOld,
            newStock: totalNew,
            totalStock,
            returned: totalReturned,
            sold: totalSold,
            netPrice: totalNetPrice,
          });
        }
      });
    }

    return result;
  }, [filteredBills, allProducts, members, viewMode, selectedMonth, selectedMemberId]);

  const openEditModal = (billId: string, memberName: string, currentPaid: number) => {
    setEditModal({ isOpen: true, billId, memberName, amountPaid: currentPaid });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBill(editModal.billId, { amountPaid: Number(editModal.amountPaid) });
    setEditModal((prev) => ({ ...prev, isOpen: false }));
  };

  const formatDateThai = (dateStr: string) => {
    if (!dateStr) return 'ไม่ได้เลือกวันที่';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatMonthThai = (monthStr: string) => {
    if (!monthStr) return 'ไม่ได้เลือกเดือน';
    const date = new Date(monthStr + '-02T00:00:00');
    return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/ ">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-foreground">
                {viewMode === 'daily' ? 'บันทึกรายวัน' : 'สรุปรายเดือน'}
              </h1>
              <p className="text-xs text-muted-foreground">ตรวจสอบข้อมูลเบิกคลัง & สรุปยอด</p>
            </div>
          </div>

          {/* ปุ่มสลับโหมด รายวัน / รายเดือน */}
          <div className="flex bg-muted p-1 rounded-xl border">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'daily' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              รายวัน
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              รายเดือน
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card p-4 rounded-2xl border shadow-sm">
          
          {/* ตัวเลือกบุคคลเป็นหลัก */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
              <Users className="w-3 h-3" /> เลือกสมาชิกก่อน
            </Label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm h-10 cursor-pointer"
            >
              <option value="all">ทุกคน ({allMembersWithBills.length} คน)</option>
              {allMembersWithBills.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>

          {/* ตัวเลือกโหมดเวลาที่จะโชว์ "เฉพาะวัน/เดือน" ที่มีบิลของคนคนนั้นจริง ๆ */}
          <div>
            {viewMode === 'daily' ? (
              <>
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                  <Calendar className="w-3 h-3" /> เลือกวันที่ (เฉพาะที่มีบิล)
                </Label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={availableDatesAndMonths.dates.length === 0}
                  className="w-full border rounded-xl px-3 py-2 bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm h-10 cursor-pointer disabled:opacity-50"
                >
                  {availableDatesAndMonths.dates.length === 0 ? (
                    <option value="">ไม่มีข้อมูลบิลรายวัน</option>
                  ) : (
                    availableDatesAndMonths.dates.map((dateStr) => (
                      <option key={dateStr} value={dateStr}>
                        {dateStr} ({formatDateThai(dateStr)})
                      </option>
                    ))
                  )}
                </select>
              </>
            ) : (
              <>
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                  <Calendar className="w-3 h-3" /> เลือกเดือน (เฉพาะที่มีบิล)
                </Label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={availableDatesAndMonths.months.length === 0}
                  className="w-full border rounded-xl px-3 py-2 bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm h-10 cursor-pointer disabled:opacity-50"
                >
                  {availableDatesAndMonths.months.length === 0 ? (
                    <option value="">ไม่มีข้อมูลบิลรายเดือน</option>
                  ) : (
                    availableDatesAndMonths.months.map((monthStr) => (
                      <option key={monthStr} value={monthStr}>
                        {monthStr} ({formatMonthThai(monthStr)})
                      </option>
                    ))
                  )}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Date / Month display */}
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">
            {viewMode === 'daily' ? formatDateThai(selectedDate) : formatMonthThai(selectedMonth)}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border p-5 bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">ยอดขายรวม</p>
            </div>
            <h2 className="text-3xl font-extrabold text-primary">{Math.round(summary.totalSales).toLocaleString()} บ.</h2>
          </div>
          
          <div className="rounded-2xl border p-5 bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">จ่ายเงินแล้ว</p>
            </div>
            <h2 className="text-3xl font-extrabold text-green-600">{Math.round(summary.totalPaid).toLocaleString()} บ.</h2>
          </div>
          
          <div className="rounded-2xl border p-5 bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">ยอดค้างชำระ</p>
            </div>
            <h2 className="text-3xl font-extrabold text-red-500">{Math.round(summary.totalOwed).toLocaleString()} บ.</h2>
          </div>

          <div className="rounded-2xl border p-5 bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">บิลฉบับร่าง (Draft)</p>
            </div>
            <h2 className="text-3xl font-extrabold text-amber-600">{summary.draftCount} บิล</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-muted gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('transaction')}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'transaction' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            ยอดเบิกสินค้า
          </button>
          <button
            onClick={() => setActiveTab('typeSummary')}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'typeSummary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            รวมยอดตาม Type
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'payment' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            ยอดชำระ & จัดการ
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          {/* Tab: Transaction */}
          {activeTab === 'transaction' && (
            <div>
              <div className="p-4 border-b bg-muted/20">
                <h3 className="font-semibold text-lg">รายการเบิกสินค้า</h3>
                <p className="text-xs text-muted-foreground">แสดงเฉพาะรายการที่มีการเบิกสินค้าใหม่</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">ชื่อ</th>
                      <th className="text-left p-3">วันที่</th>
                      <th className="text-left p-3">สินค้า</th>
                      <th className="text-center p-3">จำนวน (เบิกเพิ่ม)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBills.length === 0 ? (
                      <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">ไม่มีข้อมูลรายการเบิกในช่วงเวลาที่เลือก</td></tr>
                    ) : (
                      filteredBills.flatMap((bill) =>
                        bill.items.filter((item) => item.newStock > 0).map((item, idx) => (
                          <tr key={`${bill.id}-${item.productId}-${idx}`} className="hover:bg-muted/30">
                            <td className="p-3 font-semibold">{bill.memberName}</td>
                            <td className="p-3 text-muted-foreground">{bill.date}</td>
                            <td className="p-3">{item.productName}</td>
                            <td className="text-center p-3 font-bold text-blue-600">+{item.newStock} ชิ้น</td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Type Summary */}
          {activeTab === 'typeSummary' && (
            <div>
              <div className="p-4 border-b bg-muted/20">
                <h3 className="font-semibold text-lg">สรุปยอดแยกตามประเภท</h3>
                <p className="text-xs text-muted-foreground">ยอดเก่า + ยอดใหม่ = ยอดรวม → ยอดเหลือ → ยอดขาย</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">ชื่อ / ขอบเขต</th>
                      <th className="text-left p-3">ชนิด</th>
                      <th className="text-center p-3">ยอดเก่ารวม</th>
                      <th className="text-center p-3">ยอดใหม่รวม</th>
                      <th className="text-center p-3">ยอดรวมทั้งหมด</th>
                      <th className="text-center p-3 text-orange-600">ยอดเหลือรวม</th>
                      <th className="text-center p-3 text-green-600">ยอดขายรวม</th>
                      <th className="text-right p-3 font-bold text-primary">สุทธิ (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recordSummaryByType.length === 0 ? (
                      <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>
                    ) : (
                      recordSummaryByType.map((item, idx) => (
                        <tr key={`${item.memberName}-${item.type}-${idx}`} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold">{item.memberName}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 text-xs rounded-md bg-secondary font-medium">{item.typeName}</span>
                          </td>
                          <td className="text-center p-3 text-muted-foreground">{item.oldStock}</td>
                          <td className="text-center p-3 text-blue-600">+{item.newStock}</td>
                          <td className="text-center p-3 font-medium">{item.totalStock}</td>
                          <td className="text-center p-3 text-orange-600 font-bold">{item.returned}</td>
                          <td className="text-center p-3 text-green-600 font-semibold">{item.sold}</td>
                          <td className="text-right p-3 font-extrabold text-primary bg-primary/5">{Math.round(item.netPrice).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Payment */}
          {activeTab === 'payment' && (
            <div>
              <div className="p-4 border-b bg-muted/20">
                <h3 className="font-semibold text-lg">ยอดชำระเงิน & จัดการบิล</h3>
                <p className="text-xs text-muted-foreground">ตรวจสอบยอดเงินคงค้าง พร้อมปุ่มแก้ไข</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">ชื่อ</th>
                      {viewMode === 'monthly' && <th className="text-left p-3">วันที่บิล</th>}
                      <th className="text-center p-3">สถานะ</th>
                      <th className="text-right p-3">ยอดขาย</th>
                      <th className="text-right p-3 text-green-600">จ่ายแล้ว</th>
                      <th className="text-right p-3 text-orange-500">ค้างเก่า</th>
                      <th className="text-right p-3 text-red-500">ค้างใหม่</th>
                      <th className="text-center p-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={viewMode === 'monthly' ? 8 : 7} className="text-center p-8 text-muted-foreground">ไม่มีข้อมูลบิลชำระเงิน</td>
                      </tr>
                    ) : (
                      filteredBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-semibold">{bill.memberName}</td>
                          {viewMode === 'monthly' && <td className="p-3 text-muted-foreground text-xs">{bill.date}</td>}
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              bill.status === 'completed' ? 'bg-green-100 text-green-700' :
                              bill.status === 'checkout' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {bill.status === 'completed' ? 'ปิดวันแล้ว' :
                               bill.status === 'checkout' ? 'เบิกแล้ว' : 'ร่าง'}
                            </span>
                          </td>
                          <td className="text-right p-3 font-medium">
                            {Math.round(bill.totalSales).toLocaleString()} บ.
                          </td>
                          <td className="text-right p-3 text-green-600 font-bold">
                            {Math.round(bill.amountPaid).toLocaleString()} บ.
                          </td>
                          <td className="text-right p-3 text-orange-500">
                            {Math.round(bill.previousOwed || 0).toLocaleString()} บ.
                          </td>
                          <td className="text-right p-3 text-red-500 font-extrabold">
                            {Math.round(bill.amountOwed).toLocaleString()} บ.
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(bill.id, bill.memberName, bill.amountPaid)}
                                className="h-8 text-xs"
                              >
                                <Edit3 className="w-3 h-3 mr-1" /> แก้ไข
                              </Button>
                              {(bill.status === 'completed' || bill.status === 'checkout') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRevertBillStatus(bill.id, bill.memberName)}
                                  className="h-8 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Unlock className="w-3 h-3 mr-1" /> ปลดล็อก
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModal.isOpen} onOpenChange={(open) => setEditModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขยอดจ่ายเงิน - {editModal.memberName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="amountPaid">ยอดจ่ายเงิน (บาท)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  value={editModal.amountPaid}
                  onChange={(e) => setEditModal(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}