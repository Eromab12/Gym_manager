/**
 * Este es el componente raíz de la aplicación.
 * Configura el proveedor de autenticación (AuthProvider) y el enrutador principal
 * que decide qué conjunto de pantallas mostrar basándose en el estado de autenticación del usuario.
 */
import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './AuthContext';
import { MenuProvider } from 'react-native-popup-menu';
import { StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';

// Tus pantallas
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import DrawerNavigator from './navigation/DrawerNavigation';

const Stack = createStackNavigator();

/**
 * AppNavigator es el componente que gestiona la lógica de navegación principal.
 * Consume el AuthContext para decidir qué pantallas mostrar.
 */
function AppNavigator() {
  // Obtiene el usuario y el estado de carga desde el contexto.
  const { user, loading } = useAuth();

  // Mientras se verifica la sesión en AsyncStorage, no se muestra nada.
  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar hidden />
      <Stack.Navigator>
        {user ? (
          // Si hay un usuario en el estado, se muestra el navegador principal de la app.
          <Stack.Screen
            name="Drawer"
            component={DrawerNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          // Si no hay usuario, se muestran las pantallas de Login y Registro.
          <>
            <Stack.Screen
              name="Login"
              component={LoginForm}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterForm}
              options={{ headerTitle: 'Registro' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * El componente App principal que envuelve toda la aplicación con los proveedores necesarios.
 * AuthProvider: Provee el contexto de autenticación.
 * MenuProvider: Necesario para los menús desplegables en la UI.
 */
export default function App() {
  return (
    <AuthProvider>
      <MenuProvider>
        <AppNavigator />
        <Toast />
      </MenuProvider>
    </AuthProvider>
  );
}