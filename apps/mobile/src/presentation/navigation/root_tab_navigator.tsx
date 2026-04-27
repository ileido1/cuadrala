import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { CreateMatchScreen } from '../screens/create_match.screen';
import { DashboardScreen } from '../screens/dashboard.screen';
import { MatchmakingScreen } from '../screens/matchmaking.screen';
import { RankingScreen } from '../screens/ranking.screen';
import type { RootTabParamList } from './root_tab_param_list';

const TAB = createBottomTabNavigator<RootTabParamList>();

export function RootTabNavigator() {
  return (
    <TAB.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
      }}
    >
      <TAB.Screen
        component={DashboardScreen}
        name="Dashboard"
        options={{
          title: 'Inicio',
          tabBarAccessibilityLabel: 'Pestaña Inicio',
          tabBarLabel: 'Inicio',
        }}
      />
      <TAB.Screen
        component={CreateMatchScreen}
        name="CreateMatch"
        options={{
          title: 'Crear partido',
          tabBarAccessibilityLabel: 'Pestaña Crear partido americano',
          tabBarLabel: 'Partido',
        }}
      />
      <TAB.Screen
        component={MatchmakingScreen}
        name="Matchmaking"
        options={{
          title: 'Matchmaking',
          tabBarAccessibilityLabel: 'Pestaña Matchmaking',
          tabBarLabel: 'Match',
        }}
      />
      <TAB.Screen
        component={RankingScreen}
        name="Ranking"
        options={{
          title: 'Ranking',
          tabBarAccessibilityLabel: 'Pestaña Ranking',
          tabBarLabel: 'Ranking',
        }}
      />
    </TAB.Navigator>
  );
}
