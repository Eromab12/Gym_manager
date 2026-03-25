import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../AuthContext';

// Importamos las nuevas pantallas para el entrenador
import TrainerProfileScreen from '../screens/Trainers/TrainerProfileScreen';
import TrainerRoutinesScreen from '../screens/Trainers/TrainerRoutinesScreen';
import TrainerClientsScreen from '../screens/Trainers/TrainerClientsScreen';
import TrainerIMCScreen from '../screens/Trainers/TrainerIMCScreen';
import TrainerTipsScreen from '../screens/Trainers/TrainerTipsScreen'; // Importar la nueva pantalla
import CalorieCalculatorScreen from '../screens/Shared/CalorieCalculatorScreen'; // Importar calculadora de calorias

const Tab = createBottomTabNavigator();

/**
 * Módulo de navegación para el rol de Entrenador.
 * Configura un navegador de pestañas inferior (BottomTabNavigator) con acceso
 * a las diferentes secciones de gestión: Rutinas, Clientes, IMC, Consejos y Perfil.
 */
const TrainerTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'PerfilEntrenador') {
          iconName = focused ? 'account-tie' : 'account-tie-outline';
        } else if (route.name === 'Gestionar Rutinas') {
          iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
        } else if (route.name === 'Clientes') {
          iconName = focused ? 'account-group' : 'account-group-outline';
        } else if (route.name === 'IMC') {
          iconName = focused ? 'calculator-variant' : 'calculator-variant-outline';
        } else if (route.name === 'Consejos') {
          iconName = focused ? 'lightbulb-on' : 'lightbulb-on-outline';
        } else if (route.name === 'Calorías') {
          iconName = focused ? 'fire' : 'fire';
        }
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Gestionar Rutinas" component={TrainerRoutinesScreen} />
    <Tab.Screen name="Clientes" component={TrainerClientsScreen} />
    <Tab.Screen name="IMC" component={TrainerIMCScreen} />
    <Tab.Screen name="Calorías" component={CalorieCalculatorScreen} />
    <Tab.Screen name="Consejos" component={TrainerTipsScreen} />
    <Tab.Screen name="PerfilEntrenador" component={TrainerProfileScreen} options={{ title: 'Perfil' }} />
  </Tab.Navigator>
);

export default function TrainerModule() {
  const { user } = useAuth();
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return <TrainerTabNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});