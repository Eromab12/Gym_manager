import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function CustomDrawerContent({ user, logout }) {
  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <Image
          source={{ uri: 'https://via.placeholder.com/100'  }}
          style={styles.drawerImage}
        />
        <Text style={styles.drawerName}>{user.name} {user.lastName}</Text>
        <Text style={styles.drawerType}>{user.type}</Text>
      </View>

      <TouchableOpacity style={styles.drawerItem} onPress={() => {}}>
        <Icon name="home" size={24} color="#007AFF" />
        <Text style={styles.drawerLabel}>Inicio</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Perfil')}>
        <Icon name="account" size={24} color="#007AFF" />
        <Text style={styles.drawerLabel}>Mi Perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.drawerItem} onPress={logout}>
        <Icon name="logout" size={24} color="#E74C3C" />
        <Text style={[styles.drawerLabel, { color: '#E74C3C' }]}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingTop: 40,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  drawerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  drawerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerType: {
    fontSize: 14,
    color: '#666',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  drawerLabel: {
    marginLeft: 15,
    fontSize: 16,
    color: '#000',
  },
});