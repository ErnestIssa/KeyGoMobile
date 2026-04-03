import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { ActionStackParamList } from './types';
import { CreateTripScreen } from '../screens/CreateTripScreen';
import { AvailableTripsScreen } from '../screens/AvailableTripsScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';

const Stack = createNativeStackNavigator<ActionStackParamList>();

export function ActionStack() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {isOwner ? (
        <Stack.Screen name="Create" component={CreateTripScreen} />
      ) : (
        <>
          <Stack.Screen name="Browse" component={AvailableTripsScreen} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
