import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { MyTripsScreen } from '../screens/MyTripsScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CreateTripScreen } from '../screens/CreateTripScreen';
import { AvailableTripsScreen } from '../screens/AvailableTripsScreen';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  const { user } = useAuth();

  const action = useMemo(() => {
    if (user?.role === 'owner') {
      return { component: CreateTripScreen, title: 'Create' as const };
    }
    return { component: AvailableTripsScreen, title: 'Browse' as const };
  }, [user?.role]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} options={{ title: 'My trips' }} />
      <Tab.Screen name="Action" component={action.component} options={{ title: action.title }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

