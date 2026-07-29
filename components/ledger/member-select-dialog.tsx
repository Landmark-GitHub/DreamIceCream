'use client';

import { Member } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MemberSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  selectedDate: string;
  onSelectMember: (memberId: string) => void;
}

export function MemberSelectDialog({
  open,
  onOpenChange,
  members,
  onSelectMember,
}: MemberSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl flex flex-col max-h-[85vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>เลือกสมาชิก</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto pr-2 flex-1">
          {members.map((member) => (
            <Button
              key={member.id}
              variant="outline"
              className="w-full justify-start text-sm py-5"
              onClick={() => onSelectMember(member.id)}
            >
              {member.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
