import { useEffect } from 'react';
import { useLocation } from 'wouter';

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'utility';
  route?: string;
}

const navigationShortcuts: Record<string, { route: string; description: string }> = {
  'd': { route: '/', description: 'Go to Dashboard' },
  'p': { route: '/projects', description: 'Go to Projects' },
  'n': { route: '/projects/new', description: 'New Project' },
  'h': { route: '/hardware-schedule', description: 'Hardware Schedule' },
  'a': { route: '/analytics', description: 'View Analytics' },
  'm': { route: '/manufacturers', description: 'Manufacturers' },
  'o': { route: '/purchase-orders', description: 'Purchase Orders' },
  'c': { route: '/catalog', description: 'Catalog' },
  't': { route: '/team', description: 'Team Management' },
  's': { route: '/profile', description: 'Settings & Profile' },
};

export interface KeyboardShortcutsOptions {
  onOpenCommandPalette?: () => void;
  onOpenHelp?: () => void;
  onOpenSearch?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    let gPressed = false;
    let gPressedTime = 0;
    const G_TIMEOUT = 1000; // Reset 'g' state after 1 second
    
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Skip if user is typing in input field or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }
      
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        options.onOpenCommandPalette?.();
        return;
      }

      // ? for help modal (shift + / on most keyboards)
      if (e.key === '?' && options.onOpenHelp) {
        e.preventDefault();
        options.onOpenHelp();
        return;
      }

      // / for global search
      if (e.key === '/' && options.onOpenSearch) {
        e.preventDefault();
        options.onOpenSearch();
        return;
      }
      
      // Skip if user is holding modifier keys (except for our specific shortcuts)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      
      // Handle 'g' key for g+ shortcuts (e.g., g+d, g+p)
      if (e.key.toLowerCase() === 'g') {
        const now = Date.now();
        if (!gPressed || now - gPressedTime > G_TIMEOUT) {
          // First 'g' press or timeout expired - reset
          gPressed = true;
          gPressedTime = now;
          e.preventDefault();
          return;
        }
      }
      
      // Handle g+ shortcuts (second key after 'g')
      if (gPressed && Date.now() - gPressedTime < G_TIMEOUT) {
        const shortcut = navigationShortcuts[e.key.toLowerCase()];
        if (shortcut) {
          e.preventDefault();
          setLocation(shortcut.route);
          gPressed = false; // Reset g state after navigation
          return;
        }
        // Invalid second key - reset g state
        gPressed = false;
        return;
      }
      
      // Single-key navigation shortcuts (also work without 'g')
      const shortcut = navigationShortcuts[e.key.toLowerCase()];
      if (shortcut) {
        e.preventDefault();
        setLocation(shortcut.route);
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setLocation, options]);

  return {
    shortcuts: navigationShortcuts,
  };
}

export function getAllShortcuts(): KeyboardShortcut[] {
  return [
    {
      key: '⌘K / Ctrl+K',
      description: 'Open command palette',
      category: 'utility',
    },
    {
      key: '/',
      description: 'Global search',
      category: 'utility',
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      category: 'utility',
    },
    ...Object.entries(navigationShortcuts).map(([key, { route, description }]) => ({
      key: `${key.toUpperCase()} or G+${key.toUpperCase()}`,
      description,
      category: 'navigation' as const,
      route,
    })),
  ];
}
