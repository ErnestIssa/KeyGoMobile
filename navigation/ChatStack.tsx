import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { ConversationsListScreen } from '../screens/chat/ConversationsListScreen';
import type { ChatStackParamList } from './types';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
      <Stack.Screen name="ChatThread" component={ChatScreen} />
    </Stack.Navigator>
  );
}
