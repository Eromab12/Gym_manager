import React, { useState, useEffect } from 'react';
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
  ScrollView,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import MembershipBlockerScreen from '../../components/MembershipBlockerScreen';

const ROUTINES_STORAGE_KEY = '@userRoutines';

const getDaysLeft = (registrationDate) => {
  if (!registrationDate) return -1;
  const startDate = new Date(registrationDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 30);
  endDate.setHours(23, 59, 59, 999);

  const today = new Date();
  const timeDiff = endDate.getTime() - today.getTime();
  return Math.max(-1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
};

const RoutinesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineDescription, setRoutineDescription] = useState('');
  const [editingRoutine, setEditingRoutine] = useState(null); // Para saber si estamos editando
  const [exercises, setExercises] = useState([]); // Para los ejercicios de la rutina que se crea/edita

  // Estado para el formulario de un nuevo ejercicio
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('');
  const [exerciseReps, setExerciseReps] = useState('');

  const [viewingRoutine, setViewingRoutine] = useState(null); // Para la rutina que se está viendo
  const [isViewModalVisible, setViewModalVisible] = useState(false);
  const [completedExercises, setCompletedExercises] = useState({}); // Para marcar ejercicios completados

  // useFocusEffect se ejecuta cada vez que la pantalla entra en foco
  useFocusEffect(
    React.useCallback(() => {
      const loadRoutines = async () => {
        try {
          // 1. Cargar rutinas asignadas por el entrenador desde el servidor (usando user.id)
          const serverResponse = await fetch(`${API_URL}/users/${user.id}/routines`);
          let serverRoutines = [];
          if (serverResponse.ok) {
            const data = await serverResponse.json();
            // Marcamos estas rutinas como asignadas para poder diferenciarlas si es necesario
            serverRoutines = data.map(r => ({ ...r, isAssigned: true }));
          }

          // 2. Cargar rutinas creadas localmente por el cliente
          const localStoredRoutines = await AsyncStorage.getItem(ROUTINES_STORAGE_KEY);
          const localRoutines = localStoredRoutines ? JSON.parse(localStoredRoutines) : [];

          // 3. Combinar y eliminar duplicados, dando prioridad a las del servidor si hay conflicto de ID
          const routinesMap = new Map();
          // Primero las del servidor para que tengan prioridad
          serverRoutines.forEach(routine => routinesMap.set(routine.id, routine));
          // Luego las locales, que no sobreescribirán si el ID ya existe
          localRoutines.forEach(routine => {
            if (!routinesMap.has(routine.id)) routinesMap.set(routine.id, routine);
          });

          setRoutines(Array.from(routinesMap.values()));
        } catch (e) {
          console.error("Error al cargar rutinas:", e);
          Alert.alert('Error', 'No se pudieron cargar las rutinas. Intentando cargar desde el almacenamiento local.');
          // Plan B: Cargar solo las locales si falla la red
          try {
            const localStoredRoutines = await AsyncStorage.getItem(ROUTINES_STORAGE_KEY);
            if (localStoredRoutines) {
              setRoutines(JSON.parse(localStoredRoutines));
            }
          } catch (localError) {
            console.error("Error al cargar rutinas locales:", localError);
          }
        }
      };
      loadRoutines();
    }, [user]) // Depende del usuario para tener el idCard
  );

  const daysLeft = getDaysLeft(user?.registration_date);
  if (daysLeft <= 0) {
    return <MembershipBlockerScreen navigation={navigation} isNewUser={!user?.registration_date} />;
  }

  const saveRoutines = async (newRoutines) => {
    try {
      // Solo guardamos en local las rutinas que NO fueron asignadas por el entrenador
      const routinesToSaveLocally = newRoutines.filter(r => !r.isAssigned);
      await AsyncStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(routinesToSaveLocally));
      setRoutines(newRoutines);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la rutina.');
    }
  };

  const handleAddOrUpdateRoutine = () => {
    if (!routineName.trim()) {
      Alert.alert('Campo requerido', 'El nombre de la rutina no puede estar vacío.');
      return;
    }
    let updatedRoutines;
    // Si la rutina es asignada, no se puede editar ni eliminar desde el cliente.
    if (editingRoutine && editingRoutine.isAssigned) {
      Alert.alert("Acción no permitida", "Las rutinas asignadas por tu entrenador no se pueden modificar.");
      return;
    } else if (editingRoutine) { // Actualizar rutina local
      updatedRoutines = routines.map(r =>
        r.id === editingRoutine.id ? { ...r, name: routineName, description: routineDescription, exercises: exercises } : r
      );
    } else { // Agregar nueva rutina local
      const newRoutine = { id: Date.now().toString(), name: routineName, description: routineDescription, exercises: exercises };
      updatedRoutines = [...routines, newRoutine];
    }
    saveRoutines(updatedRoutines);
    setModalVisible(false);
    setRoutineName('');
    setRoutineDescription('');
    setEditingRoutine(null);
    setExercises([]);
  };

  const openEditModal = (routine) => {
    setEditingRoutine(routine);
    setRoutineName(routine.name);
    setRoutineDescription(routine.description);
    setExercises(routine.exercises || []);
    setModalVisible(true);
  };

  const handleDeleteRoutine = (id) => {
    const routineToDelete = routines.find(r => r.id === id);
    if (routineToDelete && routineToDelete.isAssigned) {
      Alert.alert("Acción no permitida", "No puedes eliminar una rutina asignada por tu entrenador.");
      return;
    }

    Alert.alert("Confirmar", "¿Estás seguro de que quieres eliminar esta rutina?", [
      { text: "Cancelar" },
      { text: "Eliminar", onPress: () => saveRoutines(routines.filter(r => r.id !== id)) }
    ]);
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
    setEditingRoutine(null); setRoutineName(''); setRoutineDescription(''); setExercises([]);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleRoutinePress(item)}>
      <View style={[styles.routineItem, item.isAssigned && styles.assignedRoutineItem]}>
        {item.isAssigned && (
          <View style={styles.assignedBadge}>
            <Icon name="account-star" size={16} color="#fff" />
            <Text style={styles.assignedBadgeText}>Asignada</Text>
          </View>
        )}
        <View style={styles.routineInfo}>
          <Text style={styles.routineName}>{item.name}</Text>
          <Text style={styles.routineDescription}>{item.description || 'Sin descripción'}</Text>
          <Text style={styles.exerciseCount}>{item.exercises?.length || 0} ejercicios</Text>
        </View>
        {!item.isAssigned && (
          <View style={styles.routineActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}><Icon name="pencil" size={20} color="#007AFF" /></TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteRoutine(item.id)} style={styles.actionButton}><Icon name="delete" size={20} color="#E74C3C" /></TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Rutinas</Text>
      <FlatList data={routines} renderItem={renderItem} keyExtractor={item => item.id} ListEmptyComponent={<Text style={styles.emptyText}>No hay rutinas guardadas.</Text>} />
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal para crear/editar rutinas locales */}
      <Modal animationType="slide" visible={modalVisible} onRequestClose={() => { setModalVisible(false); setEditingRoutine(null); }}>
        <View style={styles.modalEditContainer}>
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
                  <Button title={editingRoutine ? "Actualizar" : "Guardar"} onPress={handleAddOrUpdateRoutine} />
                </View>
              </>
            }
            contentContainerStyle={styles.modalContentContainer}
          />
        </View>
      </Modal>

      {/* Modal para ver detalles de rutina asignada */}
      <Modal animationType="fade" transparent={true} visible={isViewModalVisible} onRequestClose={() => setViewModalVisible(false)}>
        <View style={styles.modalViewContainer}>
          <View style={styles.modalViewContent}>
            <FlatList
              ListHeaderComponent={
                () => {
                  const totalExercises = viewingRoutine?.exercises?.length || 0;
                  const completedCount = Object.values(completedExercises).filter(Boolean).length;
                  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

                  return (
                    <>
                      <Text style={styles.modalTitle}>Detalles de la Rutina</Text>
                      <Text style={styles.viewRoutineName}>{viewingRoutine?.name}</Text>
                      <Text style={styles.viewRoutineDescription}>{viewingRoutine?.description || 'Sin descripción.'}</Text>
                      
                      {totalExercises > 0 && (
                        <View style={styles.progressContainer}>
                          <Text style={styles.progressText}>{`${Math.round(progress)}% completado (${completedCount}/${totalExercises})`}</Text>
                          <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                          </View>
                        </View>
                      )}

                      <View style={styles.exerciseSection}>
                        <Text style={styles.sectionTitle}>Ejercicios</Text>
                      </View>
                    </>
                  );
                }
              }
              data={viewingRoutine?.exercises || []}
              keyExtractor={item => item.id}
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
                <>
                  {!viewingRoutine?.isAssigned && (
                    <Button title="Editar esta rutina" onPress={() => { setViewModalVisible(false); openEditModal(viewingRoutine); }} />
                  )}
                  <View style={{marginTop: 10}}>
                    <Button title="Cerrar" onPress={() => setViewModalVisible(false)} color="#aaa" />
                  </View>
                </>
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
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#151e27ff' },
  routineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f9f9f9', borderRadius: 5, marginBottom: 10 },
  routineInfo: { flex: 1 },
  assignedRoutineItem: {
    backgroundColor: '#E9F5FF', // Un color de fondo diferente para las rutinas asignadas
    borderColor: '#007AFF',
    borderLeftWidth: 5,
  },
  routineName: { fontSize: 18, fontWeight: 'bold' },
  routineDescription: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  exerciseCount: { fontSize: 12, color: '#007AFF', marginTop: 5, fontWeight: 'bold' },
  routineActions: { flexDirection: 'row' },
  actionButton: { padding: 5, marginLeft: 10 },
  addButton: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' },
  // Estilos para el modal de edición/creación
  modalEditContainer: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: Platform.OS === 'android' ? 25 : 50 },
  modalContentContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  // Estilos para el modal de visualización (el que es transparente)
  modalViewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalViewContent: { padding: 20, backgroundColor: 'white', borderRadius: 20, margin: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, marginBottom: 15, textAlign: 'center', fontWeight: 'bold' },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20, borderTopColor: '#eee', borderTopWidth: 1, paddingTop: 20 },
  viewRoutineName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    alignSelf: 'center',
  },
  viewRoutineDescription: {
    fontSize: 16,
    color: '#555',
    alignSelf: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  assignedBadge: {
    position: 'absolute',
    top: -1,
    right: 10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  exerciseSection: { width: '100%', marginTop: 10, marginBottom: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  progressContainer: {
    width: '100%',
    marginVertical: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 12,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  exerciseItem: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5, marginBottom: 5, borderWidth: 1, borderColor: '#eee' },
  exerciseText: { fontSize: 16, flex: 1, marginLeft: 10 },
  completedExerciseText: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  emptyExerciseText: { textAlign: 'center', color: '#888', fontStyle: 'italic', padding: 10 },
  addExerciseForm: { marginTop: 15, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 8 },
  repsSetsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  repsSetsInput: { flex: 1, marginHorizontal: 5 },
});

export default RoutinesScreen;