import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../AuthContext';
import MembershipBlockerScreen from '../../components/MembershipBlockerScreen';

const activityFactors = [
  { label: 'Sedentario (poco o nada de ejercicio)', value: 1.2 },
  { label: 'Ligero (1-3 días/semana)', value: 1.375 },
  { label: 'Moderado (3-5 días/semana)', value: 1.55 },
  { label: 'Intenso (6-7 días/semana)', value: 1.725 },
  { label: 'Muy intenso (trabajo físico + entreno)', value: 1.9 },
];

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

const ResultCard = ({ title, value, unit, color = '#333' }) => (
  <View style={styles.resultCard}>
    <Text style={styles.resultCardTitle}>{title}</Text>
    <Text style={[styles.resultCardValue, { color }]}>{value} <Text style={styles.resultCardUnit}>{unit}</Text></Text>
  </View>
);

const CalorieCalculatorScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [gender, setGender] = useState('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activityLevel, setActivityLevel] = useState(activityFactors[0].value);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (user && user.type === 'Cliente') {
      setWeight(String(user.weight || ''));
      setHeight(String(user.height || ''));
      setAge(String(user.age || ''));
    }
  }, [user]);

  const handleCalculate = () => {
    Keyboard.dismiss();
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);

    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) {
      Alert.alert('Datos inválidos', 'Por favor, introduce peso, altura y edad válidos.');
      setResults(null);
      return;
    }

    let bmr;
    if (gender === 'male') {
      bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }

    const tdee = bmr * activityLevel;

    setResults({
      bmr: Math.round(bmr),
      maintenance: Math.round(tdee),
      mildLoss: Math.round(tdee - 250),
      weightLoss: Math.round(tdee - 500),
      extremeLoss: Math.round(tdee - 1000),
      mildGain: Math.round(tdee + 250),
      weightGain: Math.round(tdee + 500),
      extremeGain: Math.round(tdee + 1000),
    });
  };

  const resetForm = () => {
    setResults(null);
    if (user?.type !== 'Cliente') {
        setWeight('');
        setHeight('');
        setAge('');
    }
  };

  const daysLeft = getDaysLeft(user?.registration_date);
  if (daysLeft <= 0) {
    return <MembershipBlockerScreen navigation={navigation} isNewUser={!user?.registration_date} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Calculadora de Calorías</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tus Datos</Text>

        <Text style={styles.label}>Género</Text>
        <View style={styles.genderSelector}>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
            onPress={() => setGender('male')}
          >
            <Icon name="gender-male" size={24} color={gender === 'male' ? '#fff' : '#007AFF'} />
            <Text style={[styles.genderButtonText, gender === 'male' && { color: '#fff' }]}>Hombre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
            onPress={() => setGender('female')}
          >
            <Icon name="gender-female" size={24} color={gender === 'female' ? '#fff' : '#E91E63'} />
            <Text style={[styles.genderButtonText, gender === 'female' && { color: '#fff' }]}>Mujer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="Ej: 70" />

        <Text style={styles.label}>Altura (cm)</Text>
        <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="Ej: 175" />

        <Text style={styles.label}>Edad</Text>
        <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="Ej: 25" />

        <Text style={styles.label}>Nivel de Actividad Física</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={activityLevel} onValueChange={(itemValue) => setActivityLevel(itemValue)}>
            {activityFactors.map(factor => (
              <Picker.Item key={factor.value} label={factor.label} value={factor.value} />
            ))}
          </Picker>
        </View>

        <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.calcButton, styles.resetButton]} onPress={resetForm}>
                <Icon name="refresh" size={20} color="#007AFF" />
                <Text style={[styles.calcButtonText, { color: '#007AFF', marginLeft: 5 }]}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={handleCalculate}>
                <Icon name="calculator-variant" size={20} color="#fff" />
                <Text style={styles.calcButtonText}>Calcular</Text>
            </TouchableOpacity>
        </View>
      </View>

      {results && (
        <View style={[styles.card, styles.resultsContainer]}>
          <Text style={styles.cardTitle}>Resultados</Text>
          <ResultCard title="Metabolismo Basal (TMB)" value={results.bmr} unit="kcal/día" />
          <ResultCard title="Mantenimiento de Peso" value={results.maintenance} unit="kcal/día" color="#2ECC71" />

          <Text style={styles.subTitle}>Objetivo: Perder Peso</Text>
          <View style={styles.goalRow}>
            <ResultCard title="Perder 0.5 kg/sem" value={results.weightLoss} unit="kcal/día" color="#F39C12" />
            <ResultCard title="Perder 1 kg/sem" value={results.extremeLoss} unit="kcal/día" color="#E74C3C" />
          </View>

          <Text style={styles.subTitle}>Objetivo: Ganar Peso</Text>
          <View style={styles.goalRow}>
            <ResultCard title="Ganar 0.5 kg/sem" value={results.weightGain} unit="kcal/día" color="#3498DB" />
            <ResultCard title="Ganar 1 kg/sem" value={results.extremeGain} unit="kcal/día" color="#9B59B6" />
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  contentContainer: {
    padding: 15,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 25 : 10,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F4F7FC',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  genderSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  genderButtonSelected: {
    backgroundColor: '#007AFF',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#007AFF',
  },
  'genderButton:nth-child(2)': {
    marginLeft: 10,
    borderColor: '#E91E63',
  },
  'genderButton:nth-child(2) > genderButtonText': {
    color: '#E91E63',
  },
  'genderButton:nth-child(2).genderButtonSelected': {
    backgroundColor: '#E91E63',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F4F7FC',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  calcButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  resetButton: {
    backgroundColor: '#E9F5FF',
    marginRight: 10,
  },
  calcButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsContainer: {
    marginTop: 0,
  },
  resultCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderColor: '#E0E0E0',
  },
  resultCardTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resultCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  resultCardUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  'goalRow > resultCard': {
    flex: 1,
  },
  'goalRow > resultCard:first-child': {
    marginRight: 10,
  },
});

export default CalorieCalculatorScreen;
