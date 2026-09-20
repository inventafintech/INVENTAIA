import { ComponentType } from 'react';
import { LucideProps } from 'lucide-react';
import {
  NAVIGATION_CONFIG,
  NavItemConfig,
  NavGroupConfig,
} from './navigationConfig';

export type SidebarItemConfig = NavItemConfig;
export type SidebarGroupConfig = NavGroupConfig;

export const SIDEBAR_CONFIG: SidebarGroupConfig[] = NAVIGATION_CONFIG;
