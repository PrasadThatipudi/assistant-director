import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../features/projects/screens/DashboardScreen';
import { ProjectDetailScreen } from '../features/projects/screens/ProjectDetailScreen';
import { ProjectEditScreen } from '../features/projects/screens/ProjectEditScreen';
import { ScriptReaderScreen } from '../features/scripts/ScriptReaderScreen';
import type { RootStackParamList } from './navigationTypes';
import { theme } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.background,
    card: theme.background,
    text: theme.textPrimary,
    border: theme.border,
    primary: theme.primaryAction,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerTintColor: theme.textPrimary,
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '600', color: theme.textPrimary },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Projects' }} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
        <Stack.Screen name="ProjectEdit" component={ProjectEditScreen} />
        <Stack.Screen name="ScriptReader" component={ScriptReaderScreen} options={{ title: 'Script' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
