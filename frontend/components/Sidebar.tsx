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
} from 'react-icons/fi';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAX_SIDEBAR_WIDTH = 280;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const buildClipPath = (progress: number, verticalBias: number) => {
  const eased = Math.pow(progress, 0.68);
  const crest = clamp(8 + eased * 44, 10, 72);
  const baseBulge = clamp(crest + 16 + eased * 18, crest + 12, 88);
  const curveGain = clamp(10 + eased * 24, 12, 28);
  const waveMid = clamp(baseBulge + curveGain, baseBulge + 6, 96);
  const wavePeak = clamp(waveMid + curveGain * 0.65, waveMid + 4, 100);
  const tail = clamp(crest + 4, 14, 78);

  const clampedVertical = clamp01(verticalBias);
  const center = clamp(18 + clampedVertical * 72, 22, 86);
  const spread = clamp(30 + eased * 18, 28, 44);
  const top = clamp(center - spread, 6, 50);
  const upperMid = clamp(center - spread * 0.45, top + 2, center - 8);
  const lowerMid = clamp(center + spread * 0.45, center + 8, center + spread - 2);
  const bottom = clamp(center + spread, center + 10, 98);

  return `polygon(0% 0%, ${crest}% 0%, ${baseBulge}% ${top}%, ${waveMid}% ${upperMid}%, ${wavePeak}% ${center}%, ${waveMid}% ${lowerMid}%, ${baseBulge}% ${bottom}%, ${tail}% 100%, 0% 100%)`;
};

const Sidebar = () => {
  const pathname = usePathname();
  const { user, hasRole } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [showRipple, setShowRipple] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [anchorRotated, setAnchorRotated] = useState(false);
  const [fishAnimationKey, setFishAnimationKey] = useState(0);
  const [dragPointerProgress, setDragPointerProgress] = useState(0.5);

  const moveListener = useRef<((event: PointerEvent) => void) | null>(null);
  const upListener = useRef<((event: PointerEvent) => void) | null>(null);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      moveListener.current = null;
    }
    if (upListener.current) {
      window.removeEventListener('pointerup', upListener.current);
      upListener.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupListeners();
      if (rippleTimer.current) {
        clearTimeout(rippleTimer.current);
      }
      if (anchorTimer.current) {
        clearTimeout(anchorTimer.current);
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
      if (anchorTimer.current) {
        clearTimeout(anchorTimer.current);
      }
      setAnchorRotated(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setAnchorRotated(false);
      if (anchorTimer.current) {
        clearTimeout(anchorTimer.current);
      }
      anchorTimer.current = setTimeout(() => {
        setAnchorRotated(true);
      }, 80);
    }
    if (isOpen) {
      setFishAnimationKey((prev) => prev + 1);
    }
    return () => {
      if (anchorTimer.current) {
        clearTimeout(anchorTimer.current);
      }
    };
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
      setDragPointerProgress(
        typeof window !== 'undefined' && window.innerHeight
          ? clamp01(event.clientY / window.innerHeight)
          : 0.5
      );

      const handleMove = (moveEvent: PointerEvent) => {
        const progress = clamp(
          moveEvent.clientX,
          0,
          MAX_SIDEBAR_WIDTH
        ) / MAX_SIDEBAR_WIDTH;
        setDragProgress(progress);
        if (typeof window !== 'undefined' && window.innerHeight) {
          const yRatio = clamp01(moveEvent.clientY / window.innerHeight);
          setDragPointerProgress((prev) => {
            const blended = prev + (yRatio - prev) * 0.35;
            return clamp01(blended);
          });
        }
      };

      const handleUp = (upEvent: PointerEvent) => {
        const progress = clamp(
          upEvent.clientX,
          0,
          MAX_SIDEBAR_WIDTH
        ) / MAX_SIDEBAR_WIDTH;
        cleanupListeners();
        finalizeDrag(progress);
        setDragPointerProgress(0.5);
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
    () => buildClipPath(Math.max(dragProgress, 0.02), dragPointerProgress),
    [dragProgress, dragPointerProgress]
  );

  const handleOffset = useMemo(() => {
    if (isOpen) {
      return { x: 0, y: '50%' };
    }
    if (isDragging) {
      return {
        x: 16 + dragProgress * MAX_SIDEBAR_WIDTH,
        y: `${dragPointerProgress * 100}%`,
      };
    }
    return { x: 16, y: '50%' };
  }, [dragProgress, isDragging, isOpen]);

  const shouldShowPreview = (isDragging || (!isOpen && dragProgress > 0));

  return (
    <>
      <div
        className="fixed inset-y-0 z-[1210] flex items-center cursor-ew-resize transition-opacity duration-200"
        onPointerDown={handlePointerDown}
        style={{
          pointerEvents: isOpen ? 'none' : 'auto',
          touchAction: 'none',
          opacity: isOpen ? 0 : isDragging ? 0.6 : 1,
          transform: `translate(${handleOffset.x}px, calc(${handleOffset.y} - 50%))`,
          willChange: 'transform, opacity',
        }}
      >
        <img
          src="/anchor-arrow-blue.png"
          alt="Open sidebar"
          className="h-16 w-auto select-none object-contain drop-shadow-[0_0_18px_rgba(70,98,171,0.36)]"
          style={{ transform: 'rotate(-90deg)' }}
          draggable={false}
        />
      </div>

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
              background: `
                radial-gradient(120% 120% at 12% ${dragPointerProgress * 100}%,
                  rgba(198,218,236,0.75) 0%,
                  rgba(224,242,253,0.45) 45%,
                  transparent 78%),
                radial-gradient(90% 110% at 64% ${clamp01(dragPointerProgress + 0.12) * 100}%,
                  rgba(70,98,171,0.5) 0%,
                  rgba(70,98,171,0.12) 55%,
                  transparent 82%),
                linear-gradient(96deg, rgba(198,218,236,0.42) 0%, rgba(192,217,239,0.2) 35%, rgba(70,98,171,0.52) 100%)
              `,
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
              <div className="relative flex items-center justify-center">
                <span className="absolute inset-0 flex items-center justify-center opacity-50">
                  <img
                    src="/fish-sidebar.png"
                    alt=""
                    draggable={false}
                    key={fishAnimationKey}
                    className={`pointer-events-none max-h-12 w-auto object-contain ${
                      isOpen ? 'sidebar-fish-flight' : ''
                    }`}
                  />
                </span>
                <span className="relative text-xl font-semibold tracking-[0.35em] uppercase">
                  Nautilink
                </span>
              </div>
              <button
                aria-label="Close sidebar"
                onClick={handleClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(198,218,236,0.25)] transition-colors hover:bg-[#4662ab1a]"
              >
                <img
                  src="/anchor-arrow.png"
                  alt="Close sidebar"
                  className="h-4 w-4 object-contain"
                  style={{
                    transform: anchorRotated ? 'rotate(90deg)' : 'rotate(-90deg)',
                    transition: anchorRotated ? 'transform 1.5s ease' : 'none',
                  }}
                  draggable={false}
                />
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
