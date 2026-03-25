import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../AuthContext';

// Importar las pantallas del administrador
import AdminTrainersScreen from '../screens/Admin/AdminTrainersScreen';
import AdminClientsScreen from '../screens/Admin/AdminClientsScreen';
import AdminEquipmentScreen from '../screens/Admin/AdminEquipmentScreen';
import AdminProfileScreen from '../screens/Admin/AdminProfileScreen';
import AdminTipsScreen from '../screens/Admin/AdminTipsScreen';
import AdminTipDetailScreen from '../screens/Admin/AdminTipDetailScreen';
import AdminReportsScreen from '../screens/Admin/AdminReportsScreen'; // Importar pantalla de reportes

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TipsNavigator = () => (
  <Stack.Navigator screenOptions={{
    headerStyle: { backgroundColor: '#fff' },
    headerTintColor: '#333',
    headerTitleStyle: { fontWeight: 'bold' },
  }}>
    <Stack.Screen name="AdminTipsList" component={AdminTipsScreen} options={{ title: 'Moderar Consejos' }} />
    <Stack.Screen name="AdminTipDetail" component={AdminTipDetailScreen} />
  </Stack.Navigator>
);

/**
 * Módulo de navegación para el rol de Administrador.
 * Configura un navegador de pestañas inferior (BottomTabNavigator) con acceso
 * a las diferentes secciones de gestión: Entrenadores, Clientes, Reportes, etc.
 */
export default function AdminModule() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // La navegación al Login se gestiona automáticamente desde App.js
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Entrenadores') {
            iconName = focused ? 'account-tie' : 'account-tie-outline';
          } else if (route.name === 'Clientes') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Equipos') {
            iconName = focused ? 'dumbbell' : 'dumbbell';
          } else if (route.name === 'Reportes') {
            iconName = focused ? 'alert-octagon' : 'alert-octagon-outline';
          } else if (route.name === 'Consejos') {
            iconName = focused ? 'comment-edit' : 'comment-edit-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'account-cog' : 'account-cog-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E74C3C', // Color distintivo para el admin
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Entrenadores" component={AdminTrainersScreen} />
      <Tab.Screen name="Clientes" component={AdminClientsScreen} />
      <Tab.Screen name="Reportes" component={AdminReportsScreen} />
      <Tab.Screen name="Consejos" component={TipsNavigator} />
      <Tab.Screen name="Equipos" component={AdminEquipmentScreen} />
      <Tab.Screen name="Perfil">
        {props => <AdminProfileScreen {...props} user={user} onLogout={handleLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});