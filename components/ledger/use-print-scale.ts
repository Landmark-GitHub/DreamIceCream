'use client';

import { RefObject, useEffect } from 'react';
import { Bill } from '@/lib/types';
import { LedgerMode } from '@/lib/ledger-utils';

const A5_HEIGHT_PX = 794;

export function usePrintScale(
  enabled: boolean,
  printContentRef: RefObject<HTMLDivElement | null>,
  printAreaRef: RefObject<HTMLDivElement | null>,
  deps: unknown[]
) {
  useEffect(() => {
    if (!enabled || !printContentRef.current || !printAreaRef.current) return;

    const el = printContentRef.current;
    el.style.fontSize = '';
    el.style.transform = '';
    el.style.transformOrigin = '';

    const contentH = el.scrollHeight;
    if (contentH > A5_HEIGHT_PX) {
      const scale = A5_HEIGHT_PX / contentH;
      const safeScale = Math.max(scale, 0.65);
      el.style.transform = `scale(${safeScale})`;
      el.style.transformOrigin = 'top center';
      printAreaRef.current.style.height = `${contentH * safeScale}px`;
    } else {
      printAreaRef.current.style.height = 'auto';
    }
  }, [enabled, printContentRef, printAreaRef, ...deps]);
}
