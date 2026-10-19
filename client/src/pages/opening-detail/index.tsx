/**
 * Opening Detail - Modular Architecture
 * 
 * This module uses a shell + lazy-loaded panels pattern to reduce bundle size:
 * - Shell: Handles data fetching, shared state, and navigation
 * - Panels: Feature-specific UI loaded on-demand when tabs are accessed
 * 
 * Bundle optimization:
 * - Heavy components (Photos, Hardware, AR, Validation) lazy-loaded
 * - Lightweight components (Specifications, Notes) in main bundle
 * - Context provider avoids prop drilling and circular dependencies
 */

export { default } from "./shell";
