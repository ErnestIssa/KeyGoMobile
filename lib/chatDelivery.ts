import type { ChatMessage, MessageDeliveryStatus } from '../services/api';

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

/**
 * Outgoing bubble label: prefer realtime `deliveryStatus` from socket/API, then read receipts,
 * then time-based heuristic (avoids waiting ~2.5s when `message_delivery` already arrived).
 */
export function mineBubbleDeliveryStatus(
  item: Pick<ChatMessage, 'createdAt' | 'deliveryStatus'>,
  peerLastReadAtIso: string | null | undefined
): MessageDeliveryStatus {
  if (peerLastReadAtIso) {
    const peer = new Date(peerLastReadAtIso).getTime();
    const sent = new Date(item.createdAt).getTime();
    if (!Number.isNaN(peer) && !Number.isNaN(sent) && peer >= sent) {
      return 'read';
    }
  }
  if (item.deliveryStatus === 'delivered' || item.deliveryStatus === 'read') {
    return item.deliveryStatus;
  }
  return outgoingDeliveryStatus(item.createdAt, peerLastReadAtIso);
}
