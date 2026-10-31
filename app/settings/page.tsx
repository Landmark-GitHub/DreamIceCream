'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { MemberSettings } from '@/components/member-settings';
import { ProductSettings } from '@/components/product-settings';
import { UserSettings } from '@/components/user-settings';
import { MembershipPlanSettings } from '@/components/membership-plan-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthGuard } from '@/components/auth-guard';

function SettingsContent() {
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
            <h1 className="font-bold text-foreground">ตั้งค่า</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="members">สมาชิก</TabsTrigger>
            <TabsTrigger value="products">สินค้า</TabsTrigger>
            <TabsTrigger value="plans">ประเภทสมาชิก</TabsTrigger>
            <TabsTrigger value="users">ผู้ใช้งาน</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MemberSettings />
          </TabsContent>

          <TabsContent value="products">
            <ProductSettings />
          </TabsContent>

          <TabsContent value="plans">
            <MembershipPlanSettings />
          </TabsContent>

          <TabsContent value="users">
            <UserSettings />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard requireAdmin>
      <SettingsContent />
    </AuthGuard>
  );
}
