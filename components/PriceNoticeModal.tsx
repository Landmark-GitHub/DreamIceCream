'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Bell, Info } from 'lucide-react';

const STORAGE_KEY = 'has_seen_price_notice_v1';
const DURATION_SECONDS = 60;

export default function PriceNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // บันทึกลง sessionStorage เพื่อไม่ให้แสดงซ้ำเมื่อ Refresh ใน Session เดียวกัน
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }
  }, []);

  // 1. ตรวจสอบ Session Storage เมื่อ Mount
  useEffect(() => {
    const hasSeen = sessionStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  // 2. Countdown Timer & Auto-dismiss Logic
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, handleClose]);

  // 3. Event Listener สำหรับปุ่ม ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const progressPercent = (timeLeft / DURATION_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-background border border-border shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Progress Bar แสดงเวลาถอยหลัง */}
        <div className="h-1.5 w-full bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ปุ่มปิด (X) มุมขวาบน */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="ปิดการแจ้งเตือน"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-foreground">
              📢 ประกาศแจ้งเตือน
            </h3>
          </div>

          {/* Body Content */}
          <div className="space-y-4 rounded-xl bg-muted/50 p-4 border border-border/50 text-sm">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="font-medium text-foreground">
                สถานะแต่ละ Class จะคำนวณ Price คนละตัวกัน
              </p>
            </div>

            {/* Badges / Tags */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-semibold text-xs">
              <div className="rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 py-2">
                In
              </div>
              <div className="rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 py-2">
                Out
              </div>
              <div className="rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 py-2">
                WalkIn
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              ปิดให้อัตโนมัติใน <span className="font-semibold text-foreground">{timeLeft}</span> วินาที
            </span>
            <button
              onClick={handleClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              รับทราบ / ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}