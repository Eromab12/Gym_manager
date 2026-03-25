import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import { API_URL } from '../../apiConfig'; // Importar la URL centralizada
import * as Print from 'expo-print';
import { useAuth } from '../../AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

const getMembershipDates = (startDateString) => {
  if (!startDateString) {
    return { start: 'N/A', end: 'N/A', daysLeft: -1, endDateObj: null };
  }
  const startDate = new Date(startDateString);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 30); // Asumimos una membresía de 30 días

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDayEndDate = new Date(endDate);
  endOfDayEndDate.setHours(23, 59, 59, 999);

  const timeDiff = endOfDayEndDate.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return {
    start: startDate.toLocaleDateString('es-ES', options),
    end: endDate.toLocaleDateString('es-ES', options),
    daysLeft: daysLeft,
    endDateObj: endDate,
  };
};

const ProfileScreen = () => {
  const { user: initialUser, logout, updateUser } = useAuth();
  // Eliminamos el estado local 'user' y usamos 'initialUser' directamente.
  const [editData, setEditData] = useState(null); // Estado para los datos del formulario de edición
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [paymentAmount, setPaymentAmount] = useState('10');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (!initialUser) {
    return (
      <View style={styles.container}>
        <Text>No se pudo cargar la información del usuario.</Text>
      </View>
    );
  }
  const handleEditToggle = () => {
    if (isEditing) {
      setEditData(null); // Limpia los datos de edición al cancelar
    } else {
      setEditData({ ...initialUser, password: '' }); // Prepara los datos para el formulario
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    if (isNaN(parseFloat(editData.age)) || parseFloat(editData.age) <= 0) {
        Alert.alert('Error', 'La edad debe ser un número positivo.');
        setIsLoading(false);
        return;
    }
    if (isNaN(parseFloat(editData.weight)) || parseFloat(editData.weight) <= 0) {
        Alert.alert('Error', 'El peso debe ser un número positivo.');
        setIsLoading(false);
        return;
    }
    if (isNaN(parseFloat(editData.height)) || parseFloat(editData.height) <= 0) {
        Alert.alert('Error', 'La altura debe ser un número positivo.');
        setIsLoading(false);
        return;
    }

    // Validar la longitud de la nueva contraseña si se ha introducido una
    if (editData.password && editData.password.length < 8) {
      Alert.alert('Contraseña Insegura', 'La nueva contraseña debe tener al menos 8 caracteres.');
      setIsLoading(false);
      return;
    }

    // Crear un objeto limpio para el cuerpo de la solicitud
    const body = { ...editData };
    // No enviar una contraseña vacía si no se está cambiando
    if (!body.password) {
      delete body.password;
    }

    try {
      const response = await fetch(`${API_URL}/users/${initialUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Error al actualizar en el servidor.');
      }

      // Usar la respuesta actualizada de la API
      // Actualizamos el usuario globalmente a través del contexto.
      await updateUser(responseData);
      // La actualización del estado global se manejará en el contexto.
      setIsEditing(false);
      Alert.alert('Éxito', 'Datos actualizados correctamente.');
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
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
          value={String(editData?.[fieldName] || '')} // Usar el estado de edición
          onChangeText={(text) => handleInputChange(fieldName, text)}
          keyboardType={keyboardType}
        />
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );

  const generateAndShareInvoice = async (paymentDetails) => {
    const { client, amount, currency, paymentDate, nextPaymentDate } = paymentDetails;

    // Normalizamos los datos del cliente para estandarizar las propiedades
    const normalizedClient = {
      name: client.name,
      lastName: client.lastName || client.last_name, // Acepta 'lastName' o 'last_name'
      idCard: client.idCard || client.id_card,       // Acepta 'idCard' o 'id_card'
    };

    // Convertir el logo a Base64 para incrustarlo en el HTML
    const logoAsset = Asset.fromModule(require('../../assets/logo.png'));
    await logoAsset.downloadAsync();
    const logoBase64 = await FileSystem.readAsStringAsync(logoAsset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .container { border: 1px solid #eee; padding: 20px; border-radius: 10px; }
            h1 { text-align: center; color: #007AFF; }
            .logo { display: block; margin: 0 auto 20px; width: 100px; height: 100px; }
            .details, .payment-info { margin-top: 20px; }
            .details p, .payment-info p { margin: 8px 0; font-size: 16px; line-height: 1.5; }
            .details strong, .payment-info strong { color: #555; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="data:image/png;base64,${logoBase64}" class="logo" alt="Logo Gym" />
            <h1>Comprobante de Pago de la Membresía - AppGym</h1>
            <div class="details">
              <p><strong>Cliente:</strong> ${normalizedClient.name} ${normalizedClient.lastName}</p>
              <p><strong>Cédula:</strong> ${normalizedClient.idCard}</p>
            </div>
            <div class="payment-info">
              <p><strong>Fecha de Pago:</strong> ${paymentDate}</p>
              <p><strong>Próximo Pago:</strong> ${nextPaymentDate}</p>
              <p><strong>Monto Pagado:</strong> ${amount.toFixed(2)} ${currency}</p>
            </div>
            <div class="footer">
              <p>Gracias por su pago.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar o compartir la factura.');
      console.error('Error generando PDF:', error);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    const amountToPay = parseFloat(isCustomAmount ? paymentAmount : '10'); // Mantener la lógica de pago

    if (isNaN(amountToPay) || amountToPay <= 0) {
        Alert.alert('Monto inválido', 'Por favor, ingrese un monto válido para pagar.');
        setIsLoading(false);
        return;
    }

    // La lógica de cálculo de fecha ahora está en el backend.
    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Corregido el header
        body: JSON.stringify({
          userId: initialUser.id,
          amount: amountToPay,
          currency: selectedCurrency,
        }),
      });

      const responseBodyText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseBodyText);
      } catch (e) {
        console.error('Error al parsear respuesta del servidor (pago):', responseBodyText);
        throw new Error('El servidor devolvió una respuesta inesperada.');
      }

      if (!response.ok) {
        throw new Error(responseData.message || 'Error en el servidor al procesar el pago.');
      }

      // Si la respuesta es OK, responseData contiene el usuario actualizado
      const updatedUser = responseData;
      // Actualizamos el usuario globalmente para que la UI refleje el cambio de membresía.
      await updateUser(updatedUser);

      Alert.alert('Pago Realizado', 'Pago Realizado Con exito, gracias por usar AppGym');
      setPaymentModalVisible(false);

      // Generar y compartir la factura
      const paymentDate = new Date(updatedUser.registration_date);
      const nextPaymentDate = new Date(paymentDate);
      nextPaymentDate.setDate(paymentDate.getDate() + 30);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };

      await generateAndShareInvoice({
        client: updatedUser,
        amount: amountToPay,
        currency: selectedCurrency,
        paymentDate: paymentDate.toLocaleDateString('es-ES', options),
        nextPaymentDate: nextPaymentDate.toLocaleDateString('es-ES', options),
      });
    } catch (error) {
      Alert.alert('Error de Pago', error.message || 'No se pudo completar el pago.');
      console.error("Error en handlePayment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!initialUser?.id) return;
    setHistoryModalVisible(true);
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${initialUser.id}/payments`);

      const responseBodyText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseBodyText);
      } catch (e) {
        console.error('Error al parsear respuesta del servidor (historial):', responseBodyText);
        throw new Error('El servidor devolvió una respuesta inesperada.');
      }

      if (!response.ok) {
        throw new Error(responseData.message || 'No se pudo cargar el historial de pagos.');
      }
      setPaymentHistory(responseData);
    } catch (error) {
      Alert.alert('Error al cargar historial', error.message);
      setPaymentHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const membershipInfo = getMembershipDates(initialUser.registration_date);
  const showPaymentButton = membershipInfo.daysLeft >= 0 && membershipInfo.daysLeft <= 7;
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
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
        <Icon name="account-circle" size={100} color="#007AFF" style={styles.avatarIcon} />
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
        {renderInfoField('Edad', initialUser.age ? `${initialUser.age} años` : '', 'age', 'numeric')}
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
        {renderInfoField('Peso (kg)', initialUser.weight ? `${initialUser.weight} kg` : '', 'weight', 'decimal-pad')}
        {renderInfoField('Altura (cm)', initialUser.height ? `${initialUser.height} cm` : '', 'height', 'decimal-pad')}
        {renderInfoField('Inicio de Membresía', getMembershipDates(initialUser.registration_date).start, 'membershipStart', 'default', false)}
        {renderInfoField('Fin de Membresía', getMembershipDates(initialUser.registration_date).end, 'membershipEnd', 'default', false)}
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

      {!isEditing && (
        <TouchableOpacity style={styles.historyButton} onPress={fetchPaymentHistory}>
          <Icon name="history" size={20} color="#007AFF" style={{ marginRight: 10 }} />
          <Text style={styles.historyButtonText}>Ver Historial de Pagos</Text>
        </TouchableOpacity>
      )}

      {!isEditing && (
        <View style={styles.paymentSection}>
          {showPaymentButton && (
            <Text style={styles.expiryWarningText}>
              Tu membresía vence en {membershipInfo.daysLeft} {membershipInfo.daysLeft === 1 ? 'día' : 'días'}.
            </Text>
          )}
          <TouchableOpacity style={[styles.button, styles.paymentButton]} onPress={() => setPaymentModalVisible(true)}>
            <Icon name="credit-card" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Pagar Membresía</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isPaymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Realizar Pago</Text>

            <Text style={styles.modalLabel}>Moneda:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCurrency}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedCurrency(itemValue)}
                dropdownIconColor="#007AFF"
              >
                <Picker.Item label="Dólar (USD)" value="USD" />
                <Picker.Item label="Peso Colombiano (COP)" value="COP" />
                <Picker.Item label="Bolívares (BS)" value="BS" />
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Monto a Pagar:</Text>
            <View style={styles.amountOptionsContainer}>
              <TouchableOpacity
                style={[styles.amountOption, !isCustomAmount && styles.amountOptionSelected]}
                onPress={() => {
                  setIsCustomAmount(false);
                  setPaymentAmount('10');
                }}
              >
                <Text style={[styles.amountOptionText, !isCustomAmount && styles.amountOptionTextSelected]}>$10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.amountOption, isCustomAmount && styles.amountOptionSelected]}
                onPress={() => {
                  setIsCustomAmount(true);
                  setPaymentAmount(''); // Limpiar al seleccionar personalizado
                }}
              >
                <Text style={[styles.amountOptionText, isCustomAmount && styles.amountOptionTextSelected]}>Otro Monto</Text>
              </TouchableOpacity>
            </View>

            {isCustomAmount && (
              <TextInput
                style={styles.customAmountInput}
                placeholder="Ingrese el monto"
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setPaymentModalVisible(false)} disabled={isLoading}><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handlePayment} disabled={isLoading}>{isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pagar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isHistoryModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Historial de Pagos</Text>
            {isHistoryLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <FlatList
                data={paymentHistory}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <Text style={styles.historyDate}>{new Date(item.payment_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                    <Text style={styles.historyAmount}>{parseFloat(item.amount || 0).toFixed(2)} {item.currency}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyHistoryText}>No tienes pagos registrados.</Text>}
                style={{ width: '100%' }}
              />
            )}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { marginTop: 20, width: '80%' }]}
              onPress={() => setHistoryModalVisible(false)}>
              <Text style={styles.buttonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F4F7FC', // Un fondo más suave
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centra el contenido del header
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 25 : 20, // Ajuste para status bar
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
    padding: 5, // Área táctil más grande
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
    right: '35%', // Ajusta para centrar relativo al avatar
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
    minWidth: 100, // Asegura espacio para escribir
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
  paymentSection: {
    marginHorizontal: 15,
    marginBottom: 20,
    marginTop: 10,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
  },
  expiryWarningText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    flexDirection: 'row',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginHorizontal: 15,
    backgroundColor: '#E9F5FF',
    borderRadius: 10,
  },
  historyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#007AFF',
    width: '90%',
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
  },
  // Estilos del Modal de Pago
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 10,
    color: '#333',
  },
  pickerContainer: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
  },
  amountOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  amountOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  amountOptionSelected: {
    backgroundColor: '#007AFF',
  },
  amountOptionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  amountOptionTextSelected: {
    color: '#fff',
  },
  customAmountInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  // Estilos del Historial
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  historyDate: {
    fontSize: 16,
    color: '#333',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyHistoryText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
  },
});

const menuOptionsStyles = {
  optionsContainer: {
    borderRadius: 8,
    paddingVertical: 5,
    marginTop: 30, // Ajusta para que no se solape con el trigger
  },
};

export default ProfileScreen;