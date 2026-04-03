import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
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
};

export type AppTabParamList = {
  Home: undefined;
  MyTrips: NavigatorScreenParams<MyTripsStackParamList>;
  Action: NavigatorScreenParams<ActionStackParamList>;
  Activity: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};
