import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  Linking,
  Keyboard,
  Modal,
} from 'react-native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../AuthContext';

/**
 * Anida una lista plana de comentarios en una estructura de árbol (comentarios y respuestas).
 * @param {Array} commentList - La lista de comentarios obtenida de la API.
 * @returns {Array} - Una lista de comentarios anidados.
 */
const nestComments = (commentList) => {
  if (!commentList) return [];
  const commentMap = {};

  commentList.forEach(comment => {
    commentMap[comment.id] = { ...comment, replies: [] };
  });

  const nested = [];
  commentList.forEach(comment => {
    if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
      // Asegurarse de no añadir un comentario como respuesta a sí mismo
      if (commentMap[comment.parent_comment_id].id !== comment.id) {
        commentMap[comment.parent_comment_id].replies.push(commentMap[comment.id]);
      }
    } else {
      nested.push(commentMap[comment.id]);
    }
  });
  return nested;
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
/**
 * Componente recursivo para renderizar un comentario y sus respuestas.
 * Maneja la lógica de edición, eliminación y respuesta para cada comentario.
 */
const Comment = ({ comment, onReply, level = 0, currentUser, onEdit, onDelete, onReport, editingComment, setEditingComment }) => {
  const isAuthor = currentUser.id === comment.user_id;
  const isEditing = editingComment && editingComment.id === comment.id;

  const handleStartEdit = () => {
    setEditingComment({ id: comment.id, text: comment.comment });
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
  };

  const handleSaveEdit = () => {
    if (editingComment.text.trim()) {
      onEdit(comment.id, editingComment.text);
    }
    setEditingComment(null);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Comentario',
      '¿Estás seguro de que quieres eliminar este comentario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(comment.id) },
      ]
    );
  };

  return (
    <View style={{ marginLeft: level > 0 ? 15 : 0, marginTop: level > 0 ? 10 : 0 }}>
      <View style={styles.commentItem}>
        <Icon name="account-circle" size={30} color="#888" />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{`${comment.user_name} ${comment.user_last_name}`}</Text>
            {isAuthor && !isEditing && (
              <Menu>
                <MenuTrigger>
                  <Icon name="dots-vertical" size={20} color="#888" />
                </MenuTrigger>
                <MenuOptions customStyles={menuOptionsStyles}>
                  <MenuOption onSelect={handleStartEdit} text='Editar' />
                  <MenuOption onSelect={handleDelete}>
                    <Text style={{ color: 'red' }}>Eliminar</Text>
                  </MenuOption>
                </MenuOptions>
              </Menu>
            )}
          </View>
          {isEditing ? (
            <TextInput
              value={editingComment.text}
              onChangeText={(text) => setEditingComment({ ...editingComment, text })}
              style={styles.editInput}
              autoFocus
              multiline
            />
          ) : (
            <Text style={styles.commentText}>{comment.comment}</Text>
          )}
          <View style={styles.commentFooter}>
            {isEditing ? (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleCancelEdit}><Text style={styles.editButtonText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit}><Text style={[styles.editButtonText, { color: '#007AFF' }]}>Guardar</Text></TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.commentDate}>{new Date(comment.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                <TouchableOpacity onPress={() => onReply(comment)}>
                  <Text style={styles.replyButtonText}>Responder</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map(reply => (
            <Comment key={reply.id} {...{ comment: reply, onReply, level: level + 1, currentUser, onEdit, onDelete, onReport, editingComment, setEditingComment }} />
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * Pantalla que muestra el detalle de un consejo, incluyendo su contenido y la sección de comentarios.
 */
const TipDetailScreen = ({ route, navigation }) => {
  const { tipId, initialTipData } = route.params;
  const { user } = useAuth();
  const [tip, setTip] = useState(initialTipData);
  const [comments, setComments] = useState([]); // Lista plana de comentarios para lógica
  const [nestedComments, setNestedComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, name }
  const [editingComment, setEditingComment] = useState(null); // { id, text }
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [reportingItem, setReportingItem] = useState(null); // { type: 'tip'/'comment', id: ... }
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportDetails, setReportDetails] = useState('');

  /**
   * Hook para configurar opciones de la cabecera de navegación, como el título y el menú de reporte.
   */
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: tip.title,
      headerBackTitle: 'Volver',
      headerRight: () => (
        <Menu>
          <MenuTrigger>
            <Icon name="dots-vertical" size={24} color="#333" style={{ marginRight: 10 }} />
          </MenuTrigger>
          <MenuOptions customStyles={menuOptionsStyles}>
            <MenuOption onSelect={() => handleReportPress(tip, 'tip')}>
              <Text style={{ color: 'red' }}>Reportar Consejo</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
      ),
    });
  }, [navigation, tip]);

  /**
   * Carga los comentarios asociados a este consejo desde la API.
   */
  const fetchComments = async () => {
    setIsCommentsLoading(true);
    try {
      const response = await fetch(`${API_URL}/consejos/${tipId}/comentarios`);
      if (!response.ok) throw new Error('No se pudieron cargar los comentarios.');
      const data = await response.json();
      setComments(data);
      setNestedComments(nestComments(data));
    } catch (error) {
      console.error(error.message);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  /**
   * Hook que se ejecuta una vez al montar el componente para cargar los comentarios iniciales.
   */
  useEffect(() => {
    fetchComments();
  }, [tipId]);

  /**
   * Envía un nuevo comentario o una respuesta a la API.
   */
  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    const body = {
      userId: user.id,
      comment: newComment,
      parentCommentId: replyingTo ? replyingTo.id : null,
    };
    try {
      const response = await fetch(`${API_URL}/consejos/${tip.id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al publicar el comentario.');
      }
      const postedComment = await response.json();
      const updatedFlatComments = [...comments, postedComment];
      setComments(updatedFlatComments);
      setNestedComments(nestComments(updatedFlatComments));
      setNewComment('');
      setReplyingTo(null);
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsPostingComment(false);
    }
  };

  /**
   * Abre el modal para que el usuario pueda reportar un consejo o comentario.
   * @param {object} item - El consejo o comentario a reportar.
   * @param {string} type - El tipo de contenido ('tip' o 'comment').
   */
  const handleReportPress = (item, type) => {
    setReportingItem({ type, item });
    setReportModalVisible(true);
  };

  /**
   * Envía el reporte del usuario a la API para que sea revisado por un administrador.
   */
  const handleReportSubmit = async () => {
    if (!reportingItem) return;

    const body = {
      reported_by_user_id: user.id,
      consejo_id: reportingItem.type === 'tip' ? reportingItem.item.id : null,
      comentario_id: reportingItem.type === 'comment' ? reportingItem.item.id : null,
      reason: reportReason,
      details: reportDetails,
    };

    try {
      const response = await fetch(`${API_URL}/reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar el reporte.');
      }

      Alert.alert('Reporte Enviado', 'Gracias por ayudarnos a mantener la comunidad segura. Revisaremos tu reporte pronto.');
      setReportModalVisible(false);
      setReportingItem(null);
      setReportDetails('');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Envía la solicitud para editar un comentario propio a la API.
   * @param {number} commentId - El ID del comentario a editar.
   * @param {string} newText - El nuevo contenido del comentario.
   */
  const handleEditComment = async (commentId, newText) => {
    try {
      const response = await fetch(`${API_URL}/consejos/comentarios/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, comment: newText }),
      });
      if (!response.ok) throw new Error('No se pudo editar el comentario.');

      // Actualizar el estado local
      const updatedFlatComments = comments.map(c =>
        c.id === commentId ? { ...c, comment: newText } : c
      );
      setComments(updatedFlatComments);
      setNestedComments(nestComments(updatedFlatComments));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Envía la solicitud para eliminar un comentario propio a la API.
   * @param {number} commentId - El ID del comentario a eliminar.
   */
  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`${API_URL}/consejos/comentarios/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) throw new Error('No se pudo eliminar el comentario.');

      // Actualizar el estado local
      const updatedFlatComments = comments.filter(c => {
        // También elimina las respuestas al comentario eliminado
        if (c.id === commentId || c.parent_comment_id === commentId) {
          return false;
        }
        return true;
      });
      setComments(updatedFlatComments);
      setNestedComments(nestComments(updatedFlatComments));

      Alert.alert('Éxito', 'Comentario eliminado.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Prepara el estado para responder a un comentario específico.
   * @param {object} comment - El comentario al que se va a responder.
   */
  const handleSetReply = (comment) => {
    setReplyingTo({ id: comment.id, name: comment.user_name });
    // Opcional: enfocar el TextInput. Necesitaríamos una ref.
  };

  /**
   * Cancela el modo de respuesta.
   */
  const cancelReply = () => {
    setReplyingTo(null);
  };

  /**
   * Maneja la acción de dar o quitar "me gusta" a un consejo.
   * Actualiza la UI localmente y luego sincroniza con la API.
   */
  const handleLikeToggle = async (tipId, hasLiked) => {
    const newLikesCount = hasLiked
      ? String(parseInt(tip.likes_count) - 1)
      : String(parseInt(tip.likes_count) + 1);
    
    setTip(currentTip => ({
      ...currentTip,
      user_has_liked: !hasLiked,
      likes_count: newLikesCount,
    }));

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
      // Revertir el estado local al estado anterior si la API falla.
      setTip(currentTip => ({
        ...currentTip,
        user_has_liked: hasLiked,
        likes_count: String(parseInt(newLikesCount) + (hasLiked ? 1 : -1)),
      }));
    }
  };

  /**
   * Renderiza un comentario de nivel superior en la FlatList.
   */
  const renderTopLevelComment = ({ item }) => {
    return <Comment
      comment={item}
      onReply={handleSetReply}
      currentUser={user}
      onEdit={handleEditComment}
      onDelete={handleDeleteComment}
      onReport={(comment) => handleReportPress(comment, 'comment')}
      editingComment={editingComment}
      setEditingComment={setEditingComment}
    />;
  };

  /**
   * Componente que se muestra como cabecera de la lista, conteniendo los detalles del consejo.
   */
  const ListHeader = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name="account-circle" size={50} color="#555" />
        <View style={styles.trainerInfo}>
          <Text style={styles.trainerName}>{`${tip.trainer_name} ${tip.trainer_last_name}`}</Text>
          <Text style={styles.cardDate}>
            {new Date(tip.created_at).toLocaleDateString('es-ES', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </Text>
        </View>
      </View>

      {tip.category_name && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{tip.category_name}</Text>
        </View>
      )}

      <Text style={styles.content}>
        {renderContentWithLinks(tip.content, styles.link)}
      </Text>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.likeButton} onPress={() => handleLikeToggle(tip.id, tip.user_has_liked)}>
          <Icon name={tip.user_has_liked ? "heart" : "heart-outline"} size={28} color={tip.user_has_liked ? "#E74C3C" : "#777"} />
          <Text style={styles.likeCount}>{tip.likes_count}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.commentsSectionHeader}>
        <Text style={styles.commentsTitle}>Comentarios</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        data={nestedComments}
        renderItem={renderTopLevelComment}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={isCommentsLoading ? <ActivityIndicator style={{ margin: 20 }} size="large" color="#007AFF" /> : null}
        ListEmptyComponent={!isCommentsLoading ? <Text style={styles.noCommentsText}>Sé el primero en comentar.</Text> : null}
        contentContainerStyle={styles.listContainer}
      />
      <View style={styles.inputSectionContainer}>
        {replyingTo && (
          <View style={styles.replyingToContainer}>
            <Text style={styles.replyingToText}>Respondiendo a {replyingTo.name}</Text>
            <TouchableOpacity onPress={cancelReply}>
              <Icon name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Escribe un comentario..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handlePostComment} disabled={isPostingComment}>
            {isPostingComment ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isReportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Reportar Contenido</Text>
            <Text style={styles.modalLabel}>Motivo del reporte:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={reportReason} onValueChange={(itemValue) => setReportReason(itemValue)}>
                <Picker.Item label="Contenido inapropiado" value="Contenido inapropiado" />
                <Picker.Item label="Spam o publicidad" value="Spam" />
                <Picker.Item label="Acoso o discurso de odio" value="Acoso" />
                <Picker.Item label="Información falsa" value="Información falsa" />
                <Picker.Item label="Otro" value="Otro" />
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Detalles (opcional):</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Proporciona más detalles aquí..."
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.saveButton, { backgroundColor: 'red' }]} onPress={handleReportSubmit}>
                <Text style={styles.buttonText}>Enviar Reporte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    backgroundColor: '#F4F7FC',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  trainerInfo: { marginLeft: 15 },
  trainerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardDate: { fontSize: 14, color: '#999' },
  categoryBadge: { backgroundColor: '#E9F5FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15, alignSelf: 'flex-start', marginBottom: 20 },
  categoryText: { color: '#007AFF', fontSize: 14, fontWeight: 'bold' },
  content: { fontSize: 17, color: '#444', lineHeight: 26, textAlign: 'justify' },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 25, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  likeButton: { flexDirection: 'row', alignItems: 'center' },
  likeCount: { marginLeft: 10, fontSize: 18, fontWeight: '600', color: '#555' },
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  commentContent: { flex: 1, marginLeft: 10 },
  commentAuthor: { fontWeight: 'bold', color: '#333' },
  commentText: { color: '#555', marginTop: 2 },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  commentDate: { fontSize: 12, color: '#aaa', marginTop: 5 },
  replyButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    marginTop: 5,
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  editButtonText: { color: '#888', fontWeight: 'bold', marginLeft: 15 },
  repliesContainer: {
    borderLeftWidth: 1, borderColor: '#e0e0e0', marginLeft: 15, paddingLeft: 0
  },
  noCommentsText: { textAlign: 'center', padding: 20, color: '#888' },
  commentInputContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#ddd', backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1, backgroundColor: '#F4F7FC', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10, backgroundColor: '#007AFF', padding: 12, borderRadius: 25,
  },
  inputSectionContainer: {
    backgroundColor: '#fff',
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#E9F5FF',
  },
  replyingToText: {
    color: '#007AFF',
    fontStyle: 'italic',
  },
  // Estilos del Modal de Reporte
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 10,
    color: '#333',
  },
  pickerContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
  },
  detailsInput: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { backgroundColor: '#007AFF' },
  cancelButton: { backgroundColor: '#6c757d' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

const menuOptionsStyles = {
  optionsContainer: {
    borderRadius: 8,
    padding: 5,
  },
};

export default TipDetailScreen;