import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MyTripsStackParamList } from './types';
import { MyTripsScreen } from '../screens/MyTripsScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';

const Stack = createNativeStackNavigator<MyTripsStackParamList>();

export function MyTripsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="MyTripsList" component={MyTripsScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
    </Stack.Navigator>
  );
}
