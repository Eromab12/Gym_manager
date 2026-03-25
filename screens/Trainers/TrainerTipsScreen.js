import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import FormModal from '../../components/FormModal';
import { TextInput } from 'react-native-paper';

/**
 * Parsea un texto y convierte las URLs en componentes de texto clicables.
 * @param {string} text - El contenido a parsear.
 * @param {object} linkStyle - El estilo a aplicar a los enlaces.
 * @returns {Array} - Un array de componentes de texto.
 */
const renderContentWithLinks = (text, linkStyle) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return <Text key={index} style={linkStyle} onPress={() => Linking.openURL(part)}>{part}</Text>;
    }
    return part;
  });
};

const TrainerTipsScreen = () => {
  const { user } = useAuth();
  const [tips, setTips] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', category_id: null });
  const [isSaving, setIsSaving] = useState(false);

  const fetchTips = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/consejos/trainer/${user.id}`);
      if (!response.ok) throw new Error('Error al obtener los consejos.');
      const data = await response.json();
      setTips(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los consejos.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/consejos/categorias`);
      if (!response.ok) throw new Error('Error al obtener las categorías.');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }, []);

  useEffect(() => {
    fetchTips();
    fetchCategories();
  }, [fetchTips, fetchCategories]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openModal = (tip = null) => {
    if (tip) {
      setEditingTip(tip);
      setFormData({ title: tip.title, content: tip.content, category_id: tip.category_id });
    } else {
      setEditingTip(null);
      setFormData({ title: '', content: '', category_id: categories[0]?.id || null });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTip(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert('Datos inválidos', 'El título y el contenido no pueden estar vacíos.');
      return;
    }

    setIsSaving(true);
    const url = editingTip ? `${API_URL}/consejos/${editingTip.id}` : `${API_URL}/consejos`;
    const method = editingTip ? 'PUT' : 'POST';
    const body = JSON.stringify({
      ...formData,
      created_by_trainer_id: user.id,
    });

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el consejo.');
      }
      
      const savedTip = await response.json();

      if (editingTip) {
        setTips(prev => prev.map(t => (t.id === editingTip.id ? { ...savedTip, category_name: formData.category_name } : t)));
      } else {
        setTips(prev => [{ ...savedTip, category_name: formData.category_name }, ...prev]);
      }

      closeModal();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Confirmar', '¿Seguro que quieres eliminar este consejo?', [
      { text: 'Cancelar' },
      {
        text: 'Eliminar',
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/consejos/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('No se pudo eliminar el consejo.');
            setTips(prev => prev.filter(t => t.id !== id));
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.category_name && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category_name}</Text>
          </View>
        )}
        <Text style={styles.cardContent} numberOfLines={2}>
          {renderContentWithLinks(item.content, styles.link)}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            Publicado: {new Date(item.created_at).toLocaleDateString('es-ES')}
          </Text>
          <View style={styles.likesContainer}>
            <Icon name="heart" size={16} color="#E74C3C" />
            <Text style={styles.likesText}>{item.likes_count || 0}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openModal(item)}><Icon name="pencil" size={24} color="#F39C12" /></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 15 }}><Icon name="delete" size={24} color="#E74C3C" /></TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Consejos</Text>
      </View>
      <FlatList
        data={tips}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>Aún no has publicado ningún consejo.</Text>}
        contentContainerStyle={{ padding: 15 }}
        onRefresh={fetchTips}
        refreshing={loading}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
        <Icon name="plus" size={30} color="#fff" />
      </TouchableOpacity>

      <FormModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingTip ? 'Editar Consejo' : 'Nuevo Consejo'}
        onSave={handleSave}
        isSaving={isSaving}
        saveButtonText={editingTip ? 'Actualizar' : 'Publicar'}
      >
        <TextInput label="Título" value={formData.title} onChangeText={v => handleInputChange('title', v)} style={styles.input} />
        <TextInput label="Contenido" value={formData.content} onChangeText={v => handleInputChange('content', v)} style={styles.input} multiline numberOfLines={4} />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.category_id}
            onValueChange={(itemValue) => handleInputChange('category_id', itemValue)}
          >
            <Picker.Item label="Seleccionar categoría..." value={null} />
            {categories.map(cat => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  header: { paddingTop: Platform.OS === 'android' ? 25 : 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  cardInfo: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  categoryBadge: {
    backgroundColor: '#E9F5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  cardContent: { fontSize: 14, color: '#666', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  cardDate: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  cardActions: { flexDirection: 'row' },
  likesContainer: { flexDirection: 'row', alignItems: 'center' },
  likesText: { marginLeft: 5, fontSize: 14, fontWeight: 'bold', color: '#555' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#777' },
  addButton: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  input: { width: '100%', marginBottom: 15, backgroundColor: '#fff' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, marginBottom: 15, backgroundColor: '#fff' },
});

export default TrainerTipsScreen;