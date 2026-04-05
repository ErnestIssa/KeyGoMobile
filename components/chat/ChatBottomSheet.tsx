import { BlurView } from 'expo-blur';
import { Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  /** Extra style for the sheet panel (e.g. maxHeight) */
  sheetStyle?: ViewStyle;
};

/** Blurred backdrop + panel anchored to the bottom (drag-style modal). */
export function ChatBottomSheet({ visible, onRequestClose, children, sheetStyle }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onRequestClose}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 45 : 85}
        tint="dark"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={styles.backdrop} onPress={onRequestClose}>
          <Pressable style={[styles.sheet, sheetStyle]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            {children}
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 8,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },
});
