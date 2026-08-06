'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Bill, calculateBillTotals, getProductPrice } from '@/lib/types';
import { ProductTable } from '@/components/product-table';
import { LedgerEmptyMembers } from '@/components/ledger/ledger-empty-members';
import { LedgerNoBill } from '@/components/ledger/ledger-no-bill';
import { LedgerHeader } from '@/components/ledger/ledger-header';
import { ReturnInputsCard } from '@/components/ledger/return-inputs-card';
import { CheckoutSummaryCard } from '@/components/ledger/checkout-summary-card';
import { ReturnSalesSummaryCard } from '@/components/ledger/return-sales-summary-card';
import { PaymentCard } from '@/components/ledger/payment-card';
import { BillPrintPreviewDialog } from '@/components/ledger/bill-print-preview-dialog';
import { LedgerConfirmDialogs } from '@/components/ledger/ledger-confirm-dialogs';
import {
  getBillStockTotals,
  getCheckoutProductTypes,
  getPreviousOwed,
  getToday,
  LedgerMode,
  shiftDate,
} from '@/lib/ledger-utils';

function LedgerContent() {
  const {
    members,
    products,
    bills,
    createBill,
    updateBill,
    updateBillItem,
    deleteBill,
    confirmCheckout,
  } = useStore();

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [mode, setMode] = useState<LedgerMode>('checkout');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [showMemberSelectModal, setShowMemberSelectModal] = useState(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);
  const [summaryMode, setSummaryMode] = useState<'type' | 'all'>('type');

  const today = getToday();
  const isToday = selectedDate === today;

  const activeMembers = useMemo(
    () => members.filter((m) => m.statusOut === 'active'),
    [members]
  );

  const currentBill = bills.find((b) => b.id === selectedBillId);
  const currentMember = members.find((m) => m.id === selectedMemberId);
  const previousOwed = getPreviousOwed(bills, selectedMemberId, selectedDate);

  const billTotals = currentBill
    ? calculateBillTotals(currentBill, products, currentMember)
    : { totalSales: 0, amountOwed: 0 };

  const { totalStock } = getBillStockTotals(currentBill);

  useEffect(() => {
    if (!selectedMemberId && activeMembers.length > 0) {
      setSelectedMemberId(activeMembers[0].id);
    }
  }, [selectedMemberId, activeMembers]);

  useEffect(() => {
    if (!selectedMemberId) return;

    const dateBills = bills.filter(
      (b) => b.memberId === selectedMemberId && b.date === selectedDate
    );

    if (dateBills.length > 0) {
      const draftBill = dateBills.find(
        (b) => b.status === 'draft' || b.status === 'checkout'
      );
      setSelectedBillId(draftBill?.id || dateBills[dateBills.length - 1].id);
    } else {
      setSelectedBillId('');
    }
  }, [selectedMemberId, selectedDate, bills]);

  const handlePrevDate = () => {
    setSelectedDate(shiftDate(selectedDate, -1));
    setSelectedBillId('');
  };

  const handleNextDate = () => {
    setSelectedDate(shiftDate(selectedDate, 1));
    setSelectedBillId('');
  };

  const handleCreateBill = useCallback(() => {
    if (!selectedMemberId) return;
    const newBill = createBill(selectedMemberId, selectedDate);
    setSelectedBillId(newBill.id);
  }, [selectedMemberId, selectedDate, createBill]);

  const handleCreateBillForMember = useCallback(
    (memberId: string) => {
      const newBill = createBill(memberId, selectedDate);
      setSelectedMemberId(memberId);
      setSelectedBillId(newBill.id);
      setShowMemberSelectModal(false);
    },
    [createBill, selectedDate]
  );

  const handleItemChange = useCallback(
    (productId: string, field: 'newStock' | 'returned', value: number) => {
      if (!selectedBillId) return;
      updateBillItem(selectedBillId, productId, { [field]: value });
    },
    [selectedBillId, updateBillItem]
  );

  const handleBillFieldChange = useCallback(
    (field: keyof Bill, value: string | number) => {
      if (!selectedBillId) return;
      updateBill(selectedBillId, { [field]: value });
    },
    [selectedBillId, updateBill]
  );

  const handleConfirmCheckout = useCallback(() => {
    if (!selectedBillId) return;
    confirmCheckout(selectedBillId);
  }, [selectedBillId, confirmCheckout]);

  // 1. เพิ่มการคำนวณตรวจสอบว่ายอดจ่ายครบถ้วนแล้วหรือยัง
  const isPaymentComplete = useMemo(() => {
    if (!currentBill) return false;
    const totalToPayFull = Math.round(billTotals.totalSales + previousOwed);
    return Math.round(currentBill.amountPaid || 0) === totalToPayFull;
  }, [currentBill, billTotals.totalSales, previousOwed]);

  // 2. ฟังก์ชัน "ปิดยอด" -> ใส่ค่า 0 ทุกประเภทสินค้า และ "ไม่ปิดวัน"
  const handleSetZeroInputs = useCallback(() => {
    if (!currentBill || !selectedBillId) return;

    const distinctTypes = getCheckoutProductTypes(products);
    const zeroInputs: Record<string, number> = { ...currentBill.returnInputs };

    distinctTypes.forEach((type) => {
      if (type !== 'D') {
        zeroInputs[type] = 0;
      }
    });

    updateBill(selectedBillId, { returnInputs: zeroInputs });
  }, [currentBill, selectedBillId, products, updateBill]);

  // const handleConfirmDayClose = () => {
  //   if (!currentBill) return;

  //   const dProduct = products.find((p) => p.type === 'D');
  //   const dItem = dProduct
  //     ? currentBill.items.find((item) => item.productId === dProduct.id)
  //     : null;
  //   const dQuantity = dItem ? dItem.totalStock : 0;
  //   const dPrice = dProduct ? getProductPrice(dProduct, currentMember) : 0;

  //   updateBill(currentBill.id, {
  //     icePrice: dQuantity * dPrice,
  //     status: 'completed',
  //   });

  //   setShowCloseConfirm(false);
  // };

  // ledger/page.tsx

  const handleConfirmDayClose = () => {
    if (!currentBill) return;

    const dProduct = products.find((p) => p.type === 'D');
    const dItem = dProduct
      ? currentBill.items.find((item) => item.productId === dProduct.id)
      : null;
    const dQuantity = dItem ? dItem.totalStock : 0;
    const dPrice = dProduct ? getProductPrice(dProduct, currentMember) : 0;
    const icePrice = dQuantity * dPrice;

    // ✅ คำนวณยอดสุทธิรวมก่อนปิดวัน (รวมค่าน้ำแข็งแห้งและเครดิตติดลบ)
    const updatedBillObj = { ...currentBill, icePrice };
    const { totalSales, amountOwed } = calculateBillTotals(
      updatedBillObj,
      products,
      currentMember
    );

    // ✅ เซฟทั้ง status, totalSales และ amountOwed (ติดลบ) ลง Firebase
    updateBill(currentBill.id, {
      icePrice,
      totalSales,
      amountOwed, // บันทึกยอดติดลบ (-295) ลง Firestore จริงๆ
      status: 'completed',
    });

    setShowCloseConfirm(false);
  };

  const handleReturnGoods = () => {
    if (!currentBill) return;

    const zeroInputs: Record<string, number> = {};
    Array.from(new Set(products.map((p) => p.type))).forEach((type) => {
      zeroInputs[type] = 0;
    });

    updateBill(currentBill.id, {
      returnInputs: zeroInputs,
      amountOwed: 0,
      status: 'completed',
    });

    setShowReturnConfirm(false);
  };

  const handleDeleteBill = useCallback(() => {
    if (!selectedBillId) return;
    deleteBill(selectedBillId);
    setShowDeleteConfirm(false);
    setSelectedBillId('');
  }, [selectedBillId, deleteBill]);

  const handlePayFull = useCallback(() => {
    if (!currentBill) return;

    const { totalSales } = calculateBillTotals(currentBill, products, currentMember);
    const totalToPayFull = Math.round(totalSales + previousOwed);

    updateBill(selectedBillId, { amountPaid: totalToPayFull });
    alert(`ชำระเงินเต็มจำนวน: ${totalToPayFull.toLocaleString()} บาท - บันทึกเรียบร้อย`);
  }, [currentBill, products, currentMember, selectedBillId, updateBill, previousOwed]);

  const handleUpdateReturnInput = useCallback(
    (type: string, value: number) => {
      if (!currentBill || !selectedBillId) return;
      updateBill(selectedBillId, {
        returnInputs: { ...currentBill.returnInputs, [type]: value },
      });
    },
    [currentBill, selectedBillId, updateBill]
  );

  const handleSkipCheck = useCallback(() => {
    if (!currentBill || !selectedBillId) return;

    const distinctTypes = getCheckoutProductTypes(products);
    const autoInputs: Record<string, number> = { ...currentBill.returnInputs };

    distinctTypes.forEach((type) => {
      const typeProducts = products.filter((p) => p.type === type && p.type !== 'D');
      const typeItems = currentBill.items.filter((item) =>
        typeProducts.some((p) => p.id === item.productId)
      );
      if (typeItems.length === 0) return;
      const typeTotal = typeItems.reduce((sum, i) => sum + i.totalStock, 0);
      autoInputs[type] = typeTotal;
    });

    updateBill(selectedBillId, { returnInputs: autoInputs });
  }, [currentBill, selectedBillId, products, updateBill]);

  if (activeMembers.length === 0) {
    return <LedgerEmptyMembers />;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col pb-14">
      <LedgerHeader
        mode={mode}
        selectedDate={selectedDate}
        isToday={isToday}
        hasCurrentBill={!!currentBill}
        activeMembers={activeMembers}
        bills={bills}
        selectedBillId={selectedBillId}
        showMemberSelectModal={showMemberSelectModal}
        onPrevDate={handlePrevDate}
        onNextDate={handleNextDate}
        onModeChange={setMode}
        onOpenPrintPreview={() => setShowPrintPreviewModal(true)}
        onOpenMemberSelect={() => setShowMemberSelectModal(true)}
        onMemberSelectOpenChange={setShowMemberSelectModal}
        onSelectBillTab={(memberId, billId) => {
          setSelectedMemberId(memberId);
          setSelectedBillId(billId);
        }}
        onCreateBillForMember={handleCreateBillForMember}
      />

      <div className="flex-1 overflow-y-auto">
        {!currentBill ? (
          <LedgerNoBill onCreateBill={handleCreateBill} />
        ) : (
          <div className="space-y-4 p-2">
            {mode === 'checkout' && (
              <ProductTable
                bill={currentBill}
                products={products}
                mode={mode}
                readOnly={
                  currentBill.status === 'completed' || currentBill.status === 'checkout'
                }
                onItemChange={handleItemChange}
              />
            )}

            {mode === 'return' && (
              <ReturnInputsCard
                bill={currentBill}
                products={products}
                onUpdateReturnInput={handleUpdateReturnInput}
                onSkipCheck={handleSkipCheck} // ไม่เช็คยอด (เหมือนเดิม)
                onCloseDay={handleSetZeroInputs} // ปรับเป็นฟังก์ชัน ปิดยอด (ใส่ 0 ไม่ปิดวัน)
                onReturnGoods={() => setShowReturnConfirm(true)}
                isPaymentComplete={isPaymentComplete} // ส่งสถานะล็อกปุ่มคืนของ
              />
            )}

            {mode === 'checkout' && (
              <CheckoutSummaryCard
                bill={currentBill}
                products={products}
                member={currentMember}
                totalStock={totalStock}
                totalSales={billTotals.totalSales}
                summaryMode={summaryMode}
                onSummaryModeChange={setSummaryMode}
                onConfirmCheckout={handleConfirmCheckout}
                onDeleteClick={() => setShowDeleteConfirm(true)}
                onRevertToDraft={() => updateBill(currentBill.id, { status: 'draft' })}
              />
            )}

            {mode === 'return' && (
              <>
                <ReturnSalesSummaryCard
                  bill={currentBill}
                  products={products}
                  member={currentMember}
                  totalSales={billTotals.totalSales}
                />
                <PaymentCard
                  bill={currentBill}
                  products={products}
                  member={currentMember}
                  totalSales={billTotals.totalSales}
                  previousOwed={previousOwed}
                  onAmountPaidChange={(value) => handleBillFieldChange('amountPaid', value)}
                  onNotesChange={(value) => handleBillFieldChange('notes', value)}
                  onPayFull={handlePayFull}
                  onReturnGoods={() => setShowReturnConfirm(true)}
                  onCloseDay={() => setShowCloseConfirm(true)}
                />
              </>
            )}
          </div>
        )}
      </div>

      <BillPrintPreviewDialog
        open={showPrintPreviewModal}
        onOpenChange={setShowPrintPreviewModal}
        mode={mode}
        bill={currentBill}
        products={products}
        member={currentMember}
        previousOwed={previousOwed}
      />

      <LedgerConfirmDialogs
        showReturnConfirm={showReturnConfirm}
        showDeleteConfirm={showDeleteConfirm}
        showCloseConfirm={showCloseConfirm}
        onReturnConfirmChange={setShowReturnConfirm}
        onDeleteConfirmChange={setShowDeleteConfirm}
        onCloseConfirmChange={setShowCloseConfirm}
        onConfirmReturn={handleReturnGoods}
        onConfirmDelete={handleDeleteBill}
        onConfirmCloseDay={handleConfirmDayClose}
      />
    </main>
  );
}

export default function LedgerPage() {
  return <LedgerContent />;
}
