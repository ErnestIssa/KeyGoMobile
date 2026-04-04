import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatAvatar } from '../components/chat/ChatAvatar';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { friendlyErrorMessage } from '../lib/userFacingError';
import type { ProfileStackParamList } from '../navigation/types';
import { getPublicUser } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'UserProfile'>;

export function UserProfileScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'UserProfile'>>();
  const { userId } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [role, setRole] = useState('');
  const [rating, setRating] = useState<number | undefined>();

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { user } = await getPublicUser(userId);
      setName(user.name);
      setDisplayName(user.displayName ?? user.name);
      setAvatarUrl(user.avatarUrl);
      setRole(user.role);
      setRating(user.ratingAverage);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), borderBottomColor: t.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.text, fontFamily: FF.bold }]} numberOfLines={1}>
          Profile
        </Text>
        <View style={{ width: 56 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.brand} />
        </View>
      ) : error ? (
        <Card style={{ margin: 16, padding: 16, borderColor: t.border, backgroundColor: t.bgSubtle }}>
          <Text style={{ color: t.textMuted, fontFamily: FF.regular }}>{error}</Text>
        </Card>
      ) : (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ChatAvatar name={name} avatarUrl={avatarUrl} size={96} />
          <Text style={[styles.name, { color: t.text, fontFamily: FF.bold }]}>{displayName}</Text>
          <Text style={[styles.meta, { color: t.textMuted, fontFamily: FF.regular }]}>
            {role === 'owner' ? 'Owner' : role === 'driver' ? 'Driver' : role}
            {rating != null ? ` · ${rating.toFixed(1)} ★` : ''}
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backHit: { paddingVertical: 8, paddingHorizontal: 8, minWidth: 56 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, marginTop: 16, textAlign: 'center' },
  meta: { fontSize: 15, marginTop: 8, textAlign: 'center' },
});
