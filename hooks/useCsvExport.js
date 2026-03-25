import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Hook reutilizable para exportar datos a un archivo CSV.
 * @returns {{ exportToCsv: (fileName: string, headers: object, data: object[]) => Promise<void> }}
 */
const useCsvExport = () => {
  /**
   * Genera y comparte un archivo CSV.
   * @param {string} fileName - El nombre del archivo (e.g., 'reporte.csv').
   * @param {object} headers - Un objeto que mapea las claves de los datos a los nombres de las columnas. e.g., { idCard: 'Cédula', name: 'Nombre' }.
   * @param {object[]} data - Un array de objetos con los datos a exportar.
   */
  const exportToCsv = async (fileName, headers, data) => {
    if (!data || data.length === 0 || !headers || Object.keys(headers).length === 0) {
      Alert.alert('Datos insuficientes', 'No hay información o encabezados para exportar.');
      return;
    }

    const headerKeys = Object.keys(headers);
    const headerValues = Object.values(headers);

    const csvHeader = headerValues.join(',') + '\n';

    const csvRows = data.map(row =>
      headerKeys.map(key => {
        const value = row[key];
        // Envuelve el valor en comillas y escapa las comillas dobles existentes para evitar errores en el CSV.
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');

    const csvString = csvHeader + csvRows;
    const fileUri = FileSystem.cacheDirectory + fileName;

    try {
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Exportar ${fileName}`,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el archivo.');
      console.error(`Error al exportar ${fileName}:`, error);
    }
  };

  return { exportToCsv };
};

export default useCsvExport;