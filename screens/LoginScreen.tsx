import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlobsBackground } from '../components/BlobsBackground';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { ApiError } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { t, toggleTheme, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer align="stretch">
      <BlobsBackground />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topRow}>
          <Text style={[styles.brand, { color: t.text }]}>
            Key<Text style={{ color: t.accent }}>Go</Text>
          </Text>
          <Pressable onPress={toggleTheme} style={[styles.themeBtn, { borderColor: t.border, backgroundColor: t.bgElevated }]}>
            <Text style={{ color: t.text, fontWeight: '700' }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(320)} style={styles.hero}>
          <Text style={[styles.kicker, { color: t.accent }]}>Welcome</Text>
          <Text style={[styles.title, { color: t.text }]}>Sign in</Text>
          <Text style={[styles.lede, { color: t.textMuted }]}>
            Move your car from A → B with a trusted driver. Vehicle only — no passenger transport.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(320)}>
          <Card>
            <Text style={[styles.label, { color: t.textMuted }]}>Email</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <View style={{ height: 12 }} />
            <Text style={[styles.label, { color: t.textMuted }]}>Password</Text>
            <Input value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />

            {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}

            <View style={{ height: 14 }} />
            <Button onPress={onSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : 'Login'}
            </Button>

            <Pressable style={styles.link} onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.linkText, { color: t.brand }]}>Create an account</Text>
            </Pressable>
          </Card>
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 14,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  lede: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  error: {
    marginTop: 12,
    fontWeight: '600',
  },
  link: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
