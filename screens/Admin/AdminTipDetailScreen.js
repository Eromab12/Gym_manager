import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../../apiConfig';

const AdminTipDetailScreen = ({ route, navigation }) => {
  const { tipId, tipTitle } = route.params;
  const [tip, setTip] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: tipTitle });
  }, [navigation, tipTitle]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tipResponse, commentsResponse] = await Promise.all([
        fetch(`${API_URL}/consejos?tipId=${tipId}`), // Un truco para obtener un solo tip con sus detalles
        fetch(`${API_URL}/consejos/${tipId}/comentarios`),
      ]);

      if (!tipResponse.ok || !commentsResponse.ok) {
        throw new Error('No se pudieron cargar los detalles.');
      }

      const tipsData = await tipResponse.json();
      const tipData = tipsData.find(t => t.id === tipId);
      const commentsData = await commentsResponse.json();

      setTip(tipData);
      setComments(commentsData);
    } catch (error) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [tipId, navigation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteComment = (comment) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Seguro que quieres eliminar este comentario?`,
      [
        { text: 'Cancelar' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/admin/comentarios/${comment.id}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('No se pudo eliminar el comentario.');
              Alert.alert('Éxito', 'Comentario eliminado.');
              setComments(prev => prev.filter(c => c.id !== comment.id));
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderCommentItem = ({ item }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentContent}>
        <Text style={styles.commentAuthor}>{`${item.user_name} ${item.user_last_name}`}</Text>
        <Text style={styles.commentText}>{item.comment}</Text>
        <Text style={styles.commentDate}>{new Date(item.created_at).toLocaleString('es-ES')}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteComment(item)} style={styles.deleteButton}>
        <Icon name="delete" size={22} color="#E74C3C" />
      </TouchableOpacity>
    </View>
  );

  if (loading || !tip) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#E74C3C" /></View>;
  }

  return (
    <FlatList
      data={comments}
      renderItem={renderCommentItem}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={styles.card}>
          <Text style={styles.content}>{tip.content}</Text>
          <View style={styles.commentsSectionHeader}>
            <Text style={styles.commentsTitle}>Comentarios</Text>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.noCommentsText}>No hay comentarios en este consejo.</Text>}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F7FC',
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FC',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 10,
    elevation: 2,
  },
  content: {
    fontSize: 17,
    color: '#444',
    lineHeight: 26,
  },
  commentsSectionHeader: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    marginHorizontal: 15,
    alignItems: 'center',
  },
  commentContent: { flex: 1, marginRight: 10 },
  commentAuthor: { fontWeight: 'bold', color: '#333', marginBottom: 3 },
  commentText: { color: '#555' },
  commentDate: { fontSize: 12, color: '#aaa', marginTop: 5 },
  deleteButton: { padding: 5 },
  noCommentsText: { textAlign: 'center', padding: 20, color: '#888', fontStyle: 'italic' },
});

export default AdminTipDetailScreen;
