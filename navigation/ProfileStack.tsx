import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileSectionScreen } from '../screens/ProfileSectionScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { SettingsHomeScreen } from '../screens/settings/SettingsHomeScreen';
import {
  AccessibilitySettingsScreen,
  AddressSettingsScreen,
  CommunicationSettingsScreen,
  ManageAccountSettingsScreen,
  NavigationPrefsSettingsScreen,
  NightModeSettingsScreen,
  PrivacySettingsScreen,
  ShortcutsSettingsScreen,
  SoundsVoiceSettingsScreen,
} from '../screens/settings/SettingsSecondaryScreens';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Section" component={ProfileSectionScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="SettingsHome" component={SettingsHomeScreen} />
      <Stack.Screen name="SettingsManageAccount" component={ManageAccountSettingsScreen} />
      <Stack.Screen name="SettingsPrivacy" component={PrivacySettingsScreen} />
      <Stack.Screen name="SettingsAddress" component={AddressSettingsScreen} />
      <Stack.Screen name="SettingsAccessibility" component={AccessibilitySettingsScreen} />
      <Stack.Screen name="SettingsNightMode" component={NightModeSettingsScreen} />
      <Stack.Screen name="SettingsShortcuts" component={ShortcutsSettingsScreen} />
      <Stack.Screen name="SettingsCommunication" component={CommunicationSettingsScreen} />
      <Stack.Screen name="SettingsNavigationPrefs" component={NavigationPrefsSettingsScreen} />
      <Stack.Screen name="SettingsSoundsVoice" component={SoundsVoiceSettingsScreen} />
    </Stack.Navigator>
  );
}
