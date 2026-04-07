import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { ProfileStackParamList } from '../../navigation/types';
import { HELP_ARTICLES, isHelpTopicId } from './helpContent';
import { hapticLight } from '../../services/haptics';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

type R = RouteProp<ProfileStackParamList, 'HelpTopic'>;
type Nav = NativeStackNavigationProp<ProfileStackParamList, 'HelpTopic'>;

export function HelpTopicScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { topicId } = route.params;
  const { t } = useTheme();

  const article = isHelpTopicId(topicId) ? HELP_ARTICLES[topicId] : null;

  return (
    <ScreenContainer align="stretch" scrollable>
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
        <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]} numberOfLines={2}>
          {article?.title ?? 'Help'}
        </Text>
        <View style={{ width: 56 }} />
      </Animated.View>

      {article ? (
        <Card>
          <Text style={[styles.body, { color: t.text, fontFamily: FF.regular }]}>{article.body}</Text>
        </Card>
      ) : (
        <Text style={{ color: t.textMuted, fontFamily: FF.regular }}>This topic is not available.</Text>
      )}

      <Button
        variant="secondary"
        fullWidth
        onPress={() => {
          void hapticLight();
          navigation.navigate('Inbox', {});
        }}
        style={{ marginTop: 16 }}
      >
        Still need help? Open inbox
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backHit: { paddingVertical: 8, paddingHorizontal: 4, minWidth: 56 },
  headerTitle: { fontSize: 17, flex: 1, textAlign: 'center', fontFamily: FF.bold },
  body: { fontSize: 15, lineHeight: 23 },
});
