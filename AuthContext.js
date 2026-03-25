/**
 * @file AuthContext.js
 * @description Este archivo define el contexto de autenticación para toda la aplicación.
 * Utiliza el Context API de React y AsyncStorage para gestionar y persistir el estado
 * de la sesión del usuario (si está logueado o no, y sus datos).
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Creación del Contexto
// Se crea un contexto que los componentes hijos podrán consumir.
const AuthContext = createContext(null);

/**
 * AuthProvider es un componente "envoltorio" que provee el estado de autenticación
 * y las funciones para manipularlo a todos sus componentes hijos.
 */
export const AuthProvider = ({ children }) => {
  // Estado para almacenar los datos del usuario logueado.
  const [user, setUser] = useState(null);
  // Estado para saber si se está cargando la sesión inicial desde AsyncStorage.
  const [loading, setLoading] = useState(true);

  // useEffect se ejecuta una sola vez cuando el componente se monta.
  // Su propósito es cargar los datos del usuario desde el almacenamiento local
  // para restaurar la sesión si la app fue cerrada.
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error al cargar sesión desde AsyncStorage:', error);
      } finally {
        // Una vez terminado el proceso (con o sin éxito), se marca la carga como finalizada.
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  /**
   * Función para iniciar sesión.
   * Actualiza el estado del usuario y guarda los datos en AsyncStorage para persistencia.
   * @param {object} userData - Los datos del usuario obtenidos de la API.
   */
  const login = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  /**
   * Función para cerrar sesión.
   * Limpia el estado del usuario y elimina sus datos de AsyncStorage.
   */
  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  /**
   * Función para actualizar los datos del usuario en toda la app.
   * Útil para cuando el usuario edita su perfil.
   * @param {object} newUserData - Los nuevos datos del usuario.
   */
  const updateUser = async (newUserData) => {
    setUser(newUserData);
    await AsyncStorage.setItem('user', JSON.stringify(newUserData));
  };

  // El Provider expone el 'user', 'loading' y las funciones a los componentes hijos.
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook personalizado para consumir el AuthContext de forma sencilla y limpia.
 * Evita tener que importar useContext y AuthContext en cada componente que lo necesite.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};