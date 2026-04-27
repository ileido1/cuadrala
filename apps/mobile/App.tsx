import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { QUERY_CLIENT } from './src/infrastructure/api/query_client';
import { RootTabNavigator } from './src/presentation/navigation/root_tab_navigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={QUERY_CLIENT}>
        <NavigationContainer>
          <SafeAreaView style={STYLES.container} edges={['top', 'left', 'right']}>
            <RootTabNavigator />
            <StatusBar style="auto" />
          </SafeAreaView>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const STYLES = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
