import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Button, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../apiConfig';
import { LineChart, PieChart } from 'react-native-chart-kit';

const StatCard = ({ icon, count, label, color, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <Icon name={icon} size={40} color={color} />
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const AdminProfileScreen = ({ user, onLogout, navigation }) => {
  const [stats, setStats] = useState(null);
  const [growthData, setGrowthData] = useState(null);
  const [membershipData, setMembershipData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResponse, growthResponse, membershipResponse] = await Promise.all([
        fetch(`${API_URL}/admin/stats`),
        fetch(`${API_URL}/admin/stats/growth`),
        fetch(`${API_URL}/admin/stats/memberships`)
      ]);

      if (!statsResponse.ok) throw new Error('No se pudieron cargar las estadísticas.');
      if (!growthResponse.ok) throw new Error('No se pudieron cargar los datos de crecimiento.');
      if (!membershipResponse.ok) throw new Error('No se pudieron cargar los datos de membresías.');
      
      const statsData = await statsResponse.json();
      const rawGrowthData = await growthResponse.json();

      // Rehidratar las funciones de color que se pierden en la serialización JSON
      if (rawGrowthData.datasets) {
        rawGrowthData.datasets[0].color = (opacity = 1) => `rgba(52, 152, 219, ${opacity})`; // Azul para Clientes
        if (rawGrowthData.datasets[1]) {
          rawGrowthData.datasets[1].color = (opacity = 1) => `rgba(231, 76, 60, ${opacity})`; // Rojo para Entrenadores
        }
      }

      setStats(statsData);
      setGrowthData(rawGrowthData);
      setMembershipData(await membershipResponse.json());
    } catch (error) {
      console.error(error.message);
      setStats(null);
      setGrowthData(null);
      setMembershipData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchData(); }, [fetchData])
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Administrador</Text>
        <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Icon name="account-supervisor-circle" size={100} color="#E74C3C" />
        <Text style={styles.welcomeText}>Bienvenido, {user.name}</Text>
        <Text style={styles.infoText}>Resumen general de la aplicación.</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#E74C3C" style={{ marginTop: 20 }} />
        ) : stats ? (
          <View style={styles.statsContainer}>
            <StatCard icon="account-group" count={stats.totalClients} label="Clientes" color="#3498DB" onPress={() => navigation.navigate('Clientes')} />
            <StatCard icon="account-tie" count={stats.totalTrainers} label="Entrenadores" color="#2ECC71" onPress={() => navigation.navigate('Entrenadores')} />
            <StatCard icon="lightbulb-on" count={stats.totalTips} label="Consejos" color="#F1C40F" onPress={() => navigation.navigate('Consejos')} />
            <StatCard icon="alert-octagon" count={stats.pendingReports} label="Reportes Pend." color="#E74C3C" onPress={() => navigation.navigate('Reportes')} />
          </View>
        ) : (
          <Text style={styles.infoText}>No se pudieron cargar las estadísticas.</Text>
        )}

        {growthData && growthData.labels.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Crecimiento de Usuarios (Último Año)</Text>
            <LineChart
              data={growthData}
              width={Dimensions.get('window').width - 40} // from react-native
              height={220}
              withInnerLines={false}
              withOuterLines={false}
              yAxisLabel=""
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`, // Color base para la cuadrícula y etiquetas
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2' },
              }}
              style={{ marginVertical: 8, borderRadius: 16, ...styles.chartStyle }}
              withShadow={false} // Desactiva la sombra general para usar los colores de cada línea
            />
          </View>
        )}

        {membershipData && membershipData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Estado de Membresías</Text>
            <PieChart
              data={membershipData}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor={"count"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              style={styles.chartStyle}
            />
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button title="Cerrar Sesión" onPress={onLogout} color="#E74C3C" />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centra el contenido del header
    paddingTop: Platform.OS === 'android' ? 25 : 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative', // Para posicionar el botón de refrescar
  },
  refreshButton: {
    padding: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333', flex: 1, textAlign: 'center'
  },
  content: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 5,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  statCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '80%',
    marginTop: 30,
  },
  chartContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 10,
  },
  chartStyle: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    backgroundColor: '#fff',
  },
});

export default AdminProfileScreen;