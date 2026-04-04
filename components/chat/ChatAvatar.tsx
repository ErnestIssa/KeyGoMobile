import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { chatInitialsFromParts } from '../../lib/chatDisplayName';
import { resolveAvatarUri } from '../../services/mediaUrl';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

type Props = {
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  /** Default 36 (list); use ~28 next to bubbles. */
  size?: number;
};

export function ChatAvatar({ name, firstName, lastName, avatarUrl, size = 36 }: Props) {
  const { t } = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = resolveAvatarUri(avatarUrl);
  const showImage = Boolean(uri) && !failed;
  const initials = chatInitialsFromParts(firstName, lastName, name);
  const fontSize = size < 32 ? Math.max(10, size * 0.38) : Math.max(12, size * 0.34);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showImage ? t.bgSubtle : t.brandSoft,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          style={{
            color: t.brand,
            fontFamily: FF.semibold,
            fontSize,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
