'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { ADMIN_PHONE, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Trash2, Shield, User, Phone, Edit2, Check, X } from 'lucide-react';

export function UserSettings() {
  const { users, addUser, updateUser, deleteUser } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const handleAddUser = () => {
    const normalizedPhone = newPhone.replace(/[\s-]/g, '');
    
    if (normalizedPhone.length !== 10) {
      setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
      return;
    }
    
    if (!newName.trim()) {
      setError('กรุณากรอกชื่อ');
      return;
    }

    const result = addUser(normalizedPhone, newName.trim(), newRole);
    
    if (!result) {
      setError('เบอร์โทรศัพท์นี้มีอยู่ในระบบแล้ว');
      return;
    }

    setNewPhone('');
    setNewName('');
    setNewRole('user');
    setShowAddForm(false);
    setError('');
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateUser(id, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDeleteUser = () => {
    if (deleteUserId) {
      deleteUser(deleteUserId);
      setDeleteUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">จัดการผู้ใช้งาน</CardTitle>
          <CardDescription>
            เพิ่ม/ลบ ผู้ใช้งานที่สามารถเข้าสู่ระบบได้
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User List */}
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    user.role === 'admin' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {user.role === 'admin' ? (
                      <Shield className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    {editingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 w-32"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleSaveEdit(user.id)}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm">{user.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                  {user.phone !== ADMIN_PHONE && (
                    <>
                      {editingId !== user.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(user.id, user.name)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteUserId(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add User Form */}
          {showAddForm ? (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-phone">เบอร์โทรศัพท์</Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    placeholder="0XX-XXX-XXXX"
                    value={newPhone}
                    onChange={(e) => {
                      setNewPhone(e.target.value);
                      setError('');
                    }}
                    maxLength={12}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-name">ชื่อ</Label>
                  <Input
                    id="new-name"
                    type="text"
                    placeholder="ชื่อผู้ใช้งาน"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setError('');
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ระดับสิทธิ์</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          User (พนักงาน)
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin (ผู้ดูแล)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="text-destructive text-sm">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleAddUser} className="flex-1">
                    <Plus className="w-4 h-4 mr-1" />
                    เพิ่ม
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewPhone('');
                      setNewName('');
                      setNewRole('user');
                      setError('');
                    }}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มผู้ใช้งาน
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Role Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ระดับสิทธิ์</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Admin (ผู้ดูแล)</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>- ดูยอดวันนี้ได้</li>
                <li>- ตั้งค่าสมาชิก/สินค้า/ผู้ใช้งาน</li>
                <li>- Export ข้อมูล</li>
                <li>- ปลดล็อคยอดชำระเงิน/จัดการบิล</li>
              </ul>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">User (พนักงาน)</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>- บันทึกรายการสินค้าได้</li>
                <li>- ดูบันทึกรายวันได้</li>
                <li>- ไม่สามารถเข้าตั้งค่า</li>
                <li>- ไม่สามารถ Export ข้อมูล</li>
                <li>- ไม่สามารถปลดล็อคยอด/จัดการบิล</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้งาน?</AlertDialogTitle>
            <AlertDialogDescription>
              ผู้ใช้งานนี้จะไม่สามารถเข้าสู่ระบบได้อีก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
