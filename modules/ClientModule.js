import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../AuthContext';

import ProfileScreen from '../screens/Clients/ProfileScreen'; // Nueva pantalla de Perfil
import RoutinesScreen from '../screens/Clients/RoutinesScreen'; // Nueva pantalla de Rutinas
import IMCScreen from '../screens/Clients/IMCScreen'; // Nueva pantalla de IMC
import ClientTipsScreen from '../screens/Clients/ClientTipsScreen';
import CalorieCalculatorScreen from '../screens/Shared/CalorieCalculatorScreen'; // Importar calculadora
import TipDetailScreen from '../screens/Clients/TipDetailScreen'; // Importar la pantalla de detalle
import { API_URL } from '../apiConfig';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Se define el TabNavigator FUERA del componente principal para que no se recree en cada renderizado.
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Rutinas') {
          iconName = focused ? 'weight-lifter' : 'weight-lifter';
          
        } else if (route.name === 'Consejos') {
            iconName = focused ? 'lightbulb-on' : 'lightbulb-on-outline';
        } else if (route.name === 'Perfil') 
          {
          iconName = focused ? 'account-circle' : 'account-circle-outline';
        } else if (route.name === 'IMC') {
          iconName = focused ? 'calculator-variant' : 'calculator-variant-outline'; // o 'scale-bathroom'
        } else if (route.name === 'Calorías') {
          iconName = focused ? 'fire' : 'fire';
        }
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
      headerShown: false, // Oculta el header por defecto del TabNavigator
    })}
  >
    <Tab.Screen name="Rutinas" component={RoutinesScreen} />
    <Tab.Screen name="Consejos" component={ClientTipsScreen} />
    <Tab.Screen name="Perfil" component={ProfileScreen} />
    <Tab.Screen name="Calorías" component={CalorieCalculatorScreen} />
    <Tab.Screen name="IMC" component={IMCScreen} />
  </Tab.Navigator>
);

/**
 * Módulo de navegación para el rol de Cliente.
 * Configura un StackNavigator que contiene un navegador de pestañas inferior (BottomTabNavigator).
 * Proporciona acceso a las pantallas de Rutinas, Consejos, Perfil e IMC.
 * También gestiona el registro para notificaciones push.
 */
const ClientModule = ({ navigation }) => {
  const { user } = useAuth();

  useEffect(() => {
    // --- Lógica para registrar notificaciones push ---
    const registerForPushNotificationsAsync = async (userId) => {
      let token;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Permiso de notificaciones no concedido.');
        return;
      }

      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      } catch (e) {
        console.error("Error al obtener el token de Expo:", e);
        return;
      }

      if (token) {
        try {
          await fetch(`${API_URL}/users/${userId}/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        } catch (error) { console.error('Error al enviar el token al servidor:', error); }
      }
    };

    if (user?.id) {
      registerForPushNotificationsAsync(user.id);
    }
  }, [user]);

  if (!user) {
    // Puedes mostrar un loader aquí si lo deseas
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClientTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TipDetail"
        component={TipDetailScreen}
        options={{ headerTitle: 'Detalle del Consejo' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ClientModule;