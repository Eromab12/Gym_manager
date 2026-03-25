import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Button,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import useUserManagement from '../../hooks/useUserManagement';
import FormModal from '../../components/FormModal'; // Importar el componente de modal

/**
 * Pantalla para que los entrenadores gestionen a sus clientes.
 * Permite ver la lista de clientes, asignarles rutinas, y también
 * añadir, editar o eliminar clientes del sistema.
 */
const TrainerClientsScreen = () => {
  const { user: trainer } = useAuth();
  const [clients, setClients] = useState([]);
  const [trainerRoutines, setTrainerRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);

  // Estados para el modal de añadir/editar cliente
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    idCard: '',
    age: '',
    weight: '',
    height: '',
    password: '',
  });

  const fetchClients = async () => {
    // Esta función se usará para recargar la lista después de guardar.
    // La implementación completa ya existe dentro de useFocusEffect.
    // Por ahora, podemos dejarla vacía o añadir la lógica si es necesario.
  };

  /**
   * Hook que se ejecuta cada vez que la pantalla entra en foco.
   * Carga la lista de clientes y las rutinas creadas por el entrenador.
   */
  useFocusEffect(
    useCallback(() => {
      const fetchClients = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/users`);
          if (!response.ok) throw new Error('Error al obtener la lista de clientes.');
          const data = await response.json();
          const clientUsers = data.filter(user => user.type === 'Cliente');
          setClients(clientUsers);
        } catch (error) {
          Alert.alert('Error', error.message || 'No se pudieron cargar los clientes.');
        } finally {
          setLoading(false);
        }
      };

      const loadTrainerRoutines = async () => {
        if (!trainer?.id) return;
        try {
          const response = await fetch(`${API_URL}/routines/trainer/${trainer.id}`);
          if (response.ok) {
            const data = await response.json();
            setTrainerRoutines(data);
          } else {
            console.error('Failed to fetch trainer routines');
          }
        } catch (e) {
          console.error('Error loading trainer routines:', e);
        }
      };

      fetchClients();
      loadTrainerRoutines();
    }, [trainer]) // Se ejecuta solo si el objeto 'trainer' cambia.
  );

  /**
   * Abre el modal para asignar una rutina a un cliente específico.
   * @param {object} client - El objeto del cliente seleccionado.
   */
  const handleOpenAssignModal = (client) => {
    if (trainerRoutines.length === 0) {
      Alert.alert("Sin Rutinas", "Primero debes crear al menos una rutina en la pestaña 'Gestionar Rutinas' para poder asignarla.");
      return;
    }
    setSelectedClient(client);
    setIsAssignModalVisible(true);
  };

  /**
   * Maneja la lógica para enviar la asignación de una rutina a un cliente a la API.
   * @param {object} routine - La rutina a asignar.
   */
  const handleAssignRoutine = async (routine) => {
    if (!selectedClient || !trainer) return;

    Alert.alert(
      "Confirmar Asignación",
      `¿Deseas asignar la rutina "${routine.name}" a ${selectedClient.name} ${selectedClient.lastName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: 'Asignar',
          onPress: async () => {
            const body = {
              routine_id: routine.id, // Asegurarse de que se usa el nombre correcto
              assigned_by_trainer_id: trainer.id,
            };
            try {
              const response = await fetch(`${API_URL}/users/${selectedClient.id}/assign-routine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });

              if (!response.ok) {
                throw new Error('El servidor no pudo procesar la asignación.');
              }

              Alert.alert('Éxito', `Rutina "${routine.name}" asignada correctamente a ${selectedClient.name}.`);
              setIsAssignModalVisible(false);
              setSelectedClient(null);
            } catch (error) {
              Alert.alert('Error de Asignación', error.message || 'No se pudo asignar la rutina.');
            }
          },
        },
      ]
    );
  };

  /**
   * Actualiza el estado del formulario a medida que el usuario escribe.
   * @param {string} field - El campo del formulario a actualizar (ej. 'name').
   * @param {string} value - El nuevo valor del campo.
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Abre el modal para añadir un nuevo cliente o editar uno existente.
   * @param {object | null} client - El cliente a editar, o null si se va a crear uno nuevo.
   */
  const openModal = (client = null) => {
    if (client) {
      // Modo de edición
      setEditingClient(client);
      setFormData({
        name: client.name,
        lastName: client.lastName,
        idCard: client.idCard,
        age: String(client.age || ''),
        weight: String(client.weight || ''),
        height: String(client.height || ''),
        password: '', // La contraseña no se muestra, solo se puede cambiar
      });
    } else {
      // Modo de adición
      setEditingClient(null);
      setFormData({ name: '', lastName: '', idCard: '', age: '', weight: '', height: '', password: '' });
    }
    setModalVisible(true);
  };

  /**
   * Cierra el modal de edición/creación de cliente.
   */
  const closeModal = () => {
    setModalVisible(false);
    setEditingClient(null);
  };

  /**
   * Guarda los cambios de un cliente (nuevo o editado) en la base de datos.
   */
  const handleSaveSuccess = () => {
    // La lista se recarga automáticamente gracias a useFocusEffect,
    // por lo que no necesitamos actualizar el estado 'clients' manualmente aquí.
  };

  const handleDeleteSuccess = (deletedClientId) => {
    setClients(prev => prev.filter(c => c.id !== deletedClientId));
  };

  const { saveUser, isSaving, deleteUser } = useUserManagement({
    userType: 'Cliente',
    onSaveSuccess: handleSaveSuccess,
    onDeleteSuccess: handleDeleteSuccess,
    onCloseModal: closeModal,
  });

  const handleSave = () => {
    saveUser(formData, editingClient);
  };

  /**
   * Muestra una alerta de confirmación y, si se confirma, elimina un cliente.
   * @param {object} client - El cliente a eliminar.
   */
  const handleDelete = (client) => {
    deleteUser(client);
  };

  /**
   * Renderiza cada tarjeta de cliente en la lista.
   * @param {object} props - Propiedades pasadas por FlatList, incluyendo el `item` (cliente).
   */
  const renderClientCard = ({ item }) => (
    <View style={styles.clientCard}>
      <Icon name="account-circle" size={50} color="#007AFF" />
      <Text style={styles.clientName} numberOfLines={2}>{item.name} {item.lastName}</Text>
      <TouchableOpacity style={styles.assignButton} onPress={() => handleOpenAssignModal(item)}>
        <Icon name="clipboard-arrow-down-outline" size={20} color="#fff" />
        <Text style={styles.assignButtonText}>Asignar</Text>
      </TouchableOpacity>
      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={() => openModal(item)}>
          <Icon name="pencil" size={22} color="#F39C12" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginLeft: 15 }}>
          <Icon name="delete" size={22} color="#E74C3C" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Clientes</Text>
        <TouchableOpacity style={styles.addButtonHeader} onPress={() => openModal(null)}>
          <Icon name="plus-circle" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={clients}
        renderItem={renderClientCard}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No se encontraron clientes.</Text></View>}
        onRefresh={() => {}} // onRefresh es requerido para que el spinner aparezca
        refreshing={loading}
      />

      <Modal animationType="slide" transparent={true} visible={isAssignModalVisible} onRequestClose={() => setIsAssignModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Asignar Rutina a {selectedClient?.name}</Text>
            <FlatList
              data={trainerRoutines}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.routineItem} onPress={() => handleAssignRoutine(item)}><Text style={styles.routineName}>{item.name}</Text><Text style={styles.routineDescription}>{item.description}</Text></TouchableOpacity>
              )}
              ListEmptyComponent={<Text>No tienes rutinas para asignar.</Text>}
            />
            <Button title="Cancelar" onPress={() => setIsAssignModalVisible(false)} color="#aaa" />
          </View>
        </View>
      </Modal>
      
      <FormModal
        visible={isModalVisible}
        onClose={closeModal}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        onSave={handleSave}
        isSaving={isSaving}
      >
        <TextInput placeholder="Nombre" value={formData.name} onChangeText={v => handleInputChange('name', v)} style={styles.input} />
        <TextInput placeholder="Apellido" value={formData.lastName} onChangeText={v => handleInputChange('lastName', v)} style={styles.input} />
        <TextInput placeholder="Cédula" value={formData.idCard} onChangeText={v => handleInputChange('idCard', v)} style={styles.input} keyboardType="numeric" editable={!editingClient} />
        <TextInput placeholder={editingClient ? 'Nueva contraseña (opcional)' : 'Contraseña'} value={formData.password} onChangeText={v => handleInputChange('password', v)} style={styles.input} secureTextEntry />
        <TextInput placeholder="Edad" value={formData.age} onChangeText={v => handleInputChange('age', v)} style={styles.input} keyboardType="numeric" />
        <TextInput placeholder="Peso (kg)" value={formData.weight} onChangeText={v => handleInputChange('weight', v)} style={styles.input} keyboardType="decimal-pad" />
        <TextInput placeholder="Altura (cm)" value={formData.height} onChangeText={v => handleInputChange('height', v)} style={styles.input} keyboardType="decimal-pad" />
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centra el contenido del header
    paddingTop: Platform.OS === 'android' ? 25 : 20,
    paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', position: 'relative'
  },
  title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: '#333' },
  addButtonHeader: { padding: 5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { padding: 10 },
  clientCard: { flex: 1, margin: 10, padding: 15, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, minHeight: 180, justifyContent: 'space-between' },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center', marginTop: 8, flexShrink: 1 },
  assignButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginTop: 10 },
  assignButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  emptyText: { fontSize: 16, color: '#777' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  routineItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  routineName: { fontSize: 16, fontWeight: 'bold' },
  routineDescription: { fontSize: 14, color: '#666', marginTop: 4 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, borderRadius: 8, fontSize: 16 },
});

export default TrainerClientsScreen;