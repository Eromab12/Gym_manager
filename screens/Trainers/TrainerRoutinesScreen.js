import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../AuthContext';

const TrainerRoutinesScreen = () => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineDescription, setRoutineDescription] = useState('');
  const [exercises, setExercises] = useState([]); // Nuevo estado para los ejercicios

  // Estado para el formulario de un nuevo ejercicio
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('');
  const [exerciseReps, setExerciseReps] = useState('');

  const [editingRoutine, setEditingRoutine] = useState(null);

  // Estados para el modal de visualización
  const [isViewModalVisible, setViewModalVisible] = useState(false);
  const [viewingRoutine, setViewingRoutine] = useState(null);
  const [completedExercises, setCompletedExercises] = useState({});

  useFocusEffect(
    React.useCallback(() => {
      const loadRoutines = async () => {
        if (!user?.id) return; // No hacer nada si no hay ID de entrenador
        try {
          const response = await fetch(`${API_URL}/routines/trainer/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setRoutines(data);
          } else {
            Alert.alert('Error', 'No se pudieron cargar las rutinas desde el servidor.');
          }
        } catch (e) {
          Alert.alert('Error de Red', 'No se pudieron cargar las rutinas.');
        }
      };

      loadRoutines();
    }, [user]) // Se ejecuta cuando la pantalla entra en foco o el usuario cambia
  );

  const handleAddOrUpdateRoutine = async () => {
    if (!routineName.trim()) {
      Alert.alert('Campo requerido', 'El nombre de la rutina no puede estar vacío.');
      return;
    }

    const routineData = {
      name: routineName,
      description: routineDescription,
      exercises: exercises,
      created_by_trainer_id: user.id, // Corregido para coincidir con el backend
    };

    const url = editingRoutine ? `${API_URL}/routines/${editingRoutine.id}` : `${API_URL}/routines`;
    const method = editingRoutine ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routineData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'El servidor no pudo procesar la solicitud.');
      }

      const savedRoutine = await response.json(); // Capturamos la rutina guardada desde la respuesta

      Alert.alert('Éxito', `Rutina ${editingRoutine ? 'actualizada' : 'guardada'} correctamente.`);
      
      if (editingRoutine) {
        // Reemplazamos la rutina antigua con la versión actualizada del servidor
        setRoutines(routines.map(r => (r.id === editingRoutine.id ? savedRoutine : r)));
      } else {
        // Añadimos la nueva rutina (devuelta por el servidor) a nuestra lista
        setRoutines([...routines, savedRoutine]);
      }

      // Limpiar y cerrar el modal
      setModalVisible(false);
      setRoutineName('');
      setRoutineDescription('');
      setEditingRoutine(null);
      setExercises([]);
    } catch (error) {
      Alert.alert('Error al Guardar', error.message);
    }
  };

  const openEditModal = (routine) => {
    setEditingRoutine(routine);
    setRoutineName(routine.name);
    setRoutineDescription(routine.description);
    setExercises(routine.exercises || []);
    setModalVisible(true);
  };

  const handleDeleteRoutine = (id) => {
    Alert.alert("Confirmar", "¿Estás seguro de que quieres eliminar esta rutina?", [
      { text: "Cancelar" },
      {
        text: "Eliminar",
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/routines/${id}`, { method: 'DELETE' });
            if (!response.ok) {
              throw new Error('No se pudo eliminar la rutina.');
            }
            Alert.alert('Éxito', 'Rutina eliminada.');
            setRoutines(routines.filter(r => r.id !== id)); // Actualización optimista
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        }
      }
    ]);
  };

  const handleAddExercise = () => {
    if (!exerciseName.trim() || !exerciseSets.trim() || !exerciseReps.trim()) {
      Alert.alert('Campos requeridos', 'Completa todos los campos del ejercicio.');
      return;
    }
    const newExercise = {
      id: Date.now().toString(),
      name: exerciseName,
      sets: exerciseSets,
      reps: exerciseReps,
    };
    setExercises([...exercises, newExercise]);
    // Limpiar inputs de ejercicio
    setExerciseName('');
    setExerciseSets('');
    setExerciseReps('');
  };

  const handleDeleteExercise = (exerciseId) => {
    setExercises(exercises.filter(ex => ex.id !== exerciseId));
  };

  const openAddModal = () => {
    setEditingRoutine(null);
    setRoutineName('');
    setRoutineDescription('');
    setExercises([]);
    setModalVisible(true);
  };

  const handleRoutinePress = (routine) => {
    setViewingRoutine(routine);
    setCompletedExercises({}); // Resetea el estado de completados al abrir
    setViewModalVisible(true);
  };

  const handleToggleComplete = (exerciseId) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };


  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleRoutinePress(item)}>
      <View style={styles.cardHeader}>
        <Icon name="clipboard-text-outline" size={24} color="#007AFF" />
        <Text style={styles.routineName}>{item.name}</Text>
      </View>
      <Text style={styles.routineDescription} numberOfLines={2}>
        {item.description || 'Sin descripción'}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.exerciseInfo}>
          <Icon name="weight-lifter" size={16} color="#555" />
          <Text style={styles.exerciseCount}>{item.exercises?.length || 0} ejercicios</Text>
        </View>
        <View style={styles.routineActions}>
          <TouchableOpacity onPress={(e) => {
            e.stopPropagation(); // Evita que se dispare el onPress de la tarjeta
            openEditModal(item);
          }} style={styles.actionButton}>
            <Icon name="pencil" size={22} color="#F39C12" />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => {
            e.stopPropagation(); // Evita que se dispare el onPress de la tarjeta
            handleDeleteRoutine(item.id);
          }} style={styles.actionButton}>
            <Icon name="delete" size={22} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Rutinas</Text>
      </View>
      <FlatList
        data={routines}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No has creado ninguna rutina.</Text>}
        contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 15 }}
      />
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal // Modal de Edición/Creación
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); setEditingRoutine(null); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalView}>
            <FlatList
              ListHeaderComponent={
                <>
                  <Text style={styles.modalTitle}>{editingRoutine ? 'Editar Rutina' : 'Nueva Rutina'}</Text>
                  <TextInput placeholder="Nombre de la rutina" value={routineName} onChangeText={setRoutineName} style={styles.input} />
                  <TextInput placeholder="Descripción (opcional)" value={routineDescription} onChangeText={setRoutineDescription} style={styles.input} multiline />
                  <View style={styles.exerciseSection}>
                    <Text style={styles.sectionTitle}>Ejercicios</Text>
                  </View>
                </>
              }
              data={exercises}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseText}>{item.name} ({item.sets} x {item.reps})</Text>
                  <TouchableOpacity onPress={() => handleDeleteExercise(item.id)}>
                    <Icon name="close-circle" size={22} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyExerciseText}>Aún no hay ejercicios.</Text>}
              ListFooterComponent={
                <>
                  <View style={styles.addExerciseForm}>
                    <TextInput placeholder="Nombre del Ejercicio" value={exerciseName} onChangeText={setExerciseName} style={styles.input} />
                    <View style={styles.repsSetsContainer}>
                      <TextInput placeholder="Series" value={exerciseSets} onChangeText={setExerciseSets} style={[styles.input, styles.repsSetsInput]} keyboardType="numeric" />
                      <TextInput placeholder="Reps" value={exerciseReps} onChangeText={setExerciseReps} style={[styles.input, styles.repsSetsInput]} keyboardType="numeric" />
                    </View>
                    <Button title="Agregar Ejercicio" onPress={handleAddExercise} />
                  </View>
                  <View style={styles.modalButtons}>
                    <Button title="Cancelar" onPress={() => { setModalVisible(false); setEditingRoutine(null); }} color="#aaa" />
                    <Button title={editingRoutine ? "Actualizar" : "Guardar Rutina"} onPress={handleAddOrUpdateRoutine} />
                  </View>
                </>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para ver detalles de la rutina */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isViewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.viewModalContainer}>
          <View style={styles.viewModalContent}>
            <FlatList
              ListHeaderComponent={
                <>
                  <Text style={styles.modalTitle}>{viewingRoutine?.name}</Text>
                  <Text style={styles.viewRoutineDescription}>{viewingRoutine?.description || 'Sin descripción.'}</Text>
                  <View style={styles.exerciseSection}>
                    <Text style={styles.sectionTitle}>Ejercicios</Text>
                  </View>
                </>
              }
              data={viewingRoutine?.exercises || []}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => {
                const isCompleted = completedExercises[item.id];
                return (
                  <TouchableOpacity style={styles.exerciseItem} onPress={() => handleToggleComplete(item.id)}>
                    <Icon name={isCompleted ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={24} color={isCompleted ? '#2ECC71' : '#007AFF'} />
                    <Text style={[styles.exerciseText, isCompleted && styles.completedExerciseText]}>{item.name} ({item.sets} x {item.reps})</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyExerciseText}>Esta rutina no tiene ejercicios.</Text>}
              ListFooterComponent={
                <View style={{marginTop: 20}}>
                  <Button title="Cerrar" onPress={() => setViewModalVisible(false)} color="#aaa" />
                </View>
              }
              contentContainerStyle={{paddingBottom: 20}}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  header: { paddingTop: Platform.OS === 'android' ? 25 : 20, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  routineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  exerciseInfo: { flexDirection: 'row', alignItems: 'center' },
  exerciseCount: { fontSize: 14, color: '#555', marginLeft: 5, fontWeight: '500' },
  routineActions: { flexDirection: 'row' },
  actionButton: { padding: 5, marginLeft: 15 },
  addButton: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#777' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 22, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20, borderTopColor: '#eee', borderTopWidth: 1, paddingTop: 20, paddingBottom: 10 },
  exerciseSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  exerciseItem: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 5, marginBottom: 5, borderWidth: 1, borderColor: '#eee' },
  exerciseText: { fontSize: 16, flex: 1, marginLeft: 10 },
  completedExerciseText: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  emptyExerciseText: { textAlign: 'center', color: '#888', fontStyle: 'italic', padding: 10 },
  addExerciseForm: { marginTop: 15, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 8 },
  repsSetsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  repsSetsInput: { flex: 1, marginHorizontal: 5 },
  // Estilos para el modal de visualización
  viewModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  viewModalContent: { padding: 20, backgroundColor: 'white', borderRadius: 20, margin: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxHeight: '80%' },
  viewRoutineDescription: {
    fontSize: 16,
    color: '#555',
    alignSelf: 'center',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
});

export default TrainerRoutinesScreen;