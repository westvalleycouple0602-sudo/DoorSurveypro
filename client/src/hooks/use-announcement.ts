import { useEffect, useRef } from "react";

/**
 * Creates a live region announcement for screen readers.
 * Useful for dynamic content updates that need to be announced.
 */
export function useAnnouncement() {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region on mount
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    document.body.appendChild(liveRegion);
    announcementRef.current = liveRegion;

    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
      }
    };
  }, []);

  const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute("aria-live", priority);
      announcementRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = "";
        }
      }, 1000);
    }
  };

  return { announce };
}
