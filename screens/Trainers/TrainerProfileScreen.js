import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../apiConfig'; // Importar la URL centralizada
import { useAuth } from '../../AuthContext';

// Este componente muestra el perfil del entrenador y ofrece la opción de cerrar sesión.
const TrainerProfileScreen = () => {
  const { user: initialUser, logout, updateUser } = useAuth();
  // Usamos initialUser directamente para mostrar datos.
  // Creamos un estado separado para el formulario de edición.
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (!initialUser) {
    return (
      <View style={styles.container}>
        <Text>No se pudo cargar la información del entrenador.</Text>
      </View>
    );
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancelar edición
      setEditData(null);
    } else {
      // Iniciar edición, pre-cargando el formulario
      setEditData({ ...initialUser, password: '' });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);

    // Validar la longitud de la nueva contraseña si se ha introducido una
    if (editData.password && editData.password.length < 8) {
      Alert.alert('Contraseña Insegura', 'La nueva contraseña debe tener al menos 8 caracteres.');
      setIsLoading(false);
      return;
    }

    const body = { ...editData };
    // No envia una contraseña vacía si no se está cambiando
    if (!body.password) {
      delete body.password;
    }

    try {
      const response = await fetch(`${API_URL}/users/${initialUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error en el servidor' }));
        throw new Error(errorData.message);
      }

      const updatedUserFromApi = await response.json();
      
      // Actualizamos el usuario globalmente a través del contexto.
      await updateUser(updatedUserFromApi);
      setIsEditing(false);
      Alert.alert('Éxito', 'Datos actualizados correctamente.');
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      Alert.alert('Error', error.message || 'No se pudieron guardar los cambios.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInfoField = (label, value, fieldName, keyboardType = 'default', editable = true) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      {isEditing && editable ? (
        <TextInput
          style={styles.infoInput}
          value={String(editData?.[fieldName] || '')}
          onChangeText={(text) => handleInputChange(fieldName, text)}
          keyboardType={keyboardType}
        />
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
       <View style={styles.header}>
        <Text style={styles.title}>Perfil de Entrenador</Text>
        <Menu>
          <MenuTrigger>
            <Icon name="dots-vertical" size={28} color="#333" style={styles.menuIcon} />
          </MenuTrigger>
          <MenuOptions customStyles={menuOptionsStyles}>
            <MenuOption onSelect={logout}>
              <View style={styles.menuOption}>
                <Icon name="logout" size={20} color="#E74C3C" />
                <Text style={[styles.menuOptionText, { color: '#E74C3C' }]}>Cerrar Sesión</Text>
              </View>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>

      <View style={styles.avatarContainer}>
        <Icon name="account-tie" size={100} color="#007AFF" />
        {!isEditing && (
          <TouchableOpacity style={styles.editIconContainer} onPress={handleEditToggle}>
            <Icon name="pencil-circle" size={30} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.detailsCard}>
        {renderInfoField('Nombre', initialUser.name, 'name')}
        {renderInfoField('Apellido', initialUser.last_name, 'last_name')}
        {renderInfoField('Cédula', initialUser.id_card, 'id_card', 'numeric', false)}
        {isEditing && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contraseña:</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordTextInput}
                placeholder="Dejar en blanco para no cambiar"
                value={editData?.password || ''}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                placeholderTextColor="#c7c7cd"
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(v => !v)} style={styles.eyeIcon}>
                <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} size={22} color="#888" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {renderInfoField('Edad', initialUser.age ? `${initialUser.age} años` : '', 'age', 'numeric')}
        {renderInfoField('Peso (kg)', initialUser.weight ? `${initialUser.weight} kg` : '', 'weight', 'decimal-pad')}
        {renderInfoField('Altura (cm)', initialUser.height ? `${initialUser.height} cm` : '', 'height', 'decimal-pad')}
      </View>

      {isEditing && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveChanges} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleEditToggle} disabled={isLoading}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F4F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centra el contenido del header
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative', // Para posicionar el menú
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333', flex: 1, textAlign: 'center'
  },
  menuIcon: {
    padding: 5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    position: 'relative',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 2,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 5,
    textAlign: 'right',
    minWidth: 100,
  },
  passwordInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderColor: '#007AFF',
  },
  passwordTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 5,
    textAlign: 'right',
  },
  eyeIcon: {
    paddingLeft: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 15,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  menuOptionText: {
    marginLeft: 10,
    fontSize: 16,
  }
});

const menuOptionsStyles = {
  optionsContainer: {
    borderRadius: 8,
    paddingVertical: 5,
    marginTop: 30,
  },
};

export default TrainerProfileScreen;