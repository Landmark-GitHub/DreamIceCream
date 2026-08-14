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
  onSelectMember: (memberId: string) => void;
}

// สีของแต่ละ Class
const classColors: Record<string, string> = {
  A: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',
  In: 'bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400',
  WalkIn: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400',
  Out: 'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400',
};

const getClassColor = (className?: string) => {
  return (
    classColors[className ?? ''] ??
    'bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400'
  );
};

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
              className="
                w-full justify-between
                px-4 py-6
                bg-card
                hover:bg-muted/50
                transition-colors
              "
              onClick={() => onSelectMember(member.id)}
            >
              {/* ชื่อสมาชิก */}
              <span className="text-base font-semibold text-foreground">
                {member.name}
              </span>

              {/* Class */}
              {member.class && (
                <span
                  className={`
                    min-w-[42px]
                    rounded-md
                    border
                    px-3 py-1
                    text-center
                    text-sm
                    font-bold
                    ${getClassColor(member.class)}
                  `}
                >
                  {member.class}
                </span>
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}