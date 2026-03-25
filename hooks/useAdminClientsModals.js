import { useState } from 'react';
import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { API_URL } from '../apiConfig';

/**
 * Custom Hook para gestionar todos los modales de la pantalla de AdminClientsScreen.
 * Encapsula el estado y la lógica para los modales de:
 * 1. Crear/Editar Cliente.
 * 2. Ver Historial de Pagos.
 * 3. Registrar un nuevo Pago.
 *
 * @param {object} config - Objeto de configuración.
 * @param {function} config.onPaymentSuccess - Callback que se ejecuta tras un pago exitoso para refrescar la lista de clientes.
 * @returns {object} - Un objeto con los estados y manejadores para los modales.
 */
const useAdminClientsModals = ({ onPaymentSuccess }) => {
  // --- Estados para el Modal de Crear/Editar ---
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '', lastName: '', idCard: '', age: '', weight: '', height: '', password: '',
  });

  // --- Estados para el Modal de Historial ---
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [historyClient, setHistoryClient] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // --- Estados para el Modal de Pago ---
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [payingClient, setPayingClient] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('10');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // --- Lógica para el Modal de Crear/Editar ---
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openEditModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        lastName: client.lastName,
        idCard: client.idCard,
        age: String(client.age),
        weight: String(client.weight),
        height: String(client.height),
        password: '',
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', lastName: '', idCard: '', age: '', weight: '', height: '', password: '' });
    }
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingClient(null);
  };

  // --- Lógica para el Modal de Historial ---
  const openHistoryModal = async (client) => {
    setHistoryClient(client);
    setHistoryModalVisible(true);
    setIsHistoryLoading(true);
    setPaymentHistory([]);
    try {
      const response = await fetch(`${API_URL}/users/${client.id}/payments`);
      const responseBodyText = await response.text();
      const responseData = JSON.parse(responseBodyText);
      if (!response.ok) throw new Error(responseData.message || 'No se pudo cargar el historial.');
      setPaymentHistory(responseData);
    } catch (error) {
      Alert.alert('Error al cargar historial', error.message);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => setHistoryModalVisible(false);

  // --- Lógica para el Modal de Pago ---
  const openPaymentModal = (client) => {
    setPayingClient(client);
    setPaymentAmount('10');
    setSelectedCurrency('USD');
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => setPaymentModalVisible(false);

  const generateAndShareInvoice = async (paymentDetails, paymentId) => {
    const { client, amount, currency, paymentDate, nextPaymentDate } = paymentDetails;
    const normalizedClient = {
      name: client.name,
      lastName: client.lastName || client.last_name,
      idCard: client.idCard || client.id_card,
    };
    // Convertir el logo a Base64
    const logoAsset = Asset.fromModule(require('../assets/logo.png'));
    await logoAsset.downloadAsync();
    const logoBase64 = await FileSystem.readAsStringAsync(logoAsset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const htmlContent = `
      <html>
        <head><style>body{font-family:Arial,sans-serif;margin:40px;color:#333}.container{border:1px solid #eee;padding:20px;border-radius:10px}h1{text-align:center;color:#E74C3C}.logo{display:block;margin:0 auto 20px;width:100px;height:100px}.details p,.payment-info p{margin:8px 0;font-size:16px;line-height:1.5}.details strong,.payment-info strong{color:#555}.footer{margin-top:40px;text-align:center;font-size:12px;color:#888}</style></head>
        <body><div class="container"><img src="data:image/png;base64,${logoBase64}" class="logo" alt="Logo Gym" /><h1>Factura de Membresía - AppGym</h1><div class="details"><p><strong>Cliente:</strong> ${normalizedClient.name} ${normalizedClient.lastName}</p><p><strong>Cédula:</strong> ${normalizedClient.idCard}</p></div><div class="payment-info"><p><strong>Fecha de Pago:</strong> ${paymentDate}</p><p><strong>Próximo Pago:</strong> ${nextPaymentDate}</p><p><strong>Monto Pagado:</strong> ${amount.toFixed(2)} ${currency}</p></div><div class="footer"><p>Gracias por su pago.</p></div></div></body>
      </html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Guardar en el servidor
      const fileData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileName = `factura-${client.id}-${paymentId}.pdf`;

      await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentId,
          fileName: fileName,
          fileData: fileData,
        }),
      });

      // Compartir localmente
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      // Si falla el guardado en servidor, al menos que se pueda compartir.
      // El error de guardado se loggea pero no se muestra al usuario para no interrumpir el flujo.
      Alert.alert('Error', 'No se pudo generar o compartir la factura.');
    }
  };

  const handleRegisterPayment = async () => {
    if (!payingClient) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Monto Inválido', 'Por favor, ingrese un monto numérico positivo.');
      return;
    }

    setIsPaymentLoading(true);
    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: payingClient.id, amount, currency: selectedCurrency }),
      });
      const { updatedUser, paymentId } = await response.json();
      if (!response.ok) throw new Error(updatedUser?.message || 'Error al procesar el pago en el servidor.');

      Alert.alert('Éxito', `Pago de ${amount} ${selectedCurrency} registrado para ${payingClient.name}.`);
      closePaymentModal();
      onPaymentSuccess(); // Llama al callback para refrescar la lista de clientes

      const paymentDate = new Date(updatedUser.registration_date);
      const nextPaymentDate = new Date(paymentDate);
      nextPaymentDate.setDate(paymentDate.getDate() + 30);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };

      await generateAndShareInvoice({
        client: payingClient,
        amount,
        currency: selectedCurrency,
        paymentDate: paymentDate.toLocaleDateString('es-ES', options),
        nextPaymentDate: nextPaymentDate.toLocaleDateString('es-ES', options),
      }, paymentId);
    } catch (error) {
      Alert.alert('Error de Pago', error.message);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  return {
    // Estados y manejadores para el modal de edición/creación
    isEditModalVisible,
    editingClient,
    formData,
    handleInputChange,
    openEditModal,
    closeEditModal,

    // Estados y manejadores para el modal de historial
    isHistoryModalVisible,
    historyClient,
    paymentHistory,
    isHistoryLoading,
    openHistoryModal,
    closeHistoryModal,

    // Estados y manejadores para el modal de pago
    isPaymentModalVisible,
    payingClient,
    paymentAmount,
    setPaymentAmount,
    selectedCurrency,
    setSelectedCurrency,
    isPaymentLoading,
    openPaymentModal,
    closePaymentModal,
    handleRegisterPayment,
  };
};

export default useAdminClientsModals;