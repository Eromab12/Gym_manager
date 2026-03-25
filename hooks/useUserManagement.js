import { useState } from 'react';
import { Alert } from 'react-native';
import { API_URL } from '../apiConfig';

/**
 * Custom Hook para gestionar la creación y actualización de usuarios (clientes o entrenadores).
 * Encapsula la lógica de validación, la llamada a la API y el manejo de estados.
 *
 * @param {object} config - Objeto de configuración.
 * @param {string} config.userType - El tipo de usuario a gestionar ('Cliente' o 'Entrenador').
 * @param {function} config.onSaveSuccess - Callback que se ejecuta tras guardar exitosamente. Recibe el usuario guardado.
 * @param {function} config.onDeleteSuccess - Callback que se ejecuta tras eliminar exitosamente. Recibe el ID del usuario eliminado.
 * @param {function} config.onCloseModal - Callback para cerrar el modal del formulario.
 * @returns {object} - Un objeto con las funciones y estados de gestión.
 */
const useUserManagement = ({ userType, onSaveSuccess, onCloseModal, onDeleteSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Guarda un usuario (lo crea o actualiza).
   * @param {object} formData - Los datos del formulario.
   * @param {object|null} editingUser - El objeto de usuario si se está editando, o null si se está creando.
   */
  const saveUser = async (formData, editingUser) => {
    setIsSaving(true);

    // --- Validaciones ---

    // 1. Validaciones para usuarios NUEVOS
    if (!editingUser) {
      if (!formData.name || !formData.lastName || !formData.idCard) {
        Alert.alert('Error', `Nombre, Apellido y Cédula son requeridos para nuevos ${userType.toLowerCase()}s.`);
        setIsSaving(false);
        return;
      }
      if (!formData.password) {
        Alert.alert('Error', `La contraseña es requerida para nuevos ${userType.toLowerCase()}s.`);
        setIsSaving(false);
        return;
      }
      // Validación robusta de Cédula para nuevos usuarios
      const idCard = formData.idCard.trim();
      if (idCard.length < 7 || idCard.length > 10 || !/^\d+$/.test(idCard)) {
        Alert.alert('Error de Validación', 'La cédula debe tener entre 7 y 10 dígitos numéricos.');
        setIsSaving(false);
        return;
      }
    }

    // 2. Validaciones para TODOS los usuarios (nuevos y en edición, si los campos tienen valor)
    if (formData.age) {
      const age = parseInt(formData.age, 10);
      if (isNaN(age) || age < 14 || age > 99) {
        Alert.alert('Error de Validación', 'La edad debe ser un número válido entre 14 y 99 años.');
        setIsSaving(false);
        return;
      }
    }
    if (formData.weight && (isNaN(parseFloat(formData.weight)) || parseFloat(formData.weight) <= 0)) {
      Alert.alert('Error de Validación', 'El peso debe ser un número positivo.');
      setIsSaving(false);
      return;
    }
    if (formData.height && (isNaN(parseFloat(formData.height)) || parseFloat(formData.height) <= 0)) {
      Alert.alert('Error de Validación', 'La altura debe ser un número positivo.');
      setIsSaving(false);
      return;
    }
    
    // 2. Preparación de la petición
    const url = editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/register`;
    const method = editingUser ? 'PUT' : 'POST';

    const body = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      type: userType,
    };

    // No enviar la contraseña si no se está cambiando
    if (editingUser && !formData.password) {
      delete body.password;
    }

    // 3. Ejecución de la llamada a la API
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const savedUser = await response.json();
      if (!response.ok) throw new Error(savedUser.message || 'Error al guardar.');

      Alert.alert('Éxito', `${userType} ${editingUser ? 'actualizado' : 'agregado'} correctamente.`);
      onSaveSuccess(savedUser, !!editingUser); // Llama al callback de éxito

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSaving(false);
      onCloseModal(); // Cierra el modal independientemente del resultado
    }
  };

  /**
   * Elimina un usuario tras una confirmación.
   * @param {object} userToDelete - El objeto de usuario a eliminar.
   */
  const deleteUser = (userToDelete) => {
    Alert.alert(
      `Confirmar Eliminación`,
      `¿Estás seguro de que quieres eliminar a ${userToDelete.name} ${userToDelete.lastName || userToDelete.last_name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(`${API_URL}/users/${userToDelete.id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `No se pudo eliminar el ${userType.toLowerCase()}.` }));
                throw new Error(errorData.message);
              }

              Alert.alert('Éxito', `${userType} eliminado correctamente.`);
              if (onDeleteSuccess) onDeleteSuccess(userToDelete.id);

            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return { saveUser, isSaving, deleteUser, isDeleting };
};

export default useUserManagement;