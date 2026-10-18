/**
 * MAXIM GROUP BRAND DESIGN SYSTEM TOKENS
 * Derived from the official Maxim Group public brand (https://maximgrp.com.au/)
 * Electrical engineering, high voltage, rail & hyperscale data centre infrastructure.
 */

export const MAXIM_THEME = {
  // Brand Colours
  colors: {
    // Primary Corporate Foundation
    navy: {
      950: '#070D18', // Deepest executive navy
      900: '#0B132B', // Main brand midnight navy
      850: '#0F1A36', // Header and navigation bar
      800: '#172554', // Card dark accent
      700: '#1E3A8A', // Subtitle & accent blue
      100: '#DBEAFE', // Soft blue tint
      50: '#EFF6FF',  // Light blue wash
    },
    // Strategic Maxim Gold/Amber Accent (Used intentionally: ACTIVE, PRIMARY, IMPORTANT)
    accent: {
      gold: '#F59E0B',      // Primary active / highlight
      goldDark: '#D97706',  // Hover / focus
      goldLight: '#FEF3C7', // Soft accent container
      goldBorder: '#FCD34D',// Focus border
    },
    // High-Readability Work Surfaces (Reduces dense dark-on-dark stacking)
    surface: {
      canvas: '#F8FAFC',    // Light neutral page background
      card: '#FFFFFF',      // White operational card
      cardSubtle: '#F1F5F9',// Light grey section container
      border: '#E2E8F0',    // Clean subtle card border
      borderStrong: '#CBD5E1', // Table header separator
    },
    // Status Semantic Tokens (Always accompanied by icon + text + label)
    status: {
      success: {
        bg: '#ECFDF5',
        text: '#065F46',
        border: '#A7F3D0',
        dot: '#10B981',
        label: 'Approved / Pass',
      },
      warning: {
        bg: '#FFFBEB',
        text: '#92400E',
        border: '#FDE68A',
        dot: '#F59E0B',
        label: 'Requires Attention',
      },
      danger: {
        bg: '#FEF2F2',
        text: '#991B1B',
        border: '#FECACA',
        dot: '#EF4444',
        label: 'Defect / Critical',
      },
      info: {
        bg: '#EFF6FF',
        text: '#1E40AF',
        border: '#BFDBFE',
        dot: '#3B82F6',
        label: 'In Progress',
      },
    },
  },

  // Button Hierarchy Classes (Consistent, predictable interactive patterns)
  buttons: {
    primary:
      'inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-97 cursor-pointer',
    secondary:
      'inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs transition-all shadow-xs active:scale-97 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750',
    tertiary:
      'inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium text-xs transition-colors cursor-pointer',
    danger:
      'inline-flex items-center justify-center px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-all cursor-pointer dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300',
  },

  // Card Hierarchy Classes
  cards: {
    default:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-all',
    featured:
      'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl shadow-md',
    headerNavy:
      'bg-slate-900 text-white border-b border-slate-800 px-5 py-4 rounded-t-2xl',
  },
};
