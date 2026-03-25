import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Platform,
  Button,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';

const FormModal = ({
  visible,
  onClose,
  title,
  children,
  onSave,
  isSaving = false,
  saveButtonText = 'Guardar',
  cancelButtonText = 'Cancelar',
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalView}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{title}</Text>
            {children}
            <View style={styles.modalButtons}>
              <Button title={cancelButtonText} onPress={onClose} color="#aaa" disabled={isSaving} />
              <Button title={isSaving ? 'Guardando...' : saveButtonText} onPress={onSave} color="#E74C3C" disabled={isSaving} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 30,
    marginBottom: 10,
  },
});

export default FormModal;