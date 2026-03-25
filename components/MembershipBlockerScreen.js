import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../AuthContext';

const MembershipBlockerScreen = ({ navigation, isNewUser }) => {
  const { logout } = useAuth();

  if (isNewUser) {
    return (
      <View style={styles.blockerContainer}>
        <Icon name="account-clock-outline" size={80} color="#F39C12" />
        <Text style={[styles.blockerTitle, { color: '#F39C12' }]}>Cuenta Pendiente</Text>
        <Text style={styles.blockerText}>
          Tu cuenta ha sido creada con éxito, pero necesita ser activada por un administrador.
          Por favor, contacta al personal del gimnasio para completar el proceso.
        </Text>
        <TouchableOpacity
          style={[styles.blockerButton, styles.logoutButton]}
          onPress={logout}
        >
          <Text style={styles.blockerButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Contenido para membresía vencida
  return (
    <View style={styles.blockerContainer}>
      <Icon name="lock-alert-outline" size={80} color="#E74C3C" />
      <Text style={styles.blockerTitle}>Membresía Vencida</Text>
      <Text style={styles.blockerText}>
        Tu acceso a esta sección está restringido. Por favor, renueva tu membresía para continuar disfrutando de todos los beneficios.
      </Text>
      <TouchableOpacity
        style={styles.blockerButton}
        onPress={() => navigation.navigate('Perfil')}
      >
        <Text style={styles.blockerButtonText}>Ir a Pagar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  blockerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FC',
    padding: 30,
  },
  blockerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  blockerText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  blockerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  blockerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#7f8c8d', // Un color más neutro para la acción secundaria
    marginTop: 15,
  },
});

export default MembershipBlockerScreen;
