'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Plus,
  Save,
} from 'lucide-react';
import { Bill, Member } from '@/lib/types';
import {
  BillTabEntry,
  LedgerMode,
  formatThaiShortDate,
  getBillTabsForDate,
} from '@/lib/ledger-utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MemberSelectDialog } from './member-select-dialog';

interface LedgerHeaderProps {
  mode: LedgerMode;
  selectedDate: string;
  isToday: boolean;
  hasCurrentBill: boolean;
  activeMembers: Member[];
  bills: Bill[];
  selectedBillId: string;
  showMemberSelectModal: boolean;
  onPrevDate: () => void;
  onNextDate: () => void;
  onModeChange: (mode: LedgerMode) => void;
  onOpenPrintPreview: () => void;
  onOpenMemberSelect: () => void;
  onMemberSelectOpenChange: (open: boolean) => void;
  onSelectBillTab: (memberId: string, billId: string) => void;
  onCreateBillForMember: (memberId: string) => void;
}

function getBillTabClassName(status: Bill['status'], isSelected: boolean): string {
  if (status === 'completed') {
    return isSelected
      ? 'bg-green-600 text-white'
      : 'bg-green-100 text-green-700 hover:bg-green-200';
  }
  if (status === 'checkout') {
    return isSelected
      ? 'bg-blue-600 text-white'
      : 'bg-blue-100 text-blue-700 hover:bg-blue-200';
  }
  return isSelected
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted text-muted-foreground hover:bg-muted/80';
}

function BillTabButton({
  tab,
  isSelected,
  onSelect,
}: {
  tab: BillTabEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
        getBillTabClassName(tab.status, isSelected)
      )}
    >
      {tab.memberName}
      {tab.index > 0 && `(${tab.index})`}
    </button>
  );
}

export function LedgerHeader({
  mode,
  selectedDate,
  isToday,
  hasCurrentBill,
  activeMembers,
  bills,
  selectedBillId,
  showMemberSelectModal,
  onPrevDate,
  onNextDate,
  onModeChange,
  onOpenPrintPreview,
  onOpenMemberSelect,
  onMemberSelectOpenChange,
  onSelectBillTab,
  onCreateBillForMember,
}: LedgerHeaderProps) {
  const billTabs = getBillTabsForDate(activeMembers, bills, selectedDate);

  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-foreground">
              {mode === 'checkout' ? 'เบิกสินค้า' : 'บันทึกยอด'}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={onPrevDate}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <p
                className={cn(
                  'text-xs font-medium cursor-pointer',
                  isToday ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {formatThaiShortDate(selectedDate)}
                {isToday && ' (วันนี้)'}
              </p>
              <button
                onClick={onNextDate}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasCurrentBill}
            onClick={onOpenPrintPreview}
          >
            <Save className="w-4 h-4 mr-1" />
            พิมพ์บิล
          </Button>

          <Button size="sm" onClick={onOpenMemberSelect} className="bg-primary">
            <Plus className="w-4 h-4 mr-1" />
            เพิ่ม
          </Button>
        </div>
      </div>

      <div className="px-4 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {billTabs.map((tab) => (
            <BillTabButton
              key={tab.billId}
              tab={tab}
              isSelected={selectedBillId === tab.billId}
              onSelect={() => onSelectBillTab(tab.memberId, tab.billId)}
            />
          ))}

          <Button
            size="icon"
            variant="outline"
            className="rounded-full shrink-0"
            onClick={onOpenMemberSelect}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <MemberSelectDialog
        open={showMemberSelectModal}
        onOpenChange={onMemberSelectOpenChange}
        members={activeMembers}
        onSelectMember={onCreateBillForMember}
      />

      <Tabs
        value={mode}
        onValueChange={(v) => onModeChange(v as LedgerMode)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="checkout">เบิกสินค้า</TabsTrigger>
          <TabsTrigger value="return">บันทึกยอด</TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  );
}
