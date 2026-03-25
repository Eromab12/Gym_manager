import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
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

const TrainerIMCScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bmi, setBmi] = useState(null);
  const [bmiStatus, setBmiStatus] = useState('');
  const [statusColor, setStatusColor] = useState('#ccc');

  const isClient = user?.type === 'Cliente';

  const calculateBmi = () => {
    Keyboard.dismiss(); // Ocultar el teclado al calcular
    const w = parseFloat(weight);
    const h = parseFloat(height);

    if (!w || !h || w <= 0 || h <= 0) {
      Alert.alert('Datos inválidos', 'Por favor, introduce un peso y altura válidos.');
      setBmi(null);
      setBmiStatus('');
      return;
    }

    const heightInMeters = h / 100;
    const calculatedBmi = w / (heightInMeters * heightInMeters);
    setBmi(calculatedBmi.toFixed(1));

    if (calculatedBmi < 18.5) {
      setBmiStatus('Bajo peso');
      setStatusColor('#3498DB'); // Azul
    } else if (calculatedBmi >= 18.5 && calculatedBmi <= 24.9) {
      setBmiStatus('Peso saludable');
      setStatusColor('#2ECC71'); // Verde
    } else if (calculatedBmi >= 25) {
      setBmiStatus('Sobrepeso');
      setStatusColor('#E74C3C'); // Rojo
    }
  };

  const resetCalculator = () => {
    setWeight('');
    setHeight('');
    setBmi(null);
    setBmiStatus('');
  };

  const daysLeft = getDaysLeft(user?.registration_date);
  if (isClient && daysLeft <= 0) {
    return <MembershipBlockerScreen navigation={navigation} isNewUser={!user?.registration_date} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Calculadora de IMC</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos del Cliente</Text>

        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 70"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Altura (cm)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 175"
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.calcButton, styles.resetButton]} onPress={resetCalculator}>
            <Icon name="refresh" size={20} color="#007AFF" />
            <Text style={[styles.calcButtonText, { color: '#007AFF', marginLeft: 5 }]}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.calcButton} onPress={calculateBmi}>
            <Icon name="calculator-variant" size={20} color="#fff" />
            <Text style={styles.calcButtonText}>Calcular</Text>
          </TouchableOpacity>
        </View>
      </View>

      {bmi !== null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resultado</Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FC' },
  contentContainer: { padding: 15 },
  header: { alignItems: 'center', paddingTop: Platform.OS === 'android' ? 25 : 10, paddingBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, color: '#555', marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#F4F7FC', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginBottom: 15 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  calcButton: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  resetButton: { backgroundColor: '#E9F5FF', marginRight: 10 },
  calcButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  resultContainer: { alignItems: 'center', marginBottom: 20 },
  bmiValue: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  bmiStatus: { fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  scaleContainer: { width: '100%', alignItems: 'center' },
  scaleTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#555' },
  scaleBar: { flexDirection: 'row', height: 40, width: '95%', borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  scaleSegment: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#fff' },
  activeSegment: { borderWidth: 3, borderColor: '#000', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  segmentText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  legendContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginTop: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendColorBox: { width: 15, height: 15, marginRight: 5, borderRadius: 3 },
  legendText: { fontSize: 12, color: '#555' },
});

export default TrainerIMCScreen;