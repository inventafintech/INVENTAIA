'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SIDEBAR_CONFIG, SidebarGroupConfig, SidebarItemConfig } from '@/config/sidebarConfig';

interface SidebarProps {
  className?: string;
  pendingOrdersCount?: number;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname() || '';

  // Estado del acordeón: todas las secciones abiertas por defecto
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    SIDEBAR_CONFIG.reduce((acc, group) => {
      acc[group.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isItemActive = (item: SidebarItemConfig): boolean => {
    if (pathname === item.href) return true;
    if (
      item.aliases &&
      item.aliases.some(
        (alias) => pathname === alias || (alias !== '/' && pathname.startsWith(alias))
      )
    ) {
      return true;
    }
    if (item.href !== '/' && pathname.startsWith(item.href)) return true;
    return false;
  };

  return (
    <aside
      className={`
        w-[230px] h-screen sticky top-0 flex flex-col bg-white border-r border-slate-200
        select-none overflow-hidden shrink-0 z-40 ${className}
      `}
      aria-label="Navegación lateral"
    >
      {/* Contenedor scrolleable idéntico al diseño */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {SIDEBAR_CONFIG.map((group: SidebarGroupConfig) => {
          const isOpen = openGroups[group.id] ?? true;

          return (
            <div key={group.id} className="flex flex-col">
              {/* Encabezado del Grupo (Acordeón) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors duration-150 outline-none cursor-pointer text-slate-700 hover:text-slate-900 hover:bg-slate-50/60"
              >
                <span className="text-[11.5px] font-semibold tracking-wider uppercase text-slate-700">
                  {group.title}
                </span>
                {isOpen ? (
                  <ChevronUp
                    size={15}
                    strokeWidth={1.8}
                    className="shrink-0 text-slate-500 transition-transform"
                  />
                ) : (
                  <ChevronDown
                    size={15}
                    strokeWidth={1.8}
                    className="shrink-0 text-slate-500 transition-transform"
                  />
                )}
              </button>

              {/* Lista de Enlaces */}
              {isOpen && (
                <ul className="mt-0.5 mb-1 space-y-0.5">
                  {group.items.map((item: SidebarItemConfig) => {
                    const Icon = item.icon;
                    const active = isItemActive(item);

                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`
                            flex items-center gap-3 px-2.5 py-1.5 rounded-md text-[13px] transition-colors duration-150 outline-none
                            ${
                              active
                                ? 'text-slate-900 font-medium bg-slate-50'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal'
                            }
                          `}
                        >
                          <Icon
                            size={18}
                            strokeWidth={1.6}
                            className={`shrink-0 ${
                              active ? 'text-slate-800' : 'text-slate-600'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
