'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Member, MemberStatusOut, MemberClass } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Pencil, Trash2, Home, Car, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberFormData {
  name: string;
  phone: string;
  address: string;
  class: MemberClass;
  membershipPlanId: string;
  addonIds: string[];
  statusIn: { house: boolean; car: boolean };
  statusOut: MemberStatusOut; // นี่คือฟิลด์ Status (Active/Inactive)
}

const defaultFormData: MemberFormData = {
  name: '',
  phone: '',
  address: '',
  class: 'In', // รองรับข้อมูลสมาชิกเดิม
  membershipPlanId: '',
  addonIds: [],
  statusIn: { house: false, car: false },
  statusOut: 'active',
};

export function MemberSettings() {
  const { members, membershipPlans, addons, addMember, updateMember, deleteMember, addMembershipPlan, updateMembershipPlan, deleteMembershipPlan, addAddon, updateAddon, deleteAddon } = useStore();
  const [planDraft, setPlanDraft] = useState('');
  const [addonDraft, setAddonDraft] = useState({ name: '', price: '' });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(defaultFormData);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData(defaultFormData);
    setPlanDraft('');
    setAddonDraft({ name: '', price: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone || '',
      address: member.address || '',
      class: member.class || 'In', // รองรับสมาชิกเดิม
      membershipPlanId: member.membershipPlanId || '',
      addonIds: member.addonIds || [],
      statusIn: { ...member.statusIn },
      statusOut: member.statusOut,
    });
    setIsDialogOpen(true);
  };

  const savePlan = () => {
    const name = planDraft.trim();
    if (!name) return;
    if (editingPlanId) updateMembershipPlan(editingPlanId, { name });
    else addMembershipPlan({ name, code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), active: true, addonIds: [] });
    setPlanDraft('');
    setEditingPlanId(null);
  };

  const saveAddon = () => {
    const name = addonDraft.name.trim();
    if (!name) return;
    const price = Math.max(0, Number(addonDraft.price) || 0);
    if (editingAddonId) updateAddon(editingAddonId, { name, price });
    else addAddon({ name, price, active: true });
    setAddonDraft({ name: '', price: '' });
    setEditingAddonId(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    const saveData = {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      class: formData.class,
      membershipPlanId: formData.membershipPlanId || undefined,
      addonIds: formData.addonIds,
      statusIn: formData.class === 'In' ? formData.statusIn : { house: false, car: false },
      statusOut: formData.statusOut,
    };

    if (editingMember) {
      updateMember(editingMember.id, saveData);
    } else {
      const member = addMember(formData.name);
      updateMember(member.id, saveData);
    }

    setIsDialogOpen(false);
    setFormData(defaultFormData);
    setEditingMember(null);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMember(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // ปรับการแสดงผล Badge บนลิสต์รายชื่อ ให้แสดงตาม Class และรายละเอียดใหม่
  // const getStatusBadge = (member: Member) => {
  //   const badges = [];
    
  //   // แสดง Badge ตาม Class
  //   if (member.memberClass === 'in') {
  //     badges.push({ icon: Home, label: 'In', color: 'bg-indigo-100 text-indigo-700' });
  //     // ถ้าเป็น In ค่อยเช็กว่ามี บ้าน หรือ รถ
  //     if (member.statusIn?.house) badges.push({ icon: Home, label: 'บ้าน', color: 'bg-blue-100 text-blue-700' });
  //     if (member.statusIn?.car) badges.push({ icon: Car, label: 'รถ', color: 'bg-green-100 text-green-700' });
  //   } else if (member.memberClass === 'out') {
  //     badges.push({ icon: Briefcase, label: 'Out', color: 'bg-purple-100 text-purple-700' });
  //   } else if (member.memberClass === 'workin') {
  //     badges.push({ icon: Briefcase, label: 'WorkIn', color: 'bg-amber-100 text-amber-700' });
  //   }
    
  //   return badges;
  // };


  const getStatusBadge = (member: Member) => {
    const badges = [];
    
    if (member.class === 'In') {
      badges.push({ icon: Home, label: 'In', color: 'bg-indigo-100 text-indigo-700' });
      if (member.statusIn?.house) badges.push({ icon: Home, label: 'บ้าน', color: 'bg-blue-100 text-blue-700' });
      if (member.statusIn?.car) badges.push({ icon: Car, label: 'รถ', color: 'bg-green-100 text-green-700' });
    } else if (member.class === 'Out') {
      badges.push({ icon: Briefcase, label: 'Out', color: 'bg-purple-100 text-purple-700' });
    } else if (member.class === 'WalkIn') {
      badges.push({ icon: Briefcase, label: 'WalkIn', color: 'bg-amber-100 text-amber-700' });
    }
    
    return badges;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">สมาชิก ({members.length})</CardTitle>
        <Button size="sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1" />
          เพิ่ม
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            ยังไม่มีสมาชิก กดปุ่มเพิ่มเพื่อเริ่มต้น
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{member.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getStatusBadge(member).map((badge, i) => (
                    <span
                      key={i}
                      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', badge.color)}
                    >
                      <badge.icon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  ))}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs',
                      member.statusOut === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {member.statusOut === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(member)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิก'}</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลสมาชิกให้ครบถ้วน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* ชื่อ */}
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="กรอกชื่อสมาชิก"
              />
            </div>

            {/* เบอร์โทรศัพท์ */}
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="กรอกเบอร์โทรศัพท์"
              />
            </div>

            {/* ที่อยู่ */}
            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="กรอกที่อยู่"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="membership-plan">Membership Plan</Label>
              <Select
                value={formData.membershipPlanId || 'legacy'}
                onValueChange={(value) => {
                  const plan = membershipPlans.find((item) => item.id === value);
                  setFormData({
                    ...formData,
                    membershipPlanId: value === 'legacy' ? '' : value,
                    class: (plan?.code === 'out' ? 'Out' : plan?.code === 'walk-in' ? 'WalkIn' : 'In') as MemberClass,
                    addonIds: plan ? formData.addonIds.filter((id) => plan.addonIds.includes(id)) : [],
                    statusIn: plan?.code === 'in' ? formData.statusIn : { house: false, car: false },
                  });
                }}
              >
                <SelectTrigger id="membership-plan"><SelectValue placeholder="เลือกประเภทสมาชิก" /></SelectTrigger>
                <SelectContent>
                  {membershipPlans.length === 0 ? (
                    <SelectItem value="legacy">ประเภทเดิม (In / Out / WalkIn)</SelectItem>
                  ) : membershipPlans.filter((plan) => plan.active).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.membershipPlanId && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label className="text-xs text-muted-foreground">Add-ons / บริการเสริม</Label>
                <div className="flex flex-col gap-2">
                  {addons.filter((addon) => addon.active && membershipPlans.find((plan) => plan.id === formData.membershipPlanId)?.addonIds.includes(addon.id)).map((addon) => (
                    <label key={addon.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.addonIds.includes(addon.id)}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          addonIds: checked ? [...formData.addonIds, addon.id] : formData.addonIds.filter((id) => id !== addon.id),
                        })}
                      />
                      <span>{addon.name} ({addon.price.toLocaleString()} บาท)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!formData.membershipPlanId && (
              <div className="flex flex-wrap gap-4 mt-1">
                {(['In', 'Out', 'WalkIn'] as MemberClass[]).map((memberClass) => (
                  <label key={memberClass} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formData.class === memberClass} onCheckedChange={(checked) => checked && setFormData({ ...formData, class: memberClass, statusIn: memberClass === 'In' ? formData.statusIn : { house: false, car: false } })} />
                    {memberClass}
                  </label>
                ))}
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-sm font-medium">จัดการ Membership Plans และ Add-ons</p>
              <div className="flex gap-2">
                <Input value={planDraft} onChange={(event) => setPlanDraft(event.target.value)} placeholder="ชื่อ Type ใหม่" aria-label="ชื่อ Type ใหม่" />
                <Button type="button" size="sm" onClick={savePlan}>{editingPlanId ? 'บันทึก Type' : 'เพิ่ม Type'}</Button>
              </div>
              <div className="flex flex-col gap-1">
                {membershipPlans.map((plan) => (
                  <div key={plan.id} className="flex items-center gap-2 text-xs">
                    <button type="button" className={cn('flex-1 rounded border px-2 py-1 text-left', formData.membershipPlanId === plan.id && 'border-primary bg-primary/10')} onClick={() => setFormData({ ...formData, membershipPlanId: plan.id, class: 'In', addonIds: [] })}>{plan.name}</button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingPlanId(plan.id); setPlanDraft(plan.name); }} aria-label={`แก้ไข ${plan.name}`}><Pencil /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteMembershipPlan(plan.id)} aria-label={`ลบ ${plan.name}`}><Trash2 /></Button>
                  </div>
                ))}
              </div>
              {formData.membershipPlanId && (
                <div className="rounded border p-2">
                  <p className="mb-2 text-xs font-medium">Add-ons ที่ใช้ได้กับ Type นี้</p>
                  <div className="flex flex-col gap-1">
                    {addons.map((addon) => {
                      const plan = membershipPlans.find((item) => item.id === formData.membershipPlanId);
                      return <label key={addon.id} className="flex items-center gap-2 text-xs">
                        <Checkbox checked={plan?.addonIds.includes(addon.id) ?? false} onCheckedChange={(checked) => plan && updateMembershipPlan(plan.id, { addonIds: checked ? [...plan.addonIds, addon.id] : plan.addonIds.filter((id) => id !== addon.id) })} />
                        {addon.name} ({addon.price.toLocaleString()} บาท)
                      </label>;
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-[1fr_90px_auto] gap-2">
                <Input value={addonDraft.name} onChange={(event) => setAddonDraft({ ...addonDraft, name: event.target.value })} placeholder="ชื่อ Add-on" aria-label="ชื่อ Add-on" />
                <Input type="number" min="0" value={addonDraft.price} onChange={(event) => setAddonDraft({ ...addonDraft, price: event.target.value })} placeholder="ราคา" aria-label="ราคา Add-on" />
                <Button type="button" size="sm" onClick={saveAddon}>{editingAddonId ? 'บันทึก' : 'เพิ่ม'}</Button>
              </div>
              <div className="flex flex-col gap-1">
                {addons.map((addon) => (
                  <div key={addon.id} className="flex items-center gap-2 text-xs">
                    <span className="flex-1">{addon.name} ({addon.price.toLocaleString()} บาท)</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingAddonId(addon.id); setAddonDraft({ name: addon.name, price: String(addon.price) }); }} aria-label={`แก้ไข ${addon.name}`}><Pencil /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteAddon(addon.id)} aria-label={`ลบ ${addon.name}`}><Trash2 /></Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Status (เปลี่ยนชื่อจาก Status Out เดิม) */}
            <div className="space-y-2">
              <Label>Status (สถานะการใช้งาน)</Label>
              <Select
                value={formData.statusOut}
                onValueChange={(value: MemberStatusOut) =>
                  setFormData({ ...formData, statusOut: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน (Active)</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน (Inactive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingMember ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสมาชิก &quot;{deleteTarget?.name}&quot; ใช่หรือไม่?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
