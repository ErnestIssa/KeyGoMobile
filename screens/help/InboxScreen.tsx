import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useContentTopInset } from '../../navigation/floatingTabBar';
import type { ProfileStackParamList } from '../../navigation/types';
import {
  getInbox,
  markInboxMessageRead,
  postSupportInboxMessage,
  type InboxMessage,
} from '../../services/api';
import { friendlyErrorMessage } from '../../lib/userFacingError';
import { hapticLight } from '../../services/haptics';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import { spacing } from '../../theme/tokens';

type R = RouteProp<ProfileStackParamList, 'Inbox'>;
type Tab = 'notifications' | 'support';

export function InboxScreen() {
  const navigation = useNavigation();
  const route = useRoute<R>();
  const initialTab = route.params?.initialTab ?? 'support';
  const { t } = useTheme();
  const topInset = useContentTopInset();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>(initialTab === 'notifications' ? 'notifications' : 'support');
  const [notifications, setNotifications] = useState<InboxMessage[]>([]);
  const [support, setSupport] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getInbox();
      setNotifications(data.notifications);
      setSupport(data.support);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await postSupportInboxMessage(body);
      setSupport((prev) => [message, ...prev]);
      setDraft('');
      setTab('support');
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const onOpenRow = async (item: InboxMessage) => {
    if (item.read) return;
    try {
      await markInboxMessageRead(item.id);
      const updater = (rows: InboxMessage[]) =>
        rows.map((m) => (m.id === item.id ? { ...m, read: true } : m));
      if (item.channel === 'notifications') setNotifications(updater);
      else setSupport(updater);
    } catch {
      /* ignore */
    }
  };

  const list = tab === 'notifications' ? notifications : support;

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.screenX,
          paddingTop: topInset,
        }}
      >
      <Animated.View entering={FadeInDown.duration(260)} style={styles.header}>
        <Pressable
          onPress={() => {
            void hapticLight();
            navigation.goBack();
          }}
          hitSlop={12}
          style={styles.backHit}
        >
          <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Inbox</Text>
        <View style={{ width: 56 }} />
      </Animated.View>

      <View style={[styles.tabs, { backgroundColor: t.bgSubtle, borderColor: t.border }]}>
        <Pressable
          onPress={() => {
            void hapticLight();
            setTab('notifications');
          }}
          style={[
            styles.tab,
            tab === 'notifications' && { backgroundColor: t.bgElevated, borderColor: t.brand },
            { borderColor: t.border },
          ]}
        >
          <Text
            style={{
              color: tab === 'notifications' ? t.brand : t.textMuted,
              fontFamily: tab === 'notifications' ? FF.bold : FF.regular,
            }}
          >
            Notifications
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void hapticLight();
            setTab('support');
          }}
          style={[
            styles.tab,
            tab === 'support' && { backgroundColor: t.bgElevated, borderColor: t.brand },
            { borderColor: t.border },
          ]}
        >
          <Text
            style={{
              color: tab === 'support' ? t.brand : t.textMuted,
              fontFamily: tab === 'support' ? FF.bold : FF.regular,
            }}
          >
            Support
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: t.danger, marginBottom: 8, fontFamily: FF.regular }}>{error}</Text> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.brand} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: tab === 'support' ? 12 : 24 }}
          ListEmptyComponent={
            <Text style={{ color: t.textMuted, fontFamily: FF.regular, textAlign: 'center', marginTop: 24 }}>
              {tab === 'notifications' ? 'No notifications yet.' : 'No messages yet. Say hello below.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => void onOpenRow(item)} style={{ marginBottom: 10 }}>
              <Card
                style={{
                  opacity: item.read ? 0.85 : 1,
                  borderLeftWidth: 4,
                  borderLeftColor: item.read ? 'transparent' : t.brand,
                }}
              >
                {item.title ? (
                  <Text style={{ color: t.text, fontFamily: FF.bold, marginBottom: 4 }}>{item.title}</Text>
                ) : null}
                <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 14, lineHeight: 20 }}>{item.body}</Text>
                <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 8, fontFamily: FF.regular }}>
                  {new Date(item.createdAt).toLocaleString()}
                  {item.fromSupport ? ' · Support' : ' · You'}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      {tab === 'support' ? (
        <View style={[styles.composer, { borderTopColor: t.border, backgroundColor: t.bgElevated, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message support…"
            placeholderTextColor={t.textMuted}
            multiline
            style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.inputSurface }]}
          />
          <Button onPress={() => void onSend()} disabled={!draft.trim() || sending} loading={sending} fullWidth>
            Send
          </Button>
        </View>
      ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backHit: { paddingVertical: 8, paddingHorizontal: 4, minWidth: 56 },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  composer: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 72,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
    fontFamily: FF.regular,
    textAlignVertical: 'top',
  },
});
