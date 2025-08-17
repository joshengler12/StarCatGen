import { MSG } from '../lib/schema.js';

//sends data out(payload) and labels it with a type
export function send(targetWindow, type, payload) {
  try { targetWindow?.postMessage({ type, payload }, '*'); } catch {}
}

//listens for data and executes
export function on(type, code) {
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== type) return;
    code(e.data.payload, e);
  });
}

