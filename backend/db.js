const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a la base de datos de Render.
// La variable DATABASE_URL la gestiona Render automáticamente.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requerido para conexiones a Render
  }
});

// Exportamos la instancia de la pool directamente.
// Esto asegura que el objeto exportado tenga los métodos .query() y .connect()
module.exports = pool;
