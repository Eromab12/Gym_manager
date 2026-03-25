const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');

const authRoutes = require('./routes/auth.routes');
const app = express();
// El puerto será asignado por el entorno de producción (ej. Render),
// o usará 5000 si estás en desarrollo local.
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Rutas
app.use('/api/auth', authRoutes); // ✅ Prefijo correcto para todas las rutas

// Rutas u otros middlewares...
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

const createAdminUserIfNeeded = async () => {
  try {
    const { rows } = await db.query("SELECT COUNT(*) FROM usuarios WHERE type = 'Admin'");
    if (parseInt(rows[0].count) === 0) {
      console.log('No se encontró un usuario Administrador. Creando uno...');
      const adminPassword = '12345678'; // La contraseña
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(adminPassword, salt);
      
      const adminData = {
        name: 'admin',
        lastName: 'superuser',
        idCard: 'admin001',
        type: 'Admin',
        password_hash: password_hash,
      };

      await db.query(
        'INSERT INTO usuarios(name, last_name, id_card, type, password_hash, registration_date) VALUES($1, $2, $3, $4, $5, NOW())',
        [adminData.name, adminData.lastName, adminData.idCard, adminData.type, adminData.password_hash]
      );
      console.log(` Usuario Administrador creado con éxito.`);
      console.log(`   Usuario: ${adminData.name}`);
      console.log(`   Contraseña: ${adminPassword}`);
    }
  } catch (error) {
    console.error('❌ Error al verificar/crear el usuario Administrador:', error);
  }
};

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await createAdminUserIfNeeded(); // Llama a la función al iniciar
});