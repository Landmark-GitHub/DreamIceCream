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
  statusIn: { house: boolean; car: boolean };
  statusOut: MemberStatusOut; // นี่คือฟิลด์ Status (Active/Inactive)
}

const defaultFormData: MemberFormData = {
  name: '',
  phone: '',
  address: '',
  class: 'In', // 2. ค่าเริ่มต้นเปลี่ยนเป็น 'In'
  statusIn: { house: false, car: false },
  statusOut: 'active',
};

export function MemberSettings() {
  const { members, addMember, updateMember, deleteMember } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(defaultFormData);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone || '',
      address: member.address || '',
      class: member.class || 'In', // ดึงจาก class ตรงๆ
      statusIn: { ...member.statusIn },
      statusOut: member.statusOut,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    const saveData = {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      class: formData.class, // ส่งค่าฟิลด์ class ไปบันทึก
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

            {/* Class (Checkbox) แทน Status In เดิมเพื่อเลือกประเภทกลุ่มสมาชิก */}

            <div className="flex flex-wrap gap-4 mt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="class-in"
                  checked={formData.class === 'In'}
                  onCheckedChange={(checked) => {
                    if (checked) setFormData({ ...formData, class: 'In' });
                  }}
                />
                <Label htmlFor="class-in" className="text-sm cursor-pointer">In</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="class-out"
                  checked={formData.class === 'Out'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData({ 
                        ...formData, 
                        class: 'Out',
                        statusIn: { house: false, car: false } 
                      });
                    }
                  }}
                />
                <Label htmlFor="class-out" className="text-sm cursor-pointer">Out</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="class-workin"
                  checked={formData.class === 'WalkIn'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData({ 
                        ...formData, 
                        class: 'WalkIn',
                        statusIn: { house: false, car: false }
                      });
                    }
                  }}
                />
                <Label htmlFor="class-workin" className="text-sm cursor-pointer">WalkIn</Label>
              </div>
            </div>

            {/* เงื่อนไข: ถ้าเลือก Class เป็น 'in' เท่านั้น ถึงจะแสดงให้ติ๊ก รถ / บ้าน */}
            {formData.class === 'In' && (
              <div className="space-y-2 pl-4 border-l-2 border-muted animate-in fade-in duration-200">
                <Label className="text-xs text-muted-foreground">รายละเอียดสถานะ In</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="house"
                      checked={formData.statusIn.house}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          statusIn: { ...formData.statusIn, house: !!checked },
                        })
                      }
                    />
                    <Label htmlFor="house" className="text-sm cursor-pointer">บ้าน</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="car"
                      checked={formData.statusIn.car}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          statusIn: { ...formData.statusIn, car: !!checked },
                        })
                      }
                    />
                    <Label htmlFor="car" className="text-sm cursor-pointer">รถ</Label>
                  </div>
                </div>
              </div>
            )}

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
