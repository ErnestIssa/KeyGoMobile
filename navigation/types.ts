import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  /** `preferBusiness` opens organization path first. */
  Register: { preferBusiness?: boolean } | undefined;
};

export type TripDetailParams = { id: string };

export type MyTripsStackParamList = {
  MyTripsList: undefined;
  TripDetail: TripDetailParams;
};

/** Owner: single create screen. Driver: browse + trip detail (detail tab highlight follows web: “My trips” active). */
export type ActionStackParamList = {
  Create: undefined;
  Browse: undefined;
  TripDetail: TripDetailParams;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Section: { title: string; subtitle: string };
  UserProfile: { userId: string };
  SettingsHome: undefined;
  SettingsManageAccount: undefined;
  SettingsPrivacy: undefined;
  SettingsAddress: undefined;
  SettingsAccessibility: undefined;
  SettingsNightMode: undefined;
  SettingsShortcuts: undefined;
  SettingsCommunication: undefined;
  SettingsNavigationPrefs: undefined;
  SettingsSoundsVoice: undefined;
  SafetyHome: undefined;
  SafetyResource: { kind: 'learning' | 'insurance' | 'driver' };
  HelpHome: undefined;
  HelpTopic: { topicId: string };
  Inbox: { initialTab?: 'notifications' | 'support' } | undefined;
};

export type ChatStackParamList = {
  ConversationsList: undefined;
  ChatThread: {
    conversationId: string;
    /** Other participant — for profile link */
    peerUserId?: string;
    /** Short label e.g. "Jane S." */
    peerDisplayName?: string;
    peerAvatarUrl?: string;
    /** Full name (for avatar initials) */
    peerName?: string;
    otherUserName?: string;
  };
};

export type AppTabParamList = {
  Home: undefined;
  MyTrips: NavigatorScreenParams<MyTripsStackParamList>;
  Action: NavigatorScreenParams<ActionStackParamList>;
  Chat: NavigatorScreenParams<ChatStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};
