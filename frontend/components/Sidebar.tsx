'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthNav from './auth';
import { useAuth } from '../hooks/useAuth';
import {
  FiHome,
  FiBarChart,
  FiFileText,
  FiUser,
  FiShield,
  FiX,
} from 'react-icons/fi';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAX_SIDEBAR_WIDTH = 280;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const buildClipPath = (progress: number) => {
  const eased = Math.pow(progress, 0.6);
  const crest = clamp(10 + eased * 45, 12, 70);
  const bulge = clamp(crest + 20 + eased * 16, crest + 12, 94);
  const tail = clamp(crest + 3, 15, 80);
  return `polygon(0% 0%, ${crest}% 0%, ${bulge}% 30%, ${bulge - 4}% 50%, ${bulge}% 70%, ${tail}% 100%, 0% 100%)`;
};

const Sidebar = () => {
  const pathname = usePathname();
  const { user, hasRole } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [showRipple, setShowRipple] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const moveListener = useRef<(event: PointerEvent) => void>();
  const upListener = useRef<(event: PointerEvent) => void>();
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { href: '/', label: 'Dashboard', icon: FiHome },
      { href: '/analyze', label: 'Intelligence Console', icon: FiBarChart },
      { href: '/reports', label: 'Reports', icon: FiFileText },
      { href: '/profile', label: 'Profile', icon: FiUser },
    ];

    if (user && hasRole('top-secret')) {
      items.push({ href: '/clearances', label: 'Clearances', icon: FiShield });
    }

    return items;
  }, [user, hasRole]);

  const cleanupListeners = useCallback(() => {
    if (moveListener.current) {
      window.removeEventListener('pointermove', moveListener.current);
      moveListener.current = undefined;
    }
    if (upListener.current) {
      window.removeEventListener('pointerup', upListener.current);
      upListener.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupListeners();
      if (rippleTimer.current) {
        clearTimeout(rippleTimer.current);
      }
    };
  }, [cleanupListeners]);

  const triggerRipple = useCallback(() => {
    setShowContent(false);
    setShowRipple(true);
    if (rippleTimer.current) {
      clearTimeout(rippleTimer.current);
    }
    rippleTimer.current = setTimeout(() => {
      setShowRipple(false);
      setShowContent(true);
    }, 520);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowRipple(false);
      setShowContent(false);
    }
  }, [isOpen]);

  const finalizeDrag = useCallback(
    (progress: number) => {
      setIsDragging(false);
      if (progress > 0.35) {
        setIsOpen(true);
        triggerRipple();
      } else {
        setIsOpen(false);
      }
      setDragProgress(0);
    },
    [triggerRipple]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isOpen) return;
      event.preventDefault();
      setIsDragging(true);
      setDragProgress(0.05);

      const handleMove = (moveEvent: PointerEvent) => {
        const progress = clamp(
          moveEvent.clientX,
          0,
          MAX_SIDEBAR_WIDTH
        ) / MAX_SIDEBAR_WIDTH;
        setDragProgress(progress);
      };

      const handleUp = (upEvent: PointerEvent) => {
        const progress = clamp(
          upEvent.clientX,
          0,
          MAX_SIDEBAR_WIDTH
        ) / MAX_SIDEBAR_WIDTH;
        cleanupListeners();
        finalizeDrag(progress);
      };

      moveListener.current = handleMove;
      upListener.current = handleUp;

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [cleanupListeners, finalizeDrag, isOpen]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowRipple(false);
    setShowContent(false);
    setDragProgress(0);
  }, []);

  const previewWidth = useMemo(() => {
    return 24 + dragProgress * (MAX_SIDEBAR_WIDTH + 80);
  }, [dragProgress]);

  const previewClipPath = useMemo(
    () => buildClipPath(Math.max(dragProgress, 0.02)),
    [dragProgress]
  );

  const shouldShowPreview = (isDragging || (!isOpen && dragProgress > 0));

  return (
    <>
      <div
        className="fixed inset-y-0 left-0 z-[1210] w-8 cursor-ew-resize"
        onPointerDown={handlePointerDown}
        style={{
          pointerEvents: isOpen ? 'none' : 'auto',
          touchAction: 'none',
        }}
      />

      {!isOpen && !isDragging && (
        <div className="fixed inset-y-0 left-0 z-[1205] flex items-center pointer-events-none">
          <div className="ml-1 w-1.5 h-20 rounded-full bg-[#4662ab66] blur-[0.3px]" />
        </div>
      )}

      {shouldShowPreview && (
        <div
          className="fixed inset-y-0 left-0 z-[1200] pointer-events-none transition-[width]"
          style={{
            width: `${previewWidth}px`,
            transitionDuration: isDragging ? '0s' : '240ms',
          }}
        >
          <div
            className="relative h-full w-full"
            style={{
              clipPath: previewClipPath,
              background:
                'linear-gradient(90deg, rgba(198,218,236,0.68) 0%, rgba(224,242,253,0.55) 48%, rgba(70,98,171,0.62) 100%)',
              filter: 'drop-shadow(12px 0 28px rgba(70,98,171,0.28))',
              transition: isDragging
                ? 'none'
                : 'clip-path 0.26s ease, filter 0.26s ease',
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(224,242,253,0.6),transparent_65%)] opacity-70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_60%,rgba(70,98,171,0.45),transparent_70%)] opacity-60" />
          </div>
        </div>
      )}

      <aside
        className="fixed inset-y-0 left-0 z-[1190] overflow-hidden transition-[width] duration-[420ms] ease-out"
        style={{
          width: isOpen ? MAX_SIDEBAR_WIDTH : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div className="relative h-full bg-[#171717] border-r border-[rgba(198,218,236,0.22)] text-[#e0f2fd]">
          {showRipple && <div className="sidebar-ripple absolute inset-0" />}

          <div
            className={`relative flex h-full flex-col px-6 py-6 transition-all duration-300 ease-out ${
              showContent
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-6 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="/nautilink-logo-white.png"
                    alt="Nautilink"
                    className="w-9 h-9 rounded-md border border-[rgba(224,242,253,0.18)]"
                  />
                  <span className="absolute -inset-1 rounded-md border border-[rgba(70,98,171,0.35)] opacity-30" />
                </div>
                <span className="text-xl font-semibold tracking-[0.35em] uppercase">
                  Nautilink
                </span>
              </div>
              <button
                aria-label="Close sidebar"
                onClick={handleClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(198,218,236,0.25)] text-[#c6daec] transition-colors hover:bg-[#4662ab1a] hover:text-[#e0f2fd]"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 h-px bg-gradient-to-r from-[#e0f2fd66] via-[#c0d9ef22] to-transparent" />

            <nav className="mt-6 flex flex-col space-y-2">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`relative flex h-11 items-center rounded-xl px-4 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#4662ab33] text-[#e0f2fd] border-l-2 border-[#4662ab]'
                        : 'text-[#d2deea] hover:text-[#e0f2fd] hover:bg-[#4662ab1f]'
                    }`}
                  >
                    <IconComponent className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 hover:opacity-100 bg-[radial-gradient(circle_at_left,rgba(198,218,236,0.18),transparent_65%)]" />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto">
              <div className="h-px bg-gradient-to-r from-transparent via-[#4662ab33] to-transparent mb-4" />
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-[#c0d9ef]">
                  Session
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-[rgba(198,218,236,0.22)] bg-[#171717] px-4 py-4 shadow-[0_18px_40px_rgba(10,16,33,0.32)]">
                <AuthNav />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
