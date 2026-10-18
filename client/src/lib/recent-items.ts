export interface RecentItem {
  id: string;
  type: "project" | "opening" | "quote";
  title: string;
  subtitle?: string;
  url: string;
  timestamp: number;
}

const STORAGE_KEY = "doorsurvey_recent_items";
const MAX_ITEMS = 5;
const UPDATE_EVENT = "recent-items:update";

export class RecentItemsService {
  static getRecentItems(): RecentItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const items = JSON.parse(stored) as RecentItem[];
      return items.slice(0, MAX_ITEMS);
    } catch {
      return [];
    }
  }

  static addRecentItem(item: Omit<RecentItem, "timestamp">): void {
    try {
      const items = this.getRecentItems();
      
      // Remove duplicate if exists
      const filtered = items.filter(
        (i) => !(i.id === item.id && i.type === item.type)
      );
      
      // Add new item at the beginning
      const updated = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      // Notify listeners of update
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    } catch (error) {
      console.error("Failed to save recent item:", error);
    }
  }

  static clearRecentItems(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      
      // Notify listeners of update
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    } catch (error) {
      console.error("Failed to clear recent items:", error);
    }
  }

  static onUpdate(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener(UPDATE_EVENT, handler);
    
    // Return cleanup function
    return () => window.removeEventListener(UPDATE_EVENT, handler);
  }
}
