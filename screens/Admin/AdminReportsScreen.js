import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../../apiConfig';
import { useFocusEffect } from '@react-navigation/native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

const getStatusStyle = (status) => {
  switch (status) {
    case 'pendiente':
      return { color: '#F39C12', icon: 'clock-alert-outline' };
    case 'revisado':
      return { color: '#2ECC71', icon: 'check-circle-outline' };
    case 'descartado':
      return { color: '#95A5A6', icon: 'close-circle-outline' };
    default:
      return { color: '#34495E', icon: 'help-circle-outline' };
  }
};

const AdminReportsScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/reportes`);
      if (!response.ok) throw new Error('Error al obtener los reportes.');
      const data = await response.json();
      setReports(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los reportes.');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports])
  );

  const updateReportStatus = async (reportId, status) => {
    try {
      const response = await fetch(`${API_URL}/admin/reportes/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('No se pudo actualizar el estado.');
      
      // Actualizar localmente para no recargar toda la lista
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      Alert.alert('Éxito', `El reporte ha sido marcado como "${status}".`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const reportedContent = item.consejo_title || item.comentario_text;

    return (
      <View style={styles.card}>
        {/* Encabezado con estado y menú de acciones */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.color }]}>
            <Icon name={statusStyle.icon} size={16} color="#fff" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Menu>
            <MenuTrigger customStyles={{ triggerWrapper: { padding: 5 } }}>
              <Icon name="dots-vertical" size={24} color="#555" />
            </MenuTrigger>
            <MenuOptions customStyles={{ optionsContainer: { borderRadius: 8, marginTop: 30 } }}>
              <MenuOption onSelect={() => updateReportStatus(item.id, 'revisado')} text='Marcar como Revisado' />
              <MenuOption onSelect={() => updateReportStatus(item.id, 'descartado')} text='Marcar como Descartado' />
              <MenuOption onSelect={() => updateReportStatus(item.id, 'pendiente')} text='Marcar como Pendiente' />
            </MenuOptions>
          </Menu>
        </View>

        {/* Cuerpo de la tarjeta */}
        <View style={styles.cardBody}>
          <Text style={styles.reasonText}>Motivo: {item.reason}</Text>
          {reportedContent && (
            <View style={styles.reportedContentBox}>
              <Text style={styles.reportedContentText} numberOfLines={3}>"{reportedContent}"</Text>
            </View>
          )}
          {item.details && <Text style={styles.detailsText}>Detalles: {item.details}</Text>}
        </View>

        {/* Pie de la tarjeta */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            Reportado por: {item.reporter_name} {item.reporter_last_name}
          </Text>
          <Text style={styles.footerText}>
            {new Date(item.created_at).toLocaleDateString('es-ES')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#E74C3C" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Reportes</Text>
      </View>
      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay reportes pendientes.</Text>}
        contentContainerStyle={{ padding: 15 }}
        onRefresh={() => fetchReports(true)}
        refreshing={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  header: {
    paddingTop: Platform.OS === 'android' ? 25 : 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  statusText: {
    marginLeft: 6,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  cardBody: { paddingBottom: 10 },
  reasonText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  reportedContentBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  reportedContentText: { fontSize: 14, color: '#495057', fontStyle: 'italic', lineHeight: 20 },
  detailsText: { fontSize: 14, color: '#555', marginTop: 10, fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 5,
  },
  footerText: { fontSize: 12, color: '#777' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#777' },
});

export default AdminReportsScreen;