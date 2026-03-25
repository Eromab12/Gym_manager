import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableOpacity,
  Platform,
} from 'react-native';

// Dependencias
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../apiConfig'; // Importar la URL centralizada

// Componente reutilizable para crear una sección con título e ícono.
function Section({ title, icon, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={20} color="#007AFF" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// Componente reutilizable para un campo de texto con un ícono a la izquierda.
function InputWithIcon({
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  error,
}) {
  return (
    <View style={styles.inputGroup}>
      <Icon name={icon} size={20} color="#aaa" style={styles.icon} />
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        style={styles.textInput}
      />
      {/* Muestra un mensaje de error si existe */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export default function RegisterForm({ navigation }) {
  // Estados para cada campo del formulario.
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [type, setType] = useState('Cliente');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Se reemplaza el estado 'age' por uno para la fecha de nacimiento.
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1)); // Fecha por defecto
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Estado para almacenar los errores de validación.
  const [errors, setErrors] = useState({});

  // Nueva función para calcular la edad a partir de una fecha.
  const calculateAge = (birthDate) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Función para validar todos los campos del formulario.
  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // Expresiones regulares para validaciones.
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const numberRegex = /^[0-9]+$/;

    if (!name || !nameRegex.test(name)) {
      newErrors.name = 'Nombre inválido (solo letras)';
      isValid = false;
    }

    if (!lastName || !nameRegex.test(lastName)) {
      newErrors.lastName = 'Apellido inválido (solo letras)';
      isValid = false;
    }

    if (!idCard || !numberRegex.test(idCard)) {
      newErrors.idCard = 'Cédula solo números';
      isValid = false;
    }

    // Se añade la validación para la edad mínima.
    if (calculateAge(dateOfBirth) < 14) {
      newErrors.dateOfBirth = 'Debes tener al menos 14 años.';
      isValid = false;
    }

    if (!weight || isNaN(weight) || parseFloat(weight) <= 0) {
      newErrors.weight = 'Peso debe ser un número positivo';
      isValid = false;
    }

    if (!height || isNaN(height) || parseFloat(height) <= 0) {
      newErrors.height = 'Altura debe ser un número positivo';
      isValid = false;
    }

    if (!password || password.length < 8) {
      newErrors.password = 'Contraseña mínima de 8 caracteres';
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
      isValid = false;
    }

    // Actualiza el estado de errores y devuelve si el formulario es válido.
    setErrors(newErrors);
    return isValid;
  };

  // Función que se ejecuta al presionar el botón de registrar.
  const handleRegister = async () => {
    // Si la validación falla, no se continúa.
    if (!validateForm()) return;

    // Construye el objeto de usuario con los datos del formulario.
    const newUser = {
      name,
      lastName,
      idCard,
      age: calculateAge(dateOfBirth), // Se envía la edad calculada.
      weight: parseFloat(weight),
      height: parseFloat(height),
      type,
      password,
    };

    try {
      // Realiza la petición POST al endpoint de registro en el backend.
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      // 1. Leer la respuesta como texto para evitar errores de parseo
      const responseBodyText = await response.text();
      let data;

      try {
        // 2. Intentar convertir el texto a JSON
        data = JSON.parse(responseBodyText);
      } catch (e) {
        // 3. Si falla, es un error del servidor. Mostrar el texto y detener.
        console.error('Error al parsear respuesta del servidor:', responseBodyText);
        throw new Error('El servidor devolvió una respuesta inesperada.');
      }

      if (response.ok) {
        // Muestra una notificación de éxito.
        Toast.show({
          type: 'success',
          text1: 'Registro exitoso',
          position: 'bottom',
          visibilityTime: 2000, // 2 segundos es suficiente
          onHide: () => navigation.replace('Login'), // Navega cuando el toast se oculta
        });
      } else {
        // Muestra una notificación de error con el mensaje del servidor.
        Toast.show({
          type: 'error',
          text1: 'Error de Registro',
          text2: data.message || 'No se pudo registrar el usuario',
        });
      }
    } catch (error) {
      // Maneja errores de conexión con el servidor.
      console.error('Error al conectar con el servidor:', error);
      Toast.show({
        type: 'error',
        text1: 'Sin conexión',
        text2: error.message || 'No se pudo conectar con el servidor.',
      });
    }
  };

  // Manejador para cuando el usuario selecciona una fecha en el picker.
  const onChangeDate = (event, selectedDate) => {
    // Se oculta el selector de fecha (importante en Android).
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  // El KeyboardAvoidingView ajusta la vista cuando el teclado aparece.
  // 'padding' en iOS y 'height' en Android es un comportamiento común y recomendado.
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Sección de Datos Personales */}
        <Section title="Datos Personales" icon="account-box">
          <InputWithIcon
            placeholder="Nombre"
            value={name}
            onChangeText={setName}
            icon="account"
            keyboardType="default"
            error={errors.name}
          />
          <InputWithIcon
            placeholder="Apellido"
            value={lastName}
            onChangeText={setLastName}
            icon="account"
            keyboardType="default"
            error={errors.lastName}
          />
          <InputWithIcon
            placeholder="Cédula"
            value={idCard}
            onChangeText={setIdCard}
            icon="id-card"
            keyboardType="numeric"
            error={errors.idCard}
          />
          {/* El campo de edad se reemplaza por un selector de fecha de nacimiento. */}
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputGroup}>
            <Icon name="calendar" size={20} color="#aaa" style={styles.icon} />
            <Text style={styles.dateText}>{dateOfBirth.toLocaleDateString('es-ES')}</Text>
          </TouchableOpacity>
          {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

          {/* El componente DateTimePicker se muestra condicionalmente. */}
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={dateOfBirth}
              mode="date"
              display="spinner" // 'spinner' ofrece una buena experiencia en ambas plataformas.
              onChange={onChangeDate}
              // Se establece una fecha máxima para asegurar la edad mínima (ej: 14 años).
              maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 14))}
            />
          )}
        </Section>

        {/* Sección de Datos Médicos */}
        <Section title="Datos Médicos" icon="heart-pulse">
          <InputWithIcon
            placeholder="Peso (kg)"
            value={weight}
            onChangeText={setWeight}
            icon="weight"
            keyboardType="decimal-pad"
            error={errors.weight}
          />
          <InputWithIcon
            placeholder="Altura (cm)"
            value={height}
            onChangeText={setHeight}
            icon="ruler"
            keyboardType="decimal-pad"
            error={errors.height}
          />
        </Section>

        {/* Sección de Tipo de Usuario */}
        <Section title="Tipo de Usuario" icon="account-tie">
          <View style={styles.picker}>
            <Picker selectedValue={type} onValueChange={setType}>
              <Picker.Item label="Cliente" value="Cliente" />
              <Picker.Item label="Entrenador" value="Entrenador" />
            </Picker>
          </View>
        </Section>
        {/* Sección de Seguridad */}
        <Section title="Seguridad" icon="lock">
          <InputWithIcon
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            icon="lock"
            secureTextEntry
            error={errors.password}
          />
          <InputWithIcon
            placeholder="Confirmar Contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            icon="lock-check"
            secureTextEntry
            error={errors.confirmPassword}
          />
        </Section>

        <Button title="Registrar" onPress={handleRegister} color="#007AFF" />

        <View style={styles.linkContainer}>
          <Text style={styles.link} onPress={() => navigation.goBack()}>
            Volver al Login
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40, // Añade espacio extra en la parte inferior para evitar que la barra de navegación cubra el contenido.
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
  },
  dateText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  picker: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: -5,
    marginBottom: 5,
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});