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

  // Conmutar apertura/cierre de grupo
  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Comprobación de ruta activa
  const isItemActive = (href: string): boolean => {
    if (pathname === href) return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <aside
      className={`
        w-64 h-screen sticky top-0 flex flex-col bg-slate-50 border-r border-slate-200
        select-none overflow-hidden shrink-0 z-40 ${className}
      `}
      aria-label="Navegación lateral"
    >
      {/* Contenedor scrolleable de navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        {SIDEBAR_CONFIG.map((group: SidebarGroupConfig) => {
          const isOpen = openGroups[group.id] ?? true;

          return (
            <div key={group.id} className="flex flex-col">
              {/* Encabezado del Grupo (Botón Acordeón) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-900 transition-colors rounded-md group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span>{group.title}</span>
                {isOpen ? (
                  <ChevronUp
                    className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform"
                    strokeWidth={1.5}
                  />
                ) : (
                  <ChevronDown
                    className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform"
                    strokeWidth={1.5}
                  />
                )}
              </button>

              {/* Lista de Enlaces (Colapsable) */}
              {isOpen && (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item: SidebarItemConfig) => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href);

                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`
                            group flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-lg text-sm
                            transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                            ${
                              active
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-normal'
                            }
                          `}
                        >
                          <Icon
                            className={`w-5 h-5 shrink-0 transition-colors duration-150 ${
                              active
                                ? 'text-blue-600'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                            strokeWidth={1.5}
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
