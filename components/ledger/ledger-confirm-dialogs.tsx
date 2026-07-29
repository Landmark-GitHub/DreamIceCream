'use client';

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

interface LedgerConfirmDialogsProps {
  showReturnConfirm: boolean;
  showDeleteConfirm: boolean;
  showCloseConfirm: boolean;
  onReturnConfirmChange: (open: boolean) => void;
  onDeleteConfirmChange: (open: boolean) => void;
  onCloseConfirmChange: (open: boolean) => void;
  onConfirmReturn: () => void;
  onConfirmDelete: () => void;
  onConfirmCloseDay: () => void;
}

export function LedgerConfirmDialogs({
  showReturnConfirm,
  showDeleteConfirm,
  showCloseConfirm,
  onReturnConfirmChange,
  onDeleteConfirmChange,
  onCloseConfirmChange,
  onConfirmReturn,
  onConfirmDelete,
  onConfirmCloseDay,
}: LedgerConfirmDialogsProps) {
  return (
    <>
      <AlertDialog open={showReturnConfirm} onOpenChange={onReturnConfirmChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการคืนของ</AlertDialogTitle>
            <AlertDialogDescription>
              ระบบจะบันทึกว่า <strong>คืนของทั้งหมด</strong> — โปรกกดชำระเงินก่อนคืนของ
              <br />
              ยอดค้างสุทธิรวมจะไม่ถูกบันทึกเป็นยอดค้างสะสมใหม่
              <br />
              <strong className="text-red-600">⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้</strong>
              <br />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmReturn}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              ยืนยันคืนของ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={onDeleteConfirmChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบบิล</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบบิลนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCloseConfirm} onOpenChange={onCloseConfirmChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการปิดวัน</AlertDialogTitle>
            <AlertDialogDescription>
              เมื่อปิดวันแล้วจะไม่สามารถแก้ไขข้อมูลได้อีก
              <br />
              ยอดเหลือจะถูกนำไปเป็นยอดเก่าในวันถัดไป
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmCloseDay}>ยืนยันปิดวัน</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
