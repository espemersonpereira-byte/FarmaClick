import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';

type BackInterceptor = () => boolean;

const backInterceptors: Set<BackInterceptor> = new Set();

/**
 * Allows any open modal or sub-screen to intercept a swipe-back gesture
 * (for example, closing an open modal before navigating back to the previous tab).
 * If the callback returns true, the swipe-back was handled by the modal.
 */
export function useSwipeBackInterceptor(isActive: boolean, onBack: () => void) {
  useEffect(() => {
    if (!isActive) return;
    const handler: BackInterceptor = () => {
      onBack();
      return true;
    };
    backInterceptors.add(handler);
    return () => {
      backInterceptors.delete(handler);
    };
  }, [isActive, onBack]);
}

export function triggerActiveBackInterceptor(): boolean {
  if (backInterceptors.size > 0) {
    const handlers = Array.from(backInterceptors);
    const latestHandler = handlers[handlers.length - 1];
    if (latestHandler && latestHandler()) {
      return true;
    }
  }
  return false;
}

interface SwipeBackContainerProps {
  canGoBack: boolean;
  previousLabel?: string;
  onSwipeBack: () => void;
  children: React.ReactNode;
}

export const SwipeBackContainer: React.FC<SwipeBackContainerProps> = ({
  canGoBack,
  previousLabel,
  onSwipeBack,
  children
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartY, setDragStartY] = useState(250);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const isCanceledRef = useRef(false);
  const currentOffsetRef = useRef(0);

  // Trigger threshold in pixels (dragging from left toward center)
  const TRIGGER_THRESHOLD = 75;
  const MAX_DRAG = 150;
  // Allow starting the drag from the left 90px of the screen (or wider if not on an interactive input)
  const LEFT_ZONE_WIDTH = 90;

  const hasActiveInterceptor = () => backInterceptors.size > 0;
  const isBackAvailable = canGoBack || hasActiveInterceptor();

  const triggerBackAction = useCallback(() => {
    // Check if an open modal registered an interceptor (LIFO order)
    if (backInterceptors.size > 0) {
      const handlers = Array.from(backInterceptors);
      const latestHandler = handlers[handlers.length - 1];
      if (latestHandler && latestHandler()) {
        return;
      }
    }
    if (canGoBack) {
      onSwipeBack();
    }
  }, [canGoBack, onSwipeBack]);

  const shouldIgnoreTarget = (target: EventTarget | null, clientX: number): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    // If starting outside the left edge zone, ignore if inside inputs, textareas, selects, or horizontal scrollables
    const tagName = target.tagName.toLowerCase();
    if (clientX > 45 && (tagName === 'input' || tagName === 'textarea' || tagName === 'select')) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!isBackAvailable || e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Must start on the left side of the screen
      if (touch.clientX > LEFT_ZONE_WIDTH) return;
      if (shouldIgnoreTarget(e.target, touch.clientX)) return;

      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      setDragStartY(touch.clientY);
      isTrackingRef.current = true;
      isCanceledRef.current = false;
      currentOffsetRef.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingRef.current || isCanceledRef.current || startXRef.current === null || startYRef.current === null) {
        return;
      }
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);

      // If user is scrolling vertically more than horizontally early on, cancel swipe-back
      if (deltaX < 18 && deltaY > 22) {
        isCanceledRef.current = true;
        isTrackingRef.current = false;
        setIsDragging(false);
        setDragOffset(0);
        currentOffsetRef.current = 0;
        return;
      }

      if (deltaX > 10 && deltaX > deltaY * 1.15) {
        const clamped = Math.min(MAX_DRAG, deltaX);
        currentOffsetRef.current = clamped;
        setIsDragging(true);
        setDragOffset(clamped);
      }
    };

    const handleTouchEnd = () => {
      if (!isTrackingRef.current) return;
      const finalOffset = currentOffsetRef.current;
      isTrackingRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      currentOffsetRef.current = 0;
      setIsDragging(false);
      setDragOffset(0);

      if (finalOffset >= TRIGGER_THRESHOLD) {
        triggerBackAction();
      }
    };

    // Also support mouse drag from the left side so desktop/preview users can test & use it
    const handleMouseDown = (e: MouseEvent) => {
      if (!isBackAvailable || e.button !== 0) return;
      if (e.clientX > LEFT_ZONE_WIDTH) return;
      if (shouldIgnoreTarget(e.target, e.clientX)) return;

      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      setDragStartY(e.clientY);
      isTrackingRef.current = true;
      isCanceledRef.current = false;
      currentOffsetRef.current = 0;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isTrackingRef.current || isCanceledRef.current || startXRef.current === null || startYRef.current === null) {
        return;
      }
      const deltaX = e.clientX - startXRef.current;
      const deltaY = Math.abs(e.clientY - startYRef.current);

      if (deltaX < 18 && deltaY > 25) {
        isCanceledRef.current = true;
        isTrackingRef.current = false;
        setIsDragging(false);
        setDragOffset(0);
        currentOffsetRef.current = 0;
        return;
      }

      if (deltaX > 12 && deltaX > deltaY) {
        const clamped = Math.min(MAX_DRAG, deltaX);
        currentOffsetRef.current = clamped;
        setIsDragging(true);
        setDragOffset(clamped);
      }
    };

    const handleMouseUp = () => {
      if (!isTrackingRef.current) return;
      const finalOffset = currentOffsetRef.current;
      isTrackingRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      currentOffsetRef.current = 0;
      setIsDragging(false);
      setDragOffset(0);

      if (finalOffset >= TRIGGER_THRESHOLD) {
        triggerBackAction();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);

      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isBackAvailable, triggerBackAction]);

  const isReadyToTrigger = dragOffset >= TRIGGER_THRESHOLD;
  const progress = Math.min(1, dragOffset / TRIGGER_THRESHOLD);

  return (
    <div className="relative min-h-screen">
      {/* Visual Edge Swipe Indicator (Left side -> Center) */}
      {isDragging && dragOffset > 8 && (
        <div
          className="fixed left-0 z-[100] pointer-events-none flex items-center"
          style={{
            top: `${Math.max(80, Math.min(window.innerHeight - 100, dragStartY - 24))}px`,
            transform: `translateX(${Math.min(95, dragOffset * 0.65)}px)`
          }}
        >
          <div
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2.5 shadow-2xl border transition-colors duration-150 ${
              isReadyToTrigger
                ? 'bg-sky-600 text-white border-sky-400 scale-105'
                : 'bg-slate-900/90 text-white border-white/20'
            }`}
            style={{
              opacity: Math.max(0.35, progress)
            }}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.8]" />
            <span className="text-xs font-extrabold whitespace-nowrap pr-1">
              {isReadyToTrigger
                ? hasActiveInterceptor()
                  ? 'Solte para voltar'
                  : previousLabel
                  ? `Voltar para ${previousLabel}`
                  : 'Solte para voltar'
                : 'Arraste para voltar'}
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
