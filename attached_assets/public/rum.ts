import { onCLS, onFID, onLCP } from 'web-vitals';
const post = (path: string, payload: any) => {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) return navigator.sendBeacon(path, new Blob([body], { type: 'application/json' }));
  return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
};
export const initRUM = (userId?: string, variant?: string) => {
  onCLS(v => post('/rum', { name: 'CLS', value: v.value, userId, variant }));
  onFID(v => post('/rum', { name: 'FID', value: v.value, userId, variant }));
  onLCP(v => post('/rum', { name: 'LCP', value: v.value, userId, variant }));
  window.addEventListener('error', (e: any) => post('/event', { event: 'client_error', userId, msg: e.message, stack: String(e.error?.stack || '') }));
};
