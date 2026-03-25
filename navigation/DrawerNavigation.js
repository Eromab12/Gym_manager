import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet } from 'react-native'; // Importar View, Text, StyleSheet
import { useAuth } from '../AuthContext'; // Importar el hook de autenticación

import ClientModule from '../modules/ClientModule';
import TrainerModule from '../modules/TrainerModule';
import AdminModule from '../modules/AdminModule';

const Drawer = createDrawerNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text>Cargando usuario...</Text>
  </View>
);

/**
 * Componente principal de navegación post-login.
 * Utiliza un Drawer Navigator para renderizar el módulo correspondiente
 * (Admin, Cliente o Entrenador) basado en el tipo de usuario autenticado.
 * El usuario se obtiene del AuthContext.
 */
function DrawerNavigator() {
  const { user } = useAuth(); // Obtener el usuario directamente del contexto

  // Mostrar pantalla de carga si el usuario no está disponible
  if (!user) {
    return <LoadingScreen />;
  }

  return (
    // Ya no es necesario pasar `initialParams` porque los módulos hijos también usarán el contexto
    <Drawer.Navigator screenOptions={{ headerShown: false }}>
      {user.type === 'Admin' ? (
        <Drawer.Screen name="AdminModule" component={AdminModule} />
      ) : user.type === 'Cliente' ? (
        <Drawer.Screen name="ClientModule" component={ClientModule} />
      ) : (
        <Drawer.Screen name="TrainerModule" component={TrainerModule} />
      )}
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DrawerNavigator;