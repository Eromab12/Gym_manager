import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../AuthContext';
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

const IMCScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [bmi, setBmi] = useState(null);
  const [bmiStatus, setBmiStatus] = useState('');
  const [statusColor, setStatusColor] = useState('#ccc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculate = () => {
      if (user && user.weight && user.height) {
        setIsLoading(true);
        const timer = setTimeout(() => {
          const heightInMeters = user.height / 100;
          if (heightInMeters > 0) {
            const calculatedBmi = user.weight / (heightInMeters ** 2);
            setBmi(calculatedBmi.toFixed(1));

            if (calculatedBmi < 18.5) {
              setBmiStatus('Bajo peso');
              setStatusColor('#3498DB');
            } else if (calculatedBmi >= 18.5 && calculatedBmi <= 24.9) {
              setBmiStatus('Peso saludable');
              setStatusColor('#2ECC71');
            } else if (calculatedBmi >= 25) {
              setBmiStatus('Sobrepeso');
              setStatusColor('#E74C3C');
            }
          } else {
            setBmi(null);
            setBmiStatus('Datos de altura inválidos');
            setStatusColor('#000');
          }
          setIsLoading(false);
        }, 1500); // Reducido el tiempo para una mejor UX

        return () => clearTimeout(timer); // Limpieza del efecto
      } else {
        setBmi(null);
        setBmiStatus('Datos insuficientes para calcular IMC');
        setStatusColor('#000');
        setIsLoading(false);
      }
    };

    calculate();
  }, [user]); // El efecto se ejecuta solo cuando el usuario cambia.

  const daysLeft = getDaysLeft(user?.registration_date);
  if (daysLeft <= 0) {
    return <MembershipBlockerScreen navigation={navigation} isNewUser={!user?.registration_date} />;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Calculando IMC ⌛</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Índice de Masa Corporal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tus Datos</Text>
        {user && (
          <View style={styles.dataGrid}>
            <View style={styles.dataItem}>
              <Icon name="human-male-height" size={24} color="#555" />
              <Text style={styles.dataValue}>{user.height || 'N/A'} cm</Text>
              <Text style={styles.dataLabel}>Altura</Text>
            </View>
            <View style={styles.dataItem}>
              <Icon name="weight-kilogram" size={24} color="#555" />
              <Text style={styles.dataValue}>{user.weight || 'N/A'} kg</Text>
              <Text style={styles.dataLabel}>Peso</Text>
            </View>
          </View>
        )}
      </View>

      {bmi !== null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu Resultado</Text>
          <View style={styles.resultContainer}>
            <Text style={styles.bmiValue}>{bmi}</Text>
            <Text style={[styles.bmiStatus, { color: statusColor }]}>
              {bmiStatus}
            </Text>
          </View>

          <View style={styles.scaleContainer}>
            <Text style={styles.scaleTitle}>Escala de IMC</Text>
            <View style={styles.scaleBar}>
              <View style={[styles.scaleSegment, { backgroundColor: '#3498DB' }, bmiStatus === 'Bajo peso' && styles.activeSegment]}>
                <Text style={styles.segmentText}>{'< 18.5'}</Text>
              </View>
              <View style={[styles.scaleSegment, { backgroundColor: '#2ECC71' }, bmiStatus === 'Peso saludable' && styles.activeSegment]}>
                <Text style={styles.segmentText}>18.5-24.9</Text>
              </View>
              <View style={[styles.scaleSegment, { backgroundColor: '#E74C3C' }, bmiStatus === 'Sobrepeso' && styles.activeSegment]}>
                <Text style={styles.segmentText}>{'>= 25'}</Text>
              </View>
            </View>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: '#3498DB' }]} /><Text style={styles.legendText}>Bajo peso</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: '#2ECC71' }]} /><Text style={styles.legendText}>Saludable</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: '#E74C3C' }]} /><Text style={styles.legendText}>Sobrepeso</Text></View>
            </View>
          </View>
        </View>
      )}

      {bmi === null && !isLoading && (
        <View style={styles.card}>
          <Text style={styles.bmiStatus}>{bmiStatus}</Text>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Perfil')}>
            <Text style={styles.profileButtonText}>Actualizar mis datos</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  contentContainer: { padding: 15, flexGrow: 1 },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
    header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 25 : 10,
    paddingBottom: 15,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    color: '#007AFF',
  },
  title: {
    fontSize: 24, fontWeight: 'bold', color: '#333'
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginBottom: 20, textAlign: 'center' },
  dataGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  dataItem: { alignItems: 'center' },
  dataValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 5 },
  dataLabel: { fontSize: 14, color: '#777', marginTop: 3 },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  bmiStatus: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
  scaleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  scaleTitle: {
    fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#555'
  },
  scaleBar: {
    flexDirection: 'row',
    height: 40,
    width: '95%',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#ddd'
  },
  scaleSegment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1, borderRightColor: '#fff'
  },
  activeSegment: {
    borderWidth: 3, borderColor: '#000', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3
  },
  segmentText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '95%',
    marginTop: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: 15,
    height: 15,
    marginRight: 5,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#555',
  },
  profileButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignSelf: 'center',
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default IMCScreen;
