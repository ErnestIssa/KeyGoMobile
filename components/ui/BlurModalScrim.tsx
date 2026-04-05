import { BlurView } from 'expo-blur';
import { Modal, Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  /** Merged with default backdrop: flex 1, centered content */
  backdropStyle?: StyleProp<ViewStyle>;
};

export function BlurModalScrim({ visible, onRequestClose, children, backdropStyle }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 55 : 90}
        tint="dark"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={styles.blurRoot}
      >
        <Pressable style={[styles.backdrop, backdropStyle]} onPress={onRequestClose}>
          <Pressable onPress={(e) => e.stopPropagation()}>{children}</Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
