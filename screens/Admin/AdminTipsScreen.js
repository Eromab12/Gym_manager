import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../../apiConfig';
import { useFocusEffect } from '@react-navigation/native';

const AdminTipsScreen = ({ navigation }) => {
  const [tips, setTips] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchTips = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/consejos`);
      if (!response.ok) throw new Error('Error al obtener los consejos.');
      const data = await response.json();
      setTips(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los consejos.');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTips();
    }, [fetchTips])
  );

  const handleDeleteTip = (tip) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Seguro que quieres eliminar el consejo "${tip.title}"? Esta acción es irreversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/admin/consejos/${tip.id}`, {
                method: 'DELETE',
              });
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo eliminar el consejo.');
              }
              Alert.alert('Éxito', 'El consejo ha sido eliminado.');
              fetchTips(true);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AdminTipDetail', { tipId: item.id, tipTitle: item.title })}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardAuthor}>Por: {item.trainer_name} {item.trainer_last_name}</Text>
        <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
        <Text style={styles.cardDate}>
          Publicado: {new Date(item.created_at).toLocaleDateString('es-ES')}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteTip(item)} style={styles.deleteButton}>
        <Icon name="delete-forever" size={28} color="#E74C3C" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#E74C3C" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tips}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay consejos publicados.</Text>}
        contentContainerStyle={{ padding: 15 }}
        onRefresh={() => fetchTips(true)}
        refreshing={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, alignItems: 'center' },
  cardInfo: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardAuthor: { fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#666', marginBottom: 8 },
  cardDate: { fontSize: 12, color: '#999' },
  deleteButton: { padding: 10 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#777' },
});

export default AdminTipsScreen;
