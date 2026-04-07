/** Mirrors server `AppSettingsShape` — merged defaults on API. */

export type ProfileVisibility = 'everyone' | 'drivers_only' | 'minimal';
export type NightModePref = 'system' | 'light' | 'dark';
export type PreferredMaps = 'google' | 'apple' | 'waze';

export type AppSettings = {
  privacy: {
    profileVisibility: ProfileVisibility;
    shareAnalytics: boolean;
  };
  accessibility: {
    reduceMotion: boolean;
    boldText: boolean;
  };
  nightMode: NightModePref;
  shortcuts: { enabled: boolean };
  communication: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  navigation: {
    preferredMaps: PreferredMaps;
  };
  soundsVoice: {
    messageSounds: boolean;
    voiceGuidance: boolean;
  };
  safety: {
    pinVerificationEnabled: boolean;
    followMyTripEnabled: boolean;
    tripCheckNotificationsEnabled: boolean;
  };
};

export type UserAddress = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

/** PATCH body — nested partials merged on server. */
export type PatchAppSettings = {
  privacy?: Partial<AppSettings['privacy']>;
  accessibility?: Partial<AppSettings['accessibility']>;
  nightMode?: NightModePref;
  shortcuts?: Partial<AppSettings['shortcuts']>;
  communication?: Partial<AppSettings['communication']>;
  navigation?: Partial<AppSettings['navigation']>;
  soundsVoice?: Partial<AppSettings['soundsVoice']>;
  safety?: Partial<AppSettings['safety']>;
};
