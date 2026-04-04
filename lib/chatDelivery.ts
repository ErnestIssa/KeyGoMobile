import type { MessageDeliveryStatus } from '../services/api';

const DELIVERED_AFTER_MS = 2500;

/** Matches server `outgoingMessageUiStatus` for live peer read updates. */
export function outgoingDeliveryStatus(
  messageCreatedAtIso: string,
  peerLastReadAtIso: string | null | undefined
): MessageDeliveryStatus {
  if (peerLastReadAtIso) {
    const peer = new Date(peerLastReadAtIso).getTime();
    const sent = new Date(messageCreatedAtIso).getTime();
    if (!Number.isNaN(peer) && !Number.isNaN(sent) && peer >= sent) {
      return 'read';
    }
  }
  const age = Date.now() - new Date(messageCreatedAtIso).getTime();
  if (age >= DELIVERED_AFTER_MS) {
    return 'delivered';
  }
  return 'sent';
}
