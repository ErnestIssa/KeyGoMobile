import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Horizontal inset from screen edges for the floating tab bar pill. */
export const FLOATING_TAB_BAR_HORIZONTAL_INSET = 12;
/** Gap between the physical bottom of the screen and the pill (visual only). */
export const FLOATING_TAB_BAR_BOTTOM_GAP = 8;

/**
 * Approximate height of the floating pill (row + inner padding). Keep in sync with `WebTabBar` layout.
 */
export const FLOATING_TAB_BAR_PILL_HEIGHT = 92;

/** First line of content sits below the status bar; scroll view itself is full-screen. */
export function useContentTopInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.top, 0) + 8;
}

/**
 * Bottom padding for scroll content so rows can scroll through the pill blur.
 * Does not add an extra “footer band” — only overlap + home-indicator breathing room.
 */
export function useFloatingTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  return FLOATING_TAB_BAR_PILL_HEIGHT + insets.bottom + 12;
}

/** When the chat thread is open the tab bar animates away — composer only needs safe-area padding. */
export function useChatThreadComposerBottomInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 10) + 14;
}
