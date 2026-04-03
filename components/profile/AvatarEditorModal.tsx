import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { clamp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { hapticLight, hapticSelection } from '../../services/haptics';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import { radii } from '../../theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Resolved remote URL (with cache-bust) or undefined if no avatar */
  initialRemoteUri?: string;
  initialLetter: string;
  /** Upload edited image; modal shows loading while this runs */
  onApplyUpload: (dataUri: string) => Promise<void>;
};

function clampScale(v: number) {
  'worklet';
  return clamp(v, 1, 4);
}

function AndroidZoomImage({
  uri,
  displayW,
  displayH,
}: {
  uri: string;
  displayW: number;
  displayH: number;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const stx = useSharedValue(0);
  const sty = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    stx.value = 0;
    sty.value = 0;
  }, [uri, scale, savedScale, tx, ty, stx, sty]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clampScale(savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      }
      if (scale.value > 4) {
        scale.value = withTiming(4);
        savedScale.value = 4;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = stx.value + e.translationX;
      ty.value = sty.value + e.translationY;
    })
    .onEnd(() => {
      stx.value = tx.value;
      sty.value = ty.value;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
      <Animated.View style={[styles.zoomBox, { width: displayW, height: displayH }, animStyle]}>
        <Image source={{ uri }} style={{ width: displayW, height: displayH }} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

export function AvatarEditorModal({
  visible,
  onClose,
  initialRemoteUri,
  initialLetter,
  onApplyUpload,
}: Props) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: sw, height: sh } = useWindowDimensions();

  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [prepBusy, setPrepBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [natural, setNatural] = useState({ w: 1, h: 1 });

  const toolbarH = 168;
  const maxPreviewH = sh - insets.top - insets.bottom - toolbarH - 56;
  const maxPreviewW = sw - 24;

  const scaleFit = Math.min(maxPreviewW / natural.w, maxPreviewH / natural.h, 1);
  const dispW = Math.max(1, Math.round(natural.w * scaleFit));
  const dispH = Math.max(1, Math.round(natural.h * scaleFit));

  useEffect(() => {
    if (!visible) {
      setWorkingUri(null);
      setDirty(false);
      setNatural({ w: 1, h: 1 });
      return;
    }

    let cancelled = false;
    (async () => {
      setPrepBusy(true);
      try {
        if (!initialRemoteUri) {
          if (!cancelled) {
            setWorkingUri(null);
            setNatural({ w: 300, h: 300 });
          }
          return;
        }
        if (initialRemoteUri.startsWith('file://') || initialRemoteUri.startsWith('content://')) {
          if (!cancelled) setWorkingUri(initialRemoteUri);
          return;
        }
        if (initialRemoteUri.startsWith('data:')) {
          if (!cancelled) setWorkingUri(initialRemoteUri);
          return;
        }
        const dest = `${FileSystem.cacheDirectory}avatar-full-${Date.now()}.jpg`;
        const dl = await FileSystem.downloadAsync(initialRemoteUri, dest);
        if (!cancelled) setWorkingUri(dl.uri);
      } catch {
        if (!cancelled) {
          setWorkingUri(initialRemoteUri ?? null);
        }
      } finally {
        if (!cancelled) setPrepBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, initialRemoteUri]);

  useEffect(() => {
    if (!workingUri || !visible) return;
    Image.getSize(
      workingUri,
      (w, h) => setNatural({ w, h }),
      () => setNatural({ w: 800, h: 800 })
    );
  }, [workingUri, visible]);

  const requestClose = useCallback(() => {
    if (dirty) {
      Alert.alert('Discard changes?', 'Your edits will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setDirty(false);
            onClose();
          },
        },
      ]);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  const applyRotate = async () => {
    if (!workingUri) return;
    void hapticSelection();
    try {
      const next = await ImageManipulator.manipulateAsync(
        workingUri,
        [{ rotate: 90 }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );
      setWorkingUri(next.uri);
      setDirty(true);
    } catch {
      Alert.alert('Edit failed', 'Could not rotate the image.');
    }
  };

  const applyFlip = async () => {
    if (!workingUri) return;
    void hapticSelection();
    try {
      const next = await ImageManipulator.manipulateAsync(
        workingUri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );
      setWorkingUri(next.uri);
      setDirty(true);
    } catch {
      Alert.alert('Edit failed', 'Could not flip the image.');
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow photo library access to choose a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setWorkingUri(result.assets[0].uri);
    setDirty(true);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setWorkingUri(result.assets[0].uri);
    setDirty(true);
  };

  const pickFromFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setWorkingUri(res.assets[0].uri);
    setDirty(true);
  };

  const showUpdateMenu = () => {
    void hapticLight();
    const options = ['Photo library', 'Camera', 'Choose file', 'Cancel'];
    const handlers = [pickFromLibrary, pickFromCamera, pickFromFiles, () => {}];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
          title: 'Update profile photo',
        },
        (idx) => {
          if (idx != null && idx < 3) void handlers[idx]();
        }
      );
      return;
    }

    Alert.alert('Update profile photo', 'Choose a source', [
      { text: 'Photo library', onPress: () => void pickFromLibrary() },
      { text: 'Camera', onPress: () => void pickFromCamera() },
      { text: 'Choose file', onPress: () => void pickFromFiles() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleKeep = async () => {
    if (!dirty) {
      void hapticLight();
      onClose();
      return;
    }
    if (!workingUri) return;
    void hapticSelection();
    setSaving(true);
    try {
      let uri = workingUri;
      if (workingUri.startsWith('http')) {
        const dest = `${FileSystem.cacheDirectory}avatar-keep-${Date.now()}.jpg`;
        const dl = await FileSystem.downloadAsync(workingUri, dest);
        uri = dl.uri;
      }
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
      );
      const b64 = await FileSystem.readAsStringAsync(resized.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataUri = `data:image/jpeg;base64,${b64}`;
      await onApplyUpload(dataUri);
      setDirty(false);
      onClose();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const preview = workingUri ? (
    Platform.OS === 'ios' ? (
      <ScrollView
        style={styles.scrollZoom}
        contentContainerStyle={[
          styles.scrollZoomInner,
          { minWidth: sw, minHeight: maxPreviewH },
        ]}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
      >
        <Image source={{ uri: workingUri }} style={{ width: dispW, height: dispH }} resizeMode="contain" />
      </ScrollView>
    ) : (
      <View style={[styles.androidZoomWrap, { minHeight: maxPreviewH }]}>
        <AndroidZoomImage uri={workingUri} displayW={dispW} displayH={dispH} />
      </View>
    )
  ) : (
    <View style={[styles.placeholder, { minHeight: maxPreviewH }]}>
      <Text style={[styles.placeholderLetter, { color: t.brand, fontFamily: FF.extrabold }]}>{initialLetter}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={requestClose}>
      <View style={[styles.shell, { backgroundColor: t.bgPage, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={requestClose} hitSlop={12} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={[styles.closeBtn, { color: t.brand, fontFamily: FF.semibold }]}>Close</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Profile photo</Text>
          <View style={{ width: 52 }} />
        </View>

        <Text style={[styles.hint, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
          Pinch to zoom · Rotate or flip to edit · Update replaces the photo · Keep saves edits
        </Text>

        <View style={styles.previewArea}>
          {prepBusy ? (
            <ActivityIndicator size="large" color={t.brand} style={{ marginTop: 48 }} />
          ) : (
            preview
          )}
        </View>

        <View style={[styles.toolbar, { borderTopColor: t.border, backgroundColor: t.bgElevated }]}>
          <View style={styles.editRow}>
            <Pressable
              onPress={() => void applyRotate()}
              disabled={!workingUri || prepBusy}
              style={({ pressed }) => [
                styles.toolChip,
                { borderColor: t.border, backgroundColor: t.inputSurface },
                pressed && { opacity: 0.85 },
                (!workingUri || prepBusy) && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.toolChipText, { color: t.text, fontFamily: FF.semibold }]}>Rotate</Text>
            </Pressable>
            <Pressable
              onPress={() => void applyFlip()}
              disabled={!workingUri || prepBusy}
              style={({ pressed }) => [
                styles.toolChip,
                { borderColor: t.border, backgroundColor: t.inputSurface },
                pressed && { opacity: 0.85 },
                (!workingUri || prepBusy) && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.toolChipText, { color: t.text, fontFamily: FF.semibold }]}>Flip</Text>
            </Pressable>
          </View>

          <View style={styles.ctaRow}>
            <View style={styles.ctaHalf}>
              <Button variant="secondary" fullWidth onPress={showUpdateMenu} disabled={prepBusy || saving}>
                Update
              </Button>
            </View>
            <View style={styles.ctaHalf}>
              <Button variant="primary" fullWidth loading={saving} onPress={() => void handleKeep()} disabled={prepBusy}>
                {dirty ? 'Keep' : 'Done'}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtn: {
    fontSize: 16,
    width: 52,
  },
  headerTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  previewArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollZoom: {
    width: '100%',
    flex: 1,
  },
  scrollZoomInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidZoomWrap: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLetter: {
    fontSize: 96,
    fontWeight: '900',
  },
  toolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    justifyContent: 'center',
  },
  toolChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.button,
    borderWidth: 1,
  },
  toolChipText: {
    fontSize: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaHalf: {
    flex: 1,
  },
});
