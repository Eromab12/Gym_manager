import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TextInput } from 'react-native-paper';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../AuthContext'; // Importamos el hook de autenticación
import { useFocusEffect } from '@react-navigation/native';
import MembershipBlockerScreen from '../../components/MembershipBlockerScreen';

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

const ClientTipsScreen = ({ navigation }) => {
  const { user } = useAuth(); // Obtenemos el usuario actual
  const [tips, setTips] = useState([]);
  const [filteredTips, setFilteredTips] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTips = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Usamos Keyboard.dismiss para ocultar el teclado si está abierto durante la recarga
      Keyboard.dismiss();
      const response = await fetch(`${API_URL}/consejos?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Error al obtener los consejos.');
      }
      const data = await response.json();
      setTips(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los consejos.');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [user]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/consejos/categorias`);
      if (!response.ok) throw new Error('Error al obtener las categorías.');
      const data = await response.json();
      setCategories([{ id: null, name: 'Todos' }, ...data]); // Añadir 'Todos' al principio
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }, []);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filteredData = tips.filter(tip => {
      // Filtro por categoría
      const categoryMatch = selectedCategory ? tip.category_id === selectedCategory : true;
      if (!categoryMatch) return false;

      // Filtro por texto de búsqueda
      const titleMatch = tip.title.toLowerCase().includes(lowercasedQuery);
      const contentMatch = tip.content.toLowerCase().includes(lowercasedQuery);
      const trainerNameMatch = `${tip.trainer_name} ${tip.trainer_last_name}`.toLowerCase().includes(lowercasedQuery);
      return titleMatch || contentMatch || trainerNameMatch;
    });
    setFilteredTips(filteredData);
  }, [searchQuery, tips, selectedCategory]);

  // Usamos useFocusEffect para recargar los datos cada vez que la pantalla entra en foco.
  // Esto soluciona el problema de la advertencia "non-serializable" y mantiene la lista actualizada.
  useFocusEffect(
    useCallback(() => {
      fetchTips();
      if (categories.length === 0) fetchCategories(); // Cargar categorías solo si no existen
    }, [fetchTips, fetchCategories])
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTips(true);
    setRefreshing(false);
  }, [fetchTips]);

  const handleLikeToggle = async (tipId, hasLiked) => {
    const originalTips = [...tips];
    
    // Actualización optimista de la UI
    const updatedTips = tips.map(tip => {
      if (tip.id === tipId) {
        return {
          ...tip,
          user_has_liked: !hasLiked,
          likes_count: hasLiked ? String(parseInt(tip.likes_count) - 1) : String(parseInt(tip.likes_count) + 1),
        };
      }
      return tip;
    });
    setTips(updatedTips);

    // Petición a la API
    try {
      const url = `${API_URL}/consejos/${tipId}/like`;
      const method = hasLiked ? 'DELETE' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error('Error al actualizar el like.');

    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar tu "me gusta".');
      setTips(originalTips); // Revertir en caso de error
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('TipDetail', { tipId: item.id, initialTipData: item })}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="account-circle" size={40} color="#555" />
          <View style={styles.trainerInfo}>
            <Text style={styles.trainerName}>{`${item.trainer_name} ${item.trainer_last_name}`}</Text>
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.category_name && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category_name}</Text>
            </View>
          )}
          <Text style={styles.cardContent} numberOfLines={3}>
            {renderContentWithLinks(item.content, styles.link)}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.likeButton}>
            <Icon name={item.user_has_liked ? "heart" : "heart-outline"} size={24} color={item.user_has_liked ? "#E74C3C" : "#777"} />
            <Text style={styles.likeCount}>{item.likes_count}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  const daysLeft = getDaysLeft(user?.registration_date);
  if (daysLeft <= 0) {
    return <MembershipBlockerScreen navigation={navigation} isNewUser={!user?.registration_date} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Consejos de Expertos</Text>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollView}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory === cat.id && styles.categoryButtonSelected
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryButtonText, selectedCategory === cat.id && styles.categoryButtonTextSelected]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          label="Buscar por título, contenido o entrenador..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          mode="outlined"
        />
      </View>
      <FlatList
        data={filteredTips}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>{searchQuery ? 'No se encontraron resultados.' : 'Todavía no hay consejos.'}</Text>}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  header: { paddingTop: Platform.OS === 'android' ? 25 : 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  searchContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: '#fff',
  },
  categoryScrollView: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  categoryButton: {
    backgroundColor: '#E9F5FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  searchInput: { backgroundColor: '#F4F7FC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  trainerInfo: { marginLeft: 10 },
  trainerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardDate: { fontSize: 12, color: '#999' },
  cardBody: {},
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#007AFF' },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  categoryText: {
    color: '#555',
    fontSize: 12,
  },
  cardContent: { fontSize: 15, color: '#555', lineHeight: 22 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  likeButton: { flexDirection: 'row', alignItems: 'center' },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  likeCount: { marginLeft: 8, fontSize: 16, color: '#555' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#777' },
});

export default ClientTipsScreen;