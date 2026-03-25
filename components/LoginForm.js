import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ImageBackground,
  Animated,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../AuthContext'; // 1. Importar el hook de autenticación
import { API_URL } from '../apiConfig'; // Importar la URL centralizada

export default function LoginForm({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current; // Valor inicial para la escala
  const { login } = useAuth(); // 2. Obtener la función de login del contexto

  // Efecto para la animación del logo
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1, // Escala un 10% más grande
          duration: 1500, // Duración de la animación de crecimiento
          useNativeDriver: true, // Mejora el rendimiento
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, // Vuelve a la escala original
          duration: 1500, // Duración de la animación de encogimiento
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (e) {
        Alert.alert('Error', 'Servidor devolvió respuesta inesperada');
        return;
      }

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Credenciales incorrectas');
        return;
      }

      const user = data.user;

      if (!user) {
        Alert.alert('Error', 'Usuario no encontrado');
        return;
      }

      // 3. Usar la función de login del contexto. Esto actualizará el estado global.
      await login(user);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    }
  };

  return (
    <ImageBackground
      // NOTA: Asegúrate de tener una imagen en la ruta 'assets/login-background.jpg'
      // o reemplaza la ruta con la de tu imagen.
      source={require('../assets/login-background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Icon name="dumbbell" size={80} color="#fff" />
          <Text style={styles.logoText}>CyberSpa Gym</Text>
        </Animated.View>

        {/* Formulario */}
        <Text style={styles.subtitle}>Bienvenido a CyberSpa Gym</Text>

        <View style={styles.inputContainer}>
          <Icon name="account" size={24} color="#666" style={styles.icon} />
          <TextInput
            placeholder="Nombre o Cédula"
            value={identifier}
            onChangeText={setIdentifier}
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock" size={24} color="#666" style={styles.icon} />
          <TextInput
            placeholder="Contraseña"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
            <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>¿No tienes cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Overlay oscuro para legibilidad
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff', // Texto blanco para contrastar con el fondo
    marginTop: 10,
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    color: '#eee', // Color de texto más claro
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  icon: {
    marginRight: 10,
  },
  eyeIcon: {
    padding: 5, // Aumenta el área táctil del ícono
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  registerText: {
    color: '#fff',
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 5,
  },
});