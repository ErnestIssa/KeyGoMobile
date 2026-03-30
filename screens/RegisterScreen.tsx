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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { t } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'driver'>('driver');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed');
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
        <Animated.View entering={FadeInDown.duration(320)} style={styles.hero}>
          <Text style={[styles.kicker, { color: t.accent }]}>New</Text>
          <Text style={[styles.title, { color: t.text }]}>Create account</Text>
          <Text style={[styles.lede, { color: t.textMuted }]}>
            Choose your role: owners post moves, drivers accept and relocate vehicles.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(320)}>
          <Card>
            <Text style={[styles.label, { color: t.textMuted }]}>Name</Text>
            <Input value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
            <View style={{ height: 12 }} />

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

            <Text style={[styles.label, { color: t.textMuted }]}>Password (min 6)</Text>
            <Input value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: t.textMuted }]}>I am a</Text>
            <View style={styles.roleRow}>
              <Pressable
                style={[
                  styles.roleBtn,
                  { borderColor: t.border, backgroundColor: t.bgSubtle },
                  role === 'owner' && { borderColor: t.brand, backgroundColor: t.brandSoft as any },
                ]}
                onPress={() => setRole('owner')}
              >
                <Text style={[styles.roleText, { color: role === 'owner' ? t.brand : t.textMuted }]}>Owner</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.roleBtn,
                  { borderColor: t.border, backgroundColor: t.bgSubtle },
                  role === 'driver' && { borderColor: t.brand, backgroundColor: t.brandSoft as any },
                ]}
                onPress={() => setRole('driver')}
              >
                <Text style={[styles.roleText, { color: role === 'driver' ? t.brand : t.textMuted }]}>Driver</Text>
              </Pressable>
            </View>

            {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}

            <View style={{ height: 14 }} />
            <Button onPress={onSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : 'Register'}
            </Button>

            <Pressable style={styles.link} onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.linkText, { color: t.brand }]}>Already have an account? Sign in</Text>
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
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    marginBottom: 12,
  },
  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
