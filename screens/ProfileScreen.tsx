import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme, t } = useTheme();

  return (
    <ScreenContainer align="stretch">
      <Card>
        <Text style={[styles.title, { color: t.text }]}>{user?.name ?? 'Account'}</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>{user?.email}</Text>
        <Text style={[styles.sub, { color: t.brand, fontWeight: '800' }]}>Role: {user?.role}</Text>
      </Card>

      <View style={{ height: 12 }} />
      <Button variant="secondary" onPress={toggleTheme}>
        Theme: {theme === 'dark' ? 'Dark' : 'Light'}
      </Button>

      <View style={{ height: 10 }} />
      <Button variant="danger" onPress={() => void signOut()}>
        Log out
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
  },
});

