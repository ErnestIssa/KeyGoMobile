import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Easing, View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ProfileStack } from './ProfileStack';
import type { AppTabParamList } from './types';
import { WebTabBar } from './WebTabBar';
import { MyTripsStack } from './MyTripsStack';
import { ActionStack } from './ActionStack';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      /** Tab bar uses its own `useSafeAreaInsets()` for the pill; don’t double-stack system insets on the bar slot. */
      safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}
      tabBar={(props) => <WebTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        /** Match WebTabBar highlight (~640ms) so the scene fades with the tab pill. */
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 640,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          },
        },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: 'transparent' }} />,
        tabBarStyle: {
          position: 'absolute',
          height: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          borderTopColor: 'transparent',
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyTrips" component={MyTripsStack} />
      <Tab.Screen name="Action" component={ActionStack} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
