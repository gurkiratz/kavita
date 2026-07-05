import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Colors } from '@/constants/theme';
import { KeepAwakeProvider } from '@/context/KeepAwakeContext';
import { PoemsProvider } from '@/context/PoemsContext';
import { TextSizeProvider } from '@/context/TextSizeContext';
import { ToastProvider } from '@/context/ToastContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
        <KeepAwakeProvider>
          <PoemsProvider>
            <TextSizeProvider>
            <Stack
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              contentStyle: { backgroundColor: c.background },
            }}>
            <Stack.Screen name="index" options={{ title: 'ਕਵਿਤਾ' }} />
            <Stack.Screen name="poem/[id]" options={{ title: '', headerBackTitle: 'Kavita' }} />
            </Stack>
            <StatusBar style="auto" />
            </TextSizeProvider>
          </PoemsProvider>
        </KeepAwakeProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
