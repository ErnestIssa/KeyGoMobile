import { useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AuthBrandHero } from '../components/auth/AuthBrandHero';
import { IconKeyGoLogo } from '../components/icons/navIcons';
import { AuthScreenChrome } from '../components/auth/AuthScreenChrome';
import { ScreenContainer } from '../components/ScreenContainer';
import { BlurModalScrim } from '../components/ui/BlurModalScrim';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { BrandedLoading } from '../components/ui/BrandedLoading';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { friendlyErrorMessage } from '../lib/userFacingError';
import { hapticError, hapticSelection } from '../services/haptics';
import { playNotify } from '../services/sounds';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';
import { radii } from '../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type RegisterRoute = RouteProp<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const route = useRoute<RegisterRoute>();
  const preferBusiness = route.params?.preferBusiness ?? false;
  const { signUp } = useAuth();
  const { t } = useTheme();

  const [wizardOpen, setWizardOpen] = useState(true);
  const [step, setStep] = useState(preferBusiness ? 1 : 0);
  const [accountKind, setAccountKind] = useState<'individual' | 'organization'>(preferBusiness ? 'organization' : 'individual');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'driver'>('driver');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preferBusiness) {
      setAccountKind('organization');
      setStep(1);
    }
  }, [preferBusiness]);

  const totalSteps = accountKind === 'individual' ? 6 : 7;

  const stepIndexDisplay = useMemo(() => {
    if (accountKind === 'individual') {
      const order = [0, 2, 3, 4, 5, 6];
      const i = order.indexOf(step);
      return i >= 0 ? i + 1 : 1;
    }
    return Math.min(step + 1, 7);
  }, [step, accountKind]);

  const goNext = () => {
    setError(null);
    if (step === 0) {
      if (accountKind === 'individual') setStep(2);
      else setStep(1);
      return;
    }
    if (step === 1 && accountKind === 'organization') {
      if (!organizationName.trim()) {
        setError('Enter your organization name.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('First and last name are required.');
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!email.trim().includes('@')) {
        setError('Enter a valid email.');
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        setError('Enter a valid phone number (7–15 digits).');
        return;
      }
      setStep(5);
      return;
    }
    if (step === 5) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      setStep(6);
      return;
    }
    if (step < 6) setStep(step + 1);
  };

  const goBack = () => {
    setError(null);
    if (step === 0) {
      setWizardOpen(false);
      return;
    }
    if (step === 2 && accountKind === 'individual') {
      setStep(0);
      return;
    }
    if (step === 2 && accountKind === 'organization') {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(0);
      return;
    }
    setStep((s) => s - 1);
  };

  const onSubmit = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setError('Enter a valid phone number (7–15 digits).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (accountKind === 'organization' && !organizationName.trim()) {
      setError('Organization name is required.');
      return;
    }
    setLoading(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
        accountKind,
        ...(accountKind === 'organization'
          ? {
              organizationName: organizationName.trim(),
              organizationType: organizationType.trim() || undefined,
            }
          : {}),
      });
    } catch (e) {
      void hapticError();
      void playNotify();
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <View style={styles.stepInner}>
          <Text style={[styles.stepTitle, { color: t.text, fontFamily: FF.bold }]}>Who is signing up?</Text>
          <Text style={[styles.stepHint, { color: t.textMuted, fontFamily: FF.regular }]}>
            Private users and businesses share one app — choose what fits you.
          </Text>
          <View style={styles.roleRow}>
            <Pressable
              style={({ pressed }) => [
                styles.kindBtn,
                {
                  borderColor: accountKind === 'individual' ? t.brand : t.border,
                  backgroundColor: accountKind === 'individual' ? t.brandSoft : t.inputSurface,
                },
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => {
                void hapticSelection();
                setAccountKind('individual');
              }}
            >
              <Text style={[styles.kindTitle, { color: accountKind === 'individual' ? t.brand : t.text, fontFamily: FF.bold }]}>
                Individual
              </Text>
              <Text style={[styles.kindHint, { color: t.textMuted, fontFamily: FF.regular }]}>Owners & drivers</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.kindBtn,
                {
                  borderColor: accountKind === 'organization' ? t.brand : t.border,
                  backgroundColor: accountKind === 'organization' ? t.brandSoft : t.inputSurface,
                },
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => {
                void hapticSelection();
                setAccountKind('organization');
              }}
            >
              <Text style={[styles.kindTitle, { color: accountKind === 'organization' ? t.brand : t.text, fontFamily: FF.bold }]}>
                Organization
              </Text>
              <Text style={[styles.kindHint, { color: t.textMuted, fontFamily: FF.regular }]}>Dealer, fleet, business</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    if (step === 1 && accountKind === 'organization') {
      return (
        <View style={styles.stepInner}>
          <Text style={[styles.stepTitle, { color: t.text, fontFamily: FF.bold }]}>Business profile</Text>
          <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Organization name</Text>
          <Input value={organizationName} onChangeText={setOrganizationName} autoCapitalize="words" placeholder="e.g. Riverside Auto Group" />
          <View style={{ height: 14 }} />
          <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Type (optional)</Text>
          <Input
            value={organizationType}
            onChangeText={setOrganizationType}
            autoCapitalize="words"
            placeholder="Car dealer, fleet, rental…"
          />
        </View>
      );
    }
    if (step === 2) {
      return (
        <View style={styles.stepInner}>
          <Text style={[styles.stepTitle, { color: t.text, fontFamily: FF.bold }]}>
            {accountKind === 'organization' ? 'Primary contact' : 'Your name'}
          </Text>
          <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>First name</Text>
          <Input value={firstName} onChangeText={setFirstName} autoCapitalize="words" textContentType="givenName" />
          <View style={{ height: 12 }} />
          <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Last name</Text>
          <Input value={lastName} onChangeText={setLastName} autoCapitalize="words" textContentType="familyName" />
        </View>
      );
    }
    if (step === 3) {
      return (
        <View style={styles.stepInner}>
          <Text style={[styles.stepTitle, { color: t.text, fontFamily: FF.bold }]}>Email</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
        </View>
      );
    }
    if (step === 4) {
      return (
        <View style={styles.stepInner}>
          <Text style={[styles.stepTitle, { color: t.text, fontFamily: FF.bold }]}>Phone</Text>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" placeholder="+1 or local" />
        </View>
      );
    }
    if (step === 5) {
      return (
        <View style={styles.stepInner}>
          <Text style={[styles.stepTitle, { color: t.text, fontFamily: FF.bold }]}>Password</Text>
          <Input value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" placeholder="At least 6 characters" />
        </View>
      );
    }
    if (step === 6) {
      return (
        <View style={styles.stepInner}>
          <Text style={[styles.stepTitle, { color: t.text, fontFamily: FF.bold }]}>Starting as</Text>
          <View style={styles.roleRow}>
            <Pressable
              style={({ pressed }) => [
                styles.kindBtn,
                {
                  borderColor: role === 'owner' ? t.brand : t.border,
                  backgroundColor: role === 'owner' ? t.brandSoft : t.inputSurface,
                },
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => {
                void hapticSelection();
                setRole('owner');
              }}
            >
              <Text style={[styles.kindTitle, { color: role === 'owner' ? t.brand : t.text, fontFamily: FF.bold }]}>Owner</Text>
              <Text style={[styles.kindHint, { color: t.textMuted, fontFamily: FF.regular }]}>List trips</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.kindBtn,
                {
                  borderColor: role === 'driver' ? t.brand : t.border,
                  backgroundColor: role === 'driver' ? t.brandSoft : t.inputSurface,
                },
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => {
                void hapticSelection();
                setRole('driver');
              }}
            >
              <Text style={[styles.kindTitle, { color: role === 'driver' ? t.brand : t.text, fontFamily: FF.bold }]}>Driver</Text>
              <Text style={[styles.kindHint, { color: t.textMuted, fontFamily: FF.regular }]}>Relocate cars</Text>
            </Pressable>
          </View>
          <Text style={[styles.stepHint, { color: t.textMuted, fontFamily: FF.regular, marginTop: 10 }]}>
            Switch Owner ↔ Driver anytime in Profile.
          </Text>
        </View>
      );
    }
    return null;
  };

  const atLastStep = step === 6;

  return (
    <>
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScreenContainer align="stretch" tabBarInset={false} scrollable>
        <View style={styles.column}>
          <AuthScreenChrome navigation={navigation} variant="registerWizard" />

          <Animated.View entering={FadeIn.duration(380)} style={styles.brandBlock}>
            <AuthBrandHero />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(340)} style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Create account</Text>
            <Text style={[styles.subline, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
              A few quick steps — your data is protected end-to-end.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(360)} style={styles.formWrap}>
            {!wizardOpen ? (
              <>
                <Button
                  onPress={() => {
                    setWizardOpen(true);
                    setStep(preferBusiness ? 1 : 0);
                  }}
                  fullWidth
                >
                  Start
                </Button>
                <Pressable
                  onPress={() => navigation.navigate('Login')}
                  style={({ pressed }) => [styles.inlineLink, pressed && { opacity: 0.75 }]}
                >
                  <Text style={[styles.inlineLinkText, { color: t.brand, fontFamily: FF.semibold }]}>
                    Already have an account? Sign in
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={[styles.hintBelow, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
                Complete the steps in the secure window above.
              </Text>
            )}
          </Animated.View>
        </View>
      </ScreenContainer>

      <BlurModalScrim visible={wizardOpen} onRequestClose={() => setWizardOpen(false)}>
        <Card style={[styles.wizardCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <View style={styles.wizardTop}>
            <Animated.View key={step} entering={FadeIn.duration(320)} style={styles.wizardLogo}>
              <IconKeyGoLogo size={56} color={t.brand} strokeWidth={1.45} />
            </Animated.View>
            <Text style={[styles.stepMeta, { color: t.textMuted, fontFamily: FF.semibold }]}>
              Step {stepIndexDisplay} of {totalSteps}
            </Text>
          </View>
          <Animated.View key={step} entering={FadeInDown.duration(280)} style={{ width: '100%' }}>
            {renderStep()}
          </Animated.View>
          {error ? (
            <Text style={[styles.error, { color: t.danger, fontFamily: FF.semibold }]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <View style={styles.wizardActions}>
            <Button variant="secondary" onPress={goBack} disabled={loading}>
              {step === 0 ? 'Close' : 'Back'}
            </Button>
            <Button
              onPress={() => {
                if (atLastStep) void onSubmit();
                else goNext();
              }}
              disabled={loading}
              loading={loading && atLastStep}
              style={{ flex: 1 }}
            >
              {atLastStep ? 'Create account' : 'Continue'}
            </Button>
          </View>
        </Card>
      </BlurModalScrim>
    </KeyboardAvoidingView>
    {loading ? (
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]} pointerEvents="auto">
        <BrandedLoading fullscreen minimal />
      </View>
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  column: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 24,
    paddingTop: 4,
  },
  brandBlock: { marginBottom: 6, alignItems: 'center' },
  titleBlock: { marginBottom: 16, alignItems: 'center', gap: 6 },
  screenTitle: { fontSize: 22, letterSpacing: -0.35, fontWeight: '700' },
  subline: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  formWrap: { width: '100%', gap: 14 },
  inlineLink: { alignItems: 'center', paddingVertical: 8 },
  inlineLinkText: { fontSize: 15 },
  hintBelow: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  wizardCard: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'stretch',
  },
  wizardTop: { alignItems: 'center', marginBottom: 16 },
  wizardLogo: { marginBottom: 4, alignItems: 'center' },
  stepMeta: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 },
  stepInner: { width: '100%' },
  stepTitle: { fontSize: 18, marginBottom: 10 },
  stepHint: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 12 },
  kindBtn: {
    flex: 1,
    minHeight: 76,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: 'center',
    gap: 4,
  },
  kindTitle: { fontSize: 16, fontWeight: '800' },
  kindHint: { fontSize: 12, lineHeight: 16 },
  error: { marginTop: 10, fontSize: 14 },
  wizardActions: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'center' },
});
