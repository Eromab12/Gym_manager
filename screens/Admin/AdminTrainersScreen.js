import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../../apiConfig'; // Importar la URL centralizada
import useCsvExport from '../../hooks/useCsvExport';
import useUserManagement from '../../hooks/useUserManagement';
import FormModal from '../../components/FormModal';

const AdminTrainersScreen = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [formData, setFormData] = useState({
    name: '', lastName: '', idCard: '', age: '', weight: '', height: '', password: '',
  });
  const { exportToCsv } = useCsvExport();

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error('Error al obtener la lista de usuarios.');
      const data = await response.json();
      setTrainers(data.filter(user => user.type === 'Entrenador'));
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los entrenadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openModal = (trainer = null) => {
    if (trainer) {
      setEditingTrainer(trainer);
      setFormData({
        name: trainer.name,
        lastName: trainer.lastName,
        idCard: trainer.idCard,
        age: String(trainer.age),
        weight: String(trainer.weight),
        height: String(trainer.height),
        password: '', // La contraseña no se muestra, solo se puede cambiar
      });
    } else {
      setEditingTrainer(null);
      setFormData({ name: '', lastName: '', idCard: '', age: '', weight: '', height: '', password: '' });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTrainer(null);
  };

  const handleSaveSuccess = (savedTrainer, isEditing) => {
    if (isEditing) {
      setTrainers(prev => prev.map(t => (t.id === savedTrainer.id ? savedTrainer : t)));
    } else {
      setTrainers(prev => [...prev, savedTrainer]);
    }
  };

  const handleDeleteSuccess = (deletedTrainerId) => {
    setTrainers(prev => prev.filter(t => t.id !== deletedTrainerId));
  };

  const { saveUser, isSaving, deleteUser } = useUserManagement({
    userType: 'Entrenador',
    onSaveSuccess: handleSaveSuccess,
    onDeleteSuccess: handleDeleteSuccess,
    onCloseModal: closeModal,
  });

  const handleSave = () => {
    saveUser(formData, editingTrainer);
  };

  const handleDelete = (trainer) => {
    deleteUser(trainer);
  };

  const handleExportTrainers = () => {
    const dataToExport = trainers.map(trainer => ({
      idCard: trainer.idCard || trainer.id_card, // Acepta ambos formatos
      name: trainer.name,
      lastName: trainer.lastName || trainer.last_name, // Acepta ambos formatos
      age: trainer.age,
    }));
    
    const headers = { idCard: 'Cedula', name: 'Nombre', lastName: 'Apellido', age: 'Edad' };
    exportToCsv('reporte_entrenadores.csv', headers, dataToExport);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name="account-tie" size={30} color="#E74C3C" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name} {item.last_name}</Text>
        <Text style={styles.cardId}>C.I: {item.id_card}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openModal(item)}><Icon name="pencil" size={24} color="#F39C12" /></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginLeft: 15 }}><Icon name="delete" size={24} color="#E74C3C" /></TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#E74C3C" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Entrenadores</Text>
        <TouchableOpacity onPress={handleExportTrainers}>
          <Icon name="file-excel" size={28} color="#1D6F42" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={trainers}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay entrenadores registrados.</Text>}
        contentContainerStyle={{ padding: 15 }}
        onRefresh={fetchTrainers}
        refreshing={loading}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>

      <FormModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingTrainer ? 'Editar Entrenador' : 'Nuevo Entrenador'}
        onSave={handleSave}
        isSaving={isSaving}
        saveButtonText={editingTrainer ? 'Actualizar' : 'Guardar'}
      >
        <TextInput placeholder="Nombre" value={formData.name} onChangeText={v => handleInputChange('name', v)} style={styles.input} />
        <TextInput placeholder="Apellido" value={formData.lastName} onChangeText={v => handleInputChange('lastName', v)} style={styles.input} />
        <TextInput placeholder="Cédula" value={formData.idCard} onChangeText={v => handleInputChange('idCard', v)} style={styles.input} keyboardType="numeric" editable={!editingTrainer} />
        <TextInput placeholder={editingTrainer ? 'Contraseña -- Dejar en blanco para no cambiar' : 'Contraseña'} value={formData.password} onChangeText={v => handleInputChange('password', v)} style={styles.input} secureTextEntry />
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
    paddingTop: Platform.OS === 'android' ? 25 : 50,
    paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', position: 'relative'
  },
  title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: '#333' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    marginRight: 15,
  },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardId: { fontSize: 14, color: '#666', marginTop: 2 },
  cardActions: { flexDirection: 'row' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#777' },
  addButton: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#E74C3C', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
});

export default AdminTrainersScreen;