'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getToday } from '@/lib/types';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Settings, TrendingUp, Users, Database, LogOut, Shield, User, Receipt, PenLine } from 'lucide-react';

function HomeContent() {
  const router = useRouter();
  const { members, bills, currentUser, logout, expenses } = useStore();
  const isAdmin = currentUser?.role === 'admin';

  const today = getToday();
  const todayBills = bills.filter((b) => b.date === today);
  const activeMembers = members.filter((m) => m.statusOut === 'active');

  const todayPaidTotal = todayBills
  .filter((b) => b.status === 'completed')
  .reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    // คัดกรองรายจ่ายเฉพาะวันนั้นๆ
  const todayExpenses = expenses?.filter((e) => e.date === today) || [];
  // ยอดรวมรวมของวันปัจจุบัน
  const todayExpensesTotal = todayExpenses.reduce((sum, item) => sum + item.amount, 0);

  const formattedDate = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-chart-2/5">
        <div className="max-w-lg mx-auto px-4 py-8">
          
          {/* Header with User Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {isAdmin ? (
                  <Shield className="w-4 h-4 text-primary" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              ออก
            </Button>
          </div>

          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-card shadow-lg mb-4">
              <span className="text-4xl" aria-hidden="true">
                <svg viewBox="0 0 64 64" className="w-12 h-12">
                  <path fill="#8B5CF6" d="M32 8c-8 0-14 6-14 14v4h28v-4c0-8-6-14-14-14z" />
                  <path fill="#EC4899" d="M18 26h28v6c0 12-6 24-14 24s-14-12-14-24v-6z" />
                  <path fill="#F59E0B" d="M28 8c-2-4-4-6-4-6s4 0 8 0 8 0 8 0-2 2-4 6h-8z" />
                </svg>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Dream IceCream</h1>
            <p className="text-muted-foreground text-sm">Digital Ledger System</p>
            <p className="text-xs text-muted-foreground mt-2">{formattedDate}</p>
          </div>

          {/* Quick Stats - Only for Admin */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Card ยอดเงินแบบเต็มความกว้าง แยกฝั่งซ้าย-ขวา */}
              <Link href="/supply">
                <Card className="bg-card border-muted-foreground/10 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    {/* ฝั่งซ้าย: รายรับวันนี้ */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">ยอดวันนี้</p>
                        <p className="text-xl font-bold tracking-tight text-foreground">
                          {todayBills.reduce((sum, b) => sum + b.amountPaid, 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">บาท</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* ฝั่งขวา: รายจ่ายวันนี้ (มีเส้นคั่น) */}
                    <div className="text-right border-l pl-4 border-muted shrink-0 min-w-[100px]">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">รายจ่าย</p>
                      <p className="text-sm font-bold text-rose-500">
                        - {todayExpensesTotal.toLocaleString()} <span className="text-[11px] font-normal text-muted-foreground">บาท</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* ปุ่มสมาชิกด้านล่าง */}
              {isAdmin && (
              <Link href="/settings">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/80 border border-muted-foreground/5 hover:border-primary/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-foreground">จัดการสมาชิก</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-background px-2.5 py-1 rounded-md border border-muted text-muted-foreground group-hover:text-foreground">
                      {activeMembers.length} คน
                    </span>
                    <span className="text-muted-foreground group-hover:translate-x-0.5 transition-transform text-xs">→</span>
                  </div>
                </div>
              </Link>
              )}
            </div>

          
          {/* Main Actions Block */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">การทำงานประจำวัน</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/modework" className="block">
                <Card className="hover:shadow-sm transition-all cursor-pointer hover:border-border/60 h-full border-primary/20 bg-primary/5">
                  <CardContent className="p-5">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-3.5">
                      <PenLine className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Mode Work</p>
                    <p className="text-xs text-muted-foreground mt-1">เขียนสต็อกด้วย Pencil</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/ledger" className="block">
                <Card className="hover:shadow-sm transition-all cursor-pointer hover:border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3.5">
                      <ClipboardList className="w-5 h-5 text-amber-700" />
                    </div>
                    <p className="text-sm font-medium text-foreground">บันทึกการเบิก</p>
                    <p className="text-xs text-muted-foreground mt-1">สินค้าประจำวัน</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/expenses" className="block">
                <Card className="hover:shadow-sm transition-all cursor-pointer hover:border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3.5">
                      <Receipt className="w-5 h-5 text-emerald-700" />
                    </div>
                    <p className="text-sm font-medium text-foreground">บันทึกรายจ่าย</p>
                    <p className="text-xs text-muted-foreground mt-1">ค่าใช้จ่ายประจำวัน</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/supply" className="block">
                <Card className="hover:shadow-sm transition-all cursor-pointer hover:border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3.5">
                      <Receipt className="w-5 h-5 text-blue-700" />
                    </div>
                    <p className="text-sm font-medium text-foreground">สั่งซื้อสินค้า</p>
                    <p className="text-xs text-muted-foreground mt-1">จัดซื้อสินค้าในคลัง</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Admin Tools Block */}
          {isAdmin && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">การจัดการระบบ</h3>
              <div className="grid grid-cols-3 gap-3">
                <Link href="/transaction">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card h-full">
                    <CardHeader className="p-3 pb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                        <ClipboardList className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-xs">บันทึกรายวัน</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>

                <Link href="/settings">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card h-full">
                    <CardHeader className="p-3 pb-2">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mb-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-xs">ตั้งค่า</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>

                <Link href="/data">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card h-full">
                    <CardHeader className="p-3 pb-2">
                      <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center mb-2">
                        <Database className="w-4 h-4 text-chart-2" />
                      </div>
                      <CardTitle className="text-xs">ข้อมูล/Export</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Dream IceCream Digital Ledger v2.0
            </p>
          </footer>

        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}
