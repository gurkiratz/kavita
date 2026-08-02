import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AppHeader } from '@/components/AppHeader';
import { Colors } from '@/constants/theme';
import { KeepAwakeProvider } from '@/context/KeepAwakeContext';
import { PoemsProvider } from '@/context/PoemsContext';
import { TextSizeProvider } from '@/context/TextSizeContext';
import { ToastProvider } from '@/context/ToastContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

// Expo Router picks this up by name — exporting it from the root layout catches
// render errors anywhere in the tree.
export { AppErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? Colors.dark : Colors.light;

  const [fontsLoaded, fontError] = useFonts({
    OpenSatlujUni: require('../../assets/fonts/OpenSatlujUni-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Hold the splash until the Gurmukhi font is ready (or has failed to load),
  // so Punjabi text never flashes in the fallback face.
  if (!fontsLoaded && !fontError) return null;

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
            <Stack.Screen
              name="poem/[id]"
              // A function so the option is resolved from the incoming route's
              // params as the screen is created. The previous/next links replace
              // the current poem, and a replace animates as a push by default —
              // which made stepping backwards slide in from the right. `dir=prev`
              // flips it to a pop so the motion matches the direction of travel.
              options={({ route }) => ({
                title: '',
                headerBackTitle: 'Kavita',
                animationTypeForReplace:
                  (route.params as { dir?: string } | undefined)?.dir === 'prev'
                    ? 'pop'
                    : 'push',
              })}
            />
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
