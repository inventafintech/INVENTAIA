'use client';

import React from 'react';
import Link from 'next/link';
import { NavItemConfig } from '@/config/navigationConfig';

export interface SidebarItemProps {
  item: NavItemConfig;
  isActive: boolean;
  badgeCount?: number;
  isCollapsed?: boolean;
}

export function SidebarItem({
  item,
  isActive,
  badgeCount = 0,
  isCollapsed = false,
}: SidebarItemProps) {
  const { href, label, sublabel, icon: Icon } = item;
  const showBadge = badgeCount > 0;

  return (
    <div className="relative group">
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        aria-label={isCollapsed ? `${label}${sublabel ? ` - ${sublabel}` : ''}` : undefined}
        className={`
          relative flex items-center min-h-[42px] px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-150 outline-none select-none
          ${
            isActive
              ? 'bg-slate-900 text-white shadow-xs shadow-slate-900/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }
          ${isCollapsed ? 'justify-center px-0 w-full' : 'gap-3'}
        `}
      >
        {/* Active Pill Bar Indicator (When Expanded) */}
        {isActive && !isCollapsed && (
          <span
            className="absolute left-0 top-2 bottom-2 w-1 bg-amber-400 rounded-r-full"
            aria-hidden="true"
          />
        )}

        {/* Icon Container */}
        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
          <Icon
            size={19}
            strokeWidth={1.5}
            className={`transition-colors duration-150 ${
              isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-800'
            }`}
          />
          {/* Floating Dot Badge when Collapsed */}
          {isCollapsed && showBadge && (
            <span
              className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-xs"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Label and Sublabel (Visible when Expanded) */}
        {!isCollapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate leading-tight text-[13px] font-semibold">{label}</span>
            {sublabel && (
              <span
                className={`text-[10.5px] truncate font-normal leading-tight mt-0.5 ${
                  isActive ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-500'
                }`}
              >
                {sublabel}
              </span>
            )}
          </div>
        )}

        {/* Numerical Badge Pill (Visible when Expanded & Count > 0) */}
        {!isCollapsed && showBadge && (
          <span
            className={`
              ml-auto shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full leading-none shadow-xs
              ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-extrabold'
                  : 'bg-rose-500 text-white'
              }
            `}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>

      {/* Sleek Floating Hover Tooltip (Visible when Collapsed) */}
      {isCollapsed && (
        <div
          role="tooltip"
          className="fixed left-[76px] z-50 hidden group-hover:flex flex-col bg-slate-900 text-white px-3 py-1.5 rounded-md shadow-xl border border-slate-800 text-xs whitespace-nowrap pointer-events-none transition-all duration-150 opacity-0 group-hover:opacity-100"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[12px]">{label}</span>
            {showBadge && (
              <span className="bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </div>
          {sublabel && (
            <span className="text-[10px] text-slate-400 font-normal mt-0.5">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

