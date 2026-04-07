/** Lightweight pub/sub so WebTabBar can blink without prop-drilling from chat socket layer. */

const tabPulseListeners = new Set<() => void>();

export function subscribeChatTabPulse(listener: () => void): () => void {
  tabPulseListeners.add(listener);
  return () => {
    tabPulseListeners.delete(listener);
  };
}

export function emitChatTabPulse(): void {
  tabPulseListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}
