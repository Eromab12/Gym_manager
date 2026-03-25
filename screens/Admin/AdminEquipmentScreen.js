import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_URL } from '../../apiConfig'; // Importar la URL centralizada
import useCsvExport from '../../hooks/useCsvExport';
import FormModal from '../../components/FormModal';

/**
 * Calcula la próxima fecha de mantenimiento y los días restantes.
 * Los mantenimientos son el 1 de junio y el 1 de diciembre.
 * @returns {{date: string, days: number}} - La fecha formateada y los días restantes.
 * @param {string|null} maintenanceDateString - La fecha de mantenimiento desde la BD.
 */
const getMaintenanceInfo = (maintenanceDateString) => {
  if (!maintenanceDateString) {
    return { text: 'Sin fecha', days: Infinity, color: '#888' };
  }

  const nextMaintenanceDate = new Date(maintenanceDateString);
  const today = new Date();
  // Calcular días restantes desde el inicio del día de hoy
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const timeDiff = nextMaintenanceDate.getTime() - startOfToday.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const formattedDate = format(nextMaintenanceDate, "dd 'de' MMM", { locale: es });
  let color = '#2ECC71'; // Verde (Lejos)
  if (daysRemaining <= 7) color = '#F39C12'; // Naranja (Pronto)
  if (daysRemaining < 0) color = '#E74C3C'; // Rojo (Vencido)

  return { text: formattedDate, days: daysRemaining, color };
};

const AdminEquipmentScreen = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', quantity: '', next_maintenance_date: null });
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const { exportToCsv } = useCsvExport();

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/equipment`);
      if (!response.ok) throw new Error('Error al cargar equipos.');
      const data = await response.json();
      setEquipment(data);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el inventario de equipos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!formData.name.trim() || !formData.quantity.trim() || isNaN(parseInt(formData.quantity))) {
      Alert.alert('Datos inválidos', 'El nombre no puede estar vacío y la cantidad debe ser un número.');
      return;
    }

    setIsSaving(true);
    const url = editingItem ? `${API_URL}/equipment/${editingItem.id}` : `${API_URL}/equipment`;
    const method = editingItem ? 'PUT' : 'POST';
    const body = JSON.stringify({
      name: formData.name,
      quantity: parseInt(formData.quantity),
      next_maintenance_date: formData.next_maintenance_date ? new Date(formData.next_maintenance_date).toISOString().split('T')[0] : null,
    });

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const savedItem = await response.json();
      if (!response.ok) throw new Error(savedItem.message || 'Error al guardar el equipo.');
      
      if (editingItem) {
        setEquipment(prev => prev.map(item => (item.id === editingItem.id ? savedItem : item)));
      } else {
        setEquipment(prev => [...prev, savedItem]);
      }

      Alert.alert('Éxito', `Equipo ${editingItem ? 'actualizado' : 'agregado'} correctamente.`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSaving(false);
      closeModal();
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        quantity: String(item.quantity),
        next_maintenance_date: item.next_maintenance_date ? new Date(item.next_maintenance_date) : null,
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', quantity: '', next_maintenance_date: null });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, next_maintenance_date: selectedDate }));
    }
  };

  const openHistoryModal = async (item) => {
    setHistoryItem(item);
    setHistoryModalVisible(true);
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/equipment/${item.id}/maintenance-history`);
      if (!response.ok) throw new Error('No se pudo cargar el historial.');
      const data = await response.json();
      setMaintenanceHistory(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => setHistoryModalVisible(false);

  const handleDelete = (id) => {
    Alert.alert('Confirmar', '¿Seguro que quieres eliminar este equipo del inventario?', [
      { text: 'Cancelar' },
      { text: 'Eliminar', onPress: async () => {
        try {
          const response = await fetch(`${API_URL}/equipment/${id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('No se pudo eliminar el equipo.');
          setEquipment(prev => prev.filter(item => item.id !== id)); // Actualización optimista
          Alert.alert('Éxito', 'Equipo eliminado correctamente.');
        } catch (error) {
          Alert.alert('Error', error.message);
        }
      }},
    ]);
  };

  const handleCompleteMaintenance = (item) => {
    Alert.alert(
      'Confirmar Mantenimiento',
      `¿Marcar el mantenimiento de "${item.name}" como realizado? La próxima fecha se establecerá 6 meses a partir de hoy.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/equipment/${item.id}/complete-maintenance`, { method: 'POST' });
              const updatedItem = await response.json();
              if (!response.ok) throw new Error(updatedItem.message || 'No se pudo actualizar el mantenimiento.');
              
              setEquipment(prev => prev.map(eq => eq.id === item.id ? updatedItem : eq));
              Alert.alert('Éxito', 'Mantenimiento actualizado.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleExportEquipment = () => {
    const dataToExport = equipment.map(item => ({
      name: item.name,
      quantity: item.quantity,
    }));

    const headers = { name: 'Nombre', quantity: 'Cantidad' };
    exportToCsv('reporte_equipos.csv', headers, dataToExport);
  };

  const renderItem = ({ item }) => {
    const maintenanceInfo = getMaintenanceInfo(item.next_maintenance_date);
    let daysText = 'días';
    if (maintenanceInfo.days === 1 || maintenanceInfo.days === -1) daysText = 'día';

    return (
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Icon name="dumbbell" size={30} color="#E74C3C" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>Cantidad: {item.quantity}</Text>
          {item.next_maintenance_date ? (
            <View style={[styles.maintenanceContainer, { backgroundColor: maintenanceInfo.color }]}>
              <Icon name="wrench-clock" size={14} color="#fff" />
              <Text style={styles.maintenanceText}>
                {maintenanceInfo.text}
                {maintenanceInfo.days < 0
                  ? ` (Vencido hace ${Math.abs(maintenanceInfo.days)} ${daysText})`
                  : ` (Faltan ${maintenanceInfo.days} ${daysText})`}
              </Text>
            </View>
          ) : (
            <Text style={styles.noMaintenanceText}>Sin fecha de mantenimiento</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openHistoryModal(item)} style={{ marginRight: 15 }}>
            <Icon name="history" size={24} color="#3498DB" />
          </TouchableOpacity>
          {item.next_maintenance_date && (
            <TouchableOpacity onPress={() => handleCompleteMaintenance(item)} style={{ marginRight: 15 }}>
              <Icon name="check-circle" size={24} color="#2ECC71" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => openModal(item)}><Icon name="pencil" size={24} color="#F39C12" /></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 15 }}><Icon name="delete" size={24} color="#E74C3C" /></TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#E74C3C" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Equipos</Text>
        <TouchableOpacity onPress={handleExportEquipment}>
          <Icon name="file-excel" size={28} color="#1D6F42" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={equipment}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay equipos registrados.</Text>}
        contentContainerStyle={{ padding: 15 }}
        onRefresh={loadEquipment}
        refreshing={loading}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>

      <FormModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingItem ? 'Editar Equipo' : 'Añadir Equipo'}
        onSave={handleAddOrUpdate}
        isSaving={isSaving}
        saveButtonText={editingItem ? 'Actualizar' : 'Guardar'}
      >
        <TextInput placeholder="Nombre del equipo" value={formData.name} onChangeText={v => setFormData(p => ({ ...p, name: v }))} style={styles.input} />
        <TextInput placeholder="Cantidad" value={formData.quantity} onChangeText={v => setFormData(p => ({ ...p, quantity: v }))} style={styles.input} keyboardType="numeric" />
        
        <Text style={styles.dateLabel}>Próximo Mantenimiento:</Text>
        <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.datePickerText}>
            {formData.next_maintenance_date ? format(formData.next_maintenance_date, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'Seleccionar fecha'}
          </Text>
          <Icon name="calendar" size={20} color="#555" />
        </TouchableOpacity>
        {formData.next_maintenance_date && (
          <TouchableOpacity onPress={() => setFormData(p => ({ ...p, next_maintenance_date: null }))}>
            <Text style={styles.clearDateText}>Limpiar fecha</Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={formData.next_maintenance_date || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </FormModal>

      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeHistoryModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Historial de Mantenimiento</Text>
            <Text style={styles.modalSubtitle}>{historyItem?.name}</Text>
            {isHistoryLoading ? (
              <ActivityIndicator size="large" color="#E74C3C" />
            ) : (
              <FlatList
                data={maintenanceHistory}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <Icon name="wrench" size={20} color="#555" />
                    <Text style={styles.historyDate}>
                      {format(new Date(item.maintenance_date), "dd 'de' MMMM, yyyy", { locale: es })}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No hay registros de mantenimiento.</Text>}
                style={{ width: '100%', marginTop: 10 }}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={closeHistoryModal}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centra el contenido del header
    paddingTop: Platform.OS === 'android' ? 25 : 50,
    paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', position: 'relative'
  },
  title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: '#333' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardIcon: {
    backgroundColor: '#FEECEB',
    borderRadius: 10,
    padding: 10,
  },
  cardInfo: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 18, fontWeight: 'bold' },
  itemQuantity: { fontSize: 14, color: '#666', marginBottom: 5 },
  cardActions: { flexDirection: 'row' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#777' },
  addButton: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#E74C3C', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, borderRadius: 8, fontSize: 16, backgroundColor: '#fff' },
  dateLabel: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '500' },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  clearDateText: {
    color: '#E74C3C',
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 15,
    textDecorationLine: 'underline',
  },
  maintenanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  maintenanceText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  noMaintenanceText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 5,
  },
  // Estilos para el modal de historial
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },
  historyDate: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#E74C3C',
    paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default AdminEquipmentScreen;