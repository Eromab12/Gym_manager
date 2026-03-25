const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
require('dotenv').config(); // Cargar variables de entorno

const router = express.Router();


// --- Gestión de Usuarios ---

// Registrar un nuevo usuario (Cliente o Entrenador)
router.post('/register', async (req, res) => {
  const { name, lastName, idCard, age, weight, height, type, password } = req.body;

  if (!name || !lastName || !idCard || !password || !type) {
    return res.status(400).json({ message: 'Faltan campos requeridos.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Cualquier usuario de tipo 'Cliente' se crea con fecha de registro nula para activación manual.
    // Otros tipos de usuario (ej. 'Entrenador') se crean activos inmediatamente.
    const registrationDateSQL = type === 'Cliente' ? 'NULL' : 'NOW()';

    const text = `
      INSERT INTO usuarios(name, last_name, id_card, age, weight, height, type, password_hash, registration_date) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, ${registrationDateSQL}) RETURNING *
    `;
    // Se asegura que los valores opcionales sean nulos si no se proveen.
    const values = [name, lastName, idCard, age, weight, height, type, password_hash];

    const { rows } = await db.query(text, values);
    const newUser = rows[0];
    delete newUser.password_hash; // No devolver el hash

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') { // Error de constraint unique
      return res.status(400).json({ message: 'La cédula ya está registrada.' });
    }
    res.status(500).json({ message: 'Error en el servidor al registrar.' });
  }
});

// Iniciar Sesión
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  console.log(`\n[LOGIN ATTEMPT] Identifier: "${identifier}"`);

  try {
    // Búsqueda mejorada: Primero por cédula (única), luego por nombre.
    // FIX: Se convierte id_card a texto para poder usar TRIM y evitar errores de tipo.
    const cedulaQuery = 'SELECT * FROM usuarios WHERE TRIM(id_card::text) = TRIM($1)';
    let { rows } = await db.query(cedulaQuery, [identifier]);

    // Si no se encuentra por cédula, se busca por nombre.
    if (rows.length === 0) {
      console.log(`> Identifier not found as id_card. Searching by name...`);
      ({ rows } = await db.query('SELECT * FROM usuarios WHERE LOWER(name) = LOWER($1)', [identifier]));
    }

    if (rows.length === 0) {
      console.log(`> FAILURE: User with identifier "${identifier}" not found in database.`);
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Si se encuentra más de un usuario por nombre, se solicita usar la cédula para evitar ambigüedad.
    if (rows.length > 1) {
      console.log(`> FAILURE: Multiple users found for name "${identifier}".`);
      return res.status(400).json({ message: 'Existen múltiples usuarios con ese nombre. Por favor, inicie sesión con su número de cédula.' });
    }

    const user = rows[0];
    console.log(`> User found: ${user.name} ${user.last_name} (ID: ${user.id}). Comparing passwords...`);
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      console.log(`> FAILURE: Password mismatch for user ID: ${user.id}`);
      return res.status(400).json({ message: 'Contraseña incorrecta.' });
    }

    console.log(`> SUCCESS: Login successful for user ID: ${user.id}`);
    delete user.password_hash;
    res.json({ message: 'Login exitoso', user });
  } catch (error) {
    console.error('[LOGIN ERROR] An error occurred during the login process:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Obtener todos los usuarios
router.get('/users', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, id_card, name, last_name, age, weight, height, type, registration_date FROM usuarios ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios.' });
  }
});

// Actualizar un usuario
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    // Se cambia el nombre de la variable para evitar conflictos con la propiedad 'password'
    const { name, last_name, age, weight, height, password: newPassword } = req.body;

    const updates = { name, last_name, age, weight, height };

    try {
        // Construir la consulta SQL dinámicamente
        // Se asegura de que solo los campos con valores válidos se incluyan en la actualización.
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && value !== null) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            fields.push(`password_hash = $${paramIndex}`);
            values.push(await bcrypt.hash(newPassword, salt));
            paramIndex++;
        }

        // Si no hay campos para actualizar, no se ejecuta la consulta.
        if (fields.length === 0) {
            const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
            const user = rows[0];
            delete user.password_hash;
            return res.json(user);
        }

        const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const { rows } = await db.query(query, values);
        if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const updatedUser = rows[0];
        delete updatedUser.password_hash;
        res.json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el usuario.' });
    }
});

// Eliminar un usuario
router.delete('/users/:id', async (req, res) => { // Cambiado de :idCard a :id
    const { id } = req.params; // Obtener id de los parámetros
    try {
        const result = await db.query('DELETE FROM usuarios WHERE id = $1', [id]); // Usar id para la cláusula WHERE
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el usuario.' });
    }
});

// [ADMIN] Activar la membresía de un nuevo cliente
router.post('/users/:id/activate', async (req, res) => {
    const { id } = req.params;
    try {
        // Establece la fecha de registro a la actual, iniciando la membresía.
        const query = 'UPDATE usuarios SET registration_date = NOW() WHERE id = $1 AND type = \'Cliente\' RETURNING *';
        const { rows } = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado o ya está activo.' });
        }
        const activatedUser = rows[0];
        delete activatedUser.password_hash;
        res.json(activatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error al activar el cliente.' });
    }
});
// --- Gestión de Rutinas y Ejercicios ---

// Crear una nueva rutina (y sus ejercicios)
router.post('/routines', async (req, res) => {
    const { name, description, created_by_trainer_id, exercises } = req.body;
    const client = await db.connect();
    try {
        // Iniciar transacción
        await client.query('BEGIN');

        const routineQuery = 'INSERT INTO rutinas(name, description, created_by_trainer_id) VALUES($1, $2, $3) RETURNING id';
        const routineResult = await client.query(routineQuery, [name, description, created_by_trainer_id]);
        const newRoutineId = routineResult.rows[0].id;

        if (exercises && exercises.length > 0) {
            for (const exercise of exercises) {
                const exerciseQuery = 'INSERT INTO ejercicios(routine_id, name, sets, reps) VALUES($1, $2, $3, $4)';
                await client.query(exerciseQuery, [newRoutineId, exercise.name, exercise.sets, exercise.reps]);
            }
        }

        // Finalizar transacción
        await client.query('COMMIT');
        res.status(201).json({ id: newRoutineId, name, description, exercises });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Error al crear la rutina.' });
    } finally {
        client.release();
    }
});

// Obtener todas las rutinas de un entrenador
router.get('/routines/trainer/:trainerId', async (req, res) => {
    const { trainerId } = req.params;
    try {
        const routinesQuery = 'SELECT * FROM rutinas WHERE created_by_trainer_id = $1';
        const routinesResult = await db.query(routinesQuery, [trainerId]);
        const routines = routinesResult.rows;

        for (let routine of routines) {
            const exercisesQuery = 'SELECT * FROM ejercicios WHERE routine_id = $1';
            const exercisesResult = await db.query(exercisesQuery, [routine.id]);
            routine.exercises = exercisesResult.rows;
        }

        res.json(routines);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener las rutinas.' });
    }
});

// Actualizar una rutina
router.put('/routines/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, exercises } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Actualizar los detalles de la rutina
        const routineUpdateQuery = 'UPDATE rutinas SET name = $1, description = $2 WHERE id = $3 RETURNING *';
        const routineResult = await client.query(routineUpdateQuery, [name, description, id]);

        if (routineResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Rutina no encontrada.' });
        }

        // 2. Eliminar los ejercicios antiguos asociados a la rutina
        await client.query('DELETE FROM ejercicios WHERE routine_id = $1', [id]);

        // 3. Insertar los nuevos ejercicios (si los hay)
        if (exercises && exercises.length > 0) {
            for (const exercise of exercises) {
                const exerciseQuery = 'INSERT INTO ejercicios(routine_id, name, sets, reps) VALUES($1, $2, $3, $4)';
                await client.query(exerciseQuery, [id, exercise.name, exercise.sets, exercise.reps]);
            }
        }

        await client.query('COMMIT');
        const updatedRoutine = routineResult.rows[0];
        updatedRoutine.exercises = exercises || [];
        res.json(updatedRoutine);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar la rutina:', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar la rutina.' });
    } finally {
        client.release();
    }
});

// Eliminar una rutina
router.delete('/routines/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM rutinas WHERE id = $1', [id]);
        if (result.rowCount === 0) { return res.status(404).json({ message: 'Rutina no encontrada.' }); }
        res.status(200).json({ message: 'Rutina eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la rutina:', error);
        res.status(500).json({ message: 'Error al eliminar la rutina.' });
    }
});

// Asignar una rutina a un cliente
router.post('/users/:clientId/assign-routine', async (req, res) => {
    const { clientId } = req.params;
    const { routine_id, assigned_by_trainer_id } = req.body;
    try {
        const query = 'INSERT INTO rutinas_asignadas(client_id, routine_id, assigned_by_trainer_id) VALUES ($1, $2, $3)';
        await db.query(query, [clientId, routine_id, assigned_by_trainer_id]);
        res.status(201).json({ message: 'Rutina asignada correctamente.' });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Esta rutina ya fue asignada a este cliente.' });
        }
        res.status(500).json({ message: 'Error al asignar la rutina.' });
    }
});

// Obtener las rutinas asignadas a un cliente
router.get('/users/:clientId/routines', async (req, res) => {
    const { clientId } = req.params;
    try {
        const query = `
            SELECT r.id, r.name, r.description, r.created_by_trainer_id
            FROM rutinas r
            JOIN rutinas_asignadas ra ON r.id = ra.routine_id
            WHERE ra.client_id = $1
        `;
        const routinesResult = await db.query(query, [clientId]);
        const routines = routinesResult.rows;

        for (let routine of routines) {
            const exercisesQuery = 'SELECT * FROM ejercicios WHERE routine_id = $1';
            const exercisesResult = await db.query(exercisesQuery, [routine.id]);
            routine.exercises = exercisesResult.rows;
        }

        res.json(routines);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener las rutinas del cliente.' });
    }
});

// --- Gestión de Equipos (Admin) ---

// Obtener todos los equipos
router.get('/equipment', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM maquinas ORDER BY name');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener equipos.' });
    }
});

// Añadir un nuevo equipo
router.post('/equipment', async (req, res) => {
    const { name, quantity } = req.body;
    try {
        const { rows } = await db.query('INSERT INTO maquinas(name, quantity) VALUES($1, $2) RETURNING *', [name, quantity]);
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al añadir equipo.' });
    }
});

// Actualizar un equipo
router.put('/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { name, quantity, next_maintenance_date } = req.body;
    try {
        const query = 'UPDATE maquinas SET name = $1, quantity = $2, next_maintenance_date = $3 WHERE id = $4 RETURNING *';
        const values = [name, quantity, next_maintenance_date || null, id];
        const { rows } = await db.query(query, values);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado.' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar equipo.' });
    }
});

// Marcar mantenimiento como realizado y posponer 6 meses
router.post('/equipment/:id/complete-maintenance', async (req, res) => {
    const { id } = req.params;
    const client = await db.connect(); // Usar un cliente para la transacción
    try {
        await client.query('BEGIN');

        // 1. Insertar el registro del mantenimiento actual en el historial
        await client.query('INSERT INTO mantenimientos_historial (equipo_id, maintenance_date) VALUES ($1, NOW())', [id]);

        // 2. Calcular la nueva fecha de próximo mantenimiento (6 meses después)
        const newMaintenanceDate = new Date();
        newMaintenanceDate.setMonth(newMaintenanceDate.getMonth() + 6);

        // 3. Actualizar la fecha en la tabla de maquinas
        const query = 'UPDATE maquinas SET next_maintenance_date = $1 WHERE id = $2 RETURNING *';
        const { rows } = await client.query(query, [newMaintenanceDate.toISOString().split('T')[0], id]);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Equipo no encontrado.' });
        }

        await client.query('COMMIT');
        res.json(rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Error al actualizar la fecha de mantenimiento.' });
    } finally {
        client.release();
    }
});

// Obtener el historial de mantenimiento de un equipo
router.get('/equipment/:id/maintenance-history', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM mantenimientos_historial WHERE equipo_id = $1 ORDER BY maintenance_date DESC', [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el historial de mantenimiento.' });
    }
});

// Eliminar un equipo
router.delete('/equipment/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM maquinas WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado.' });
        }
        res.status(200).json({ message: 'Equipo eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar equipo.' });
    }
});

// --- Gestión de Consejos (General y Cliente) ---

// Obtener TODOS los consejos para los clientes
router.get('/consejos', async (req, res) => {
    const { userId } = req.query; // Obtener el ID del usuario actual desde los parámetros de la URL
    try {
        const query = `
            SELECT 
                c.id, c.title, c.content, c.created_at, c.category_id,
                u.name as trainer_name, u.last_name as trainer_last_name,
                cat.name as category_name,
                (SELECT COUNT(*) FROM consejos_likes cl WHERE cl.consejo_id = c.id) as likes_count,
                EXISTS(SELECT 1 FROM consejos_likes cl WHERE cl.consejo_id = c.id AND cl.user_id = $1) as user_has_liked
            FROM consejos c
            JOIN usuarios u ON c.created_by_trainer_id = u.id
            LEFT JOIN categorias_consejos cat ON c.category_id = cat.id
            ORDER BY c.created_at DESC
        `;
        // Pasamos el userId para que la consulta sepa si el usuario actual ha dado 'like'
        const { rows } = await db.query(query, [userId || null]);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener todos los consejos:', error);
        res.status(500).json({ message: 'Error al obtener los consejos.' });
    }
});

// --- Gestión de Consejos (Entrenador) ---

// Crear un nuevo consejo
router.post('/consejos', async (req, res) => {
    const { title, content, created_by_trainer_id, category_id } = req.body;
    if (!title || !content || !created_by_trainer_id) {
        return res.status(400).json({ message: 'Título, contenido y ID del entrenador son requeridos.' });
    }
    try {
        const query = 'INSERT INTO consejos(title, content, created_by_trainer_id, category_id) VALUES($1, $2, $3, $4) RETURNING *';
        const { rows } = await db.query(query, [title, content, created_by_trainer_id, category_id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error al crear consejo:', error);
        res.status(500).json({ message: 'Error en el servidor al crear el consejo.' });
    }
});

// Obtener todos los consejos de un entrenador específico
router.get('/consejos/trainer/:trainerId', async (req, res) => {
    const { trainerId } = req.params;
    try {
        const query = `
            SELECT c.id, c.title, c.content, c.created_at, c.category_id,
                   cat.name as category_name,
                   (SELECT COUNT(*) FROM consejos_likes cl WHERE cl.consejo_id = c.id) as likes_count
            FROM consejos c
            LEFT JOIN categorias_consejos cat ON c.category_id = cat.id
            WHERE c.created_by_trainer_id = $1
            ORDER BY c.created_at DESC
        `;
        const { rows } = await db.query(query, [trainerId]);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener consejos del entrenador:', error);
        res.status(500).json({ message: 'Error al obtener los consejos.' });
    }
});

// Actualizar un consejo
router.put('/consejos/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content, category_id } = req.body;
    if (!title || !content) {
        return res.status(400).json({ message: 'Título y contenido son requeridos.' });
    }
    try {
        const query = 'UPDATE consejos SET title = $1, content = $2, category_id = $3 WHERE id = $4 RETURNING *';
        const { rows } = await db.query(query, [title, content, category_id, id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Consejo no encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al actualizar consejo:', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el consejo.' });
    }
});

// Eliminar un consejo
router.delete('/consejos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM consejos WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Consejo no encontrado.' });
        res.status(200).json({ message: 'Consejo eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar consejo:', error);
        res.status(500).json({ message: 'Error al eliminar el consejo.' });
    }
});

// --- Gestión de "Me Gusta" en Consejos ---

// Obtener todas las categorías de consejos
router.get('/consejos/categorias', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM categorias_consejos ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// Dar "me gusta" a un consejo
router.post('/consejos/:id/like', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ message: 'El ID del usuario es requerido.' });
    }
    try {
        await db.query('INSERT INTO consejos_likes (consejo_id, user_id) VALUES ($1, $2)', [id, userId]);
        res.status(201).json({ message: 'Like añadido.' });
    } catch (error) {
        // Si el like ya existe, la BD dará un error de clave primaria duplicada (23505)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'El consejo ya tiene un "me gusta" de este usuario.' });
        }
        console.error('Error al dar like:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// Quitar "me gusta" de un consejo
router.delete('/consejos/:id/like', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ message: 'El ID del usuario es requerido.' });
    }
    try {
        await db.query('DELETE FROM consejos_likes WHERE consejo_id = $1 AND user_id = $2', [id, userId]);
        res.status(200).json({ message: 'Like eliminado.' });
    } catch (error) {
        console.error('Error al quitar like:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// --- Gestión de Comentarios en Consejos ---

// Obtener todos los comentarios de un consejo
router.get('/consejos/:id/comentarios', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                cc.id, 
                cc.comment, 
                cc.created_at, 
                cc.user_id,
                cc.parent_comment_id,
                u.name as user_name, 
                u.last_name as user_last_name,
                u.profile_image_url
            FROM consejos_comentarios cc
            JOIN usuarios u ON cc.user_id = u.id
            WHERE cc.consejo_id = $1
            ORDER BY cc.created_at ASC
        `;
        const { rows } = await db.query(query, [id]);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// Añadir un nuevo comentario a un consejo
router.post('/consejos/:id/comentarios', async (req, res) => {
    const { id } = req.params; // consejo_id
    const { userId, comment, parentCommentId } = req.body; // Añadir parentCommentId
    if (!userId || !comment || !comment.trim()) {
        return res.status(400).json({ message: 'El ID de usuario y el comentario son requeridos.' });
    }
    try {
        const query = 'INSERT INTO consejos_comentarios (consejo_id, user_id, comment, parent_comment_id) VALUES ($1, $2, $3, $4) RETURNING *';
        const { rows } = await db.query(query, [id, userId, comment, parentCommentId || null]);
        
        // Para devolver el comentario con los datos del usuario, hacemos una consulta extra
        const newCommentQuery = `
            SELECT 
                cc.id, cc.comment, cc.created_at, cc.user_id, cc.parent_comment_id,
                u.name as user_name, u.last_name as user_last_name, u.profile_image_url
            FROM consejos_comentarios cc
            JOIN usuarios u ON cc.user_id = u.id
            WHERE cc.id = $1
        `;
        const newCommentResult = await db.query(newCommentQuery, [rows[0].id]);

        res.status(201).json(newCommentResult.rows[0]);
    } catch (error) {
        console.error('Error al añadir comentario:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// Editar un comentario
router.put('/consejos/comentarios/:commentId', async (req, res) => {
    const { commentId } = req.params;
    const { userId, comment } = req.body;

    if (!userId || !comment || !comment.trim()) {
        return res.status(400).json({ message: 'El ID de usuario y el nuevo comentario son requeridos.' });
    }

    try {
        const query = 'UPDATE consejos_comentarios SET comment = $1 WHERE id = $2 AND user_id = $3 RETURNING *';
        const { rows } = await db.query(query, [comment, commentId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Comentario no encontrado o no tienes permiso para editarlo.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error al editar comentario:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// Eliminar un comentario
router.delete('/consejos/comentarios/:commentId', async (req, res) => {
    const { commentId } = req.params;
    const { userId } = req.body; // El ID del usuario que solicita la eliminación

    if (!userId) {
        return res.status(400).json({ message: 'El ID del usuario es requerido para verificar el permiso.' });
    }

    try {
        const query = 'DELETE FROM consejos_comentarios WHERE id = $1 AND user_id = $2';
        const result = await db.query(query, [commentId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Comentario no encontrado o no tienes permiso para eliminarlo.' });
        }

        res.status(200).json({ message: 'Comentario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// --- Gestión de Administración (Consejos y Comentarios) ---

// [ADMIN] Eliminar cualquier consejo
router.delete('/admin/consejos/:id', async (req, res) => {
    // En una app real, aquí se verificaría que el usuario es administrador.
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM consejos WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Consejo no encontrado.' });
        res.status(200).json({ message: 'Consejo eliminado por el administrador.' });
    } catch (error) {
        console.error('Error de admin al eliminar consejo:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// [ADMIN] Eliminar cualquier comentario
router.delete('/admin/comentarios/:commentId', async (req, res) => {
    // En una app real, aquí se verificaría que el usuario es administrador.
    const { commentId } = req.params;
    try {
        const result = await db.query('DELETE FROM consejos_comentarios WHERE id = $1', [commentId]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Comentario no encontrado.' });
        res.status(200).json({ message: 'Comentario eliminado por el administrador.' });
    } catch (error) {
        console.error('Error de admin al eliminar comentario:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// --- Gestión de Reportes ---

// Crear un nuevo reporte
router.post('/reportes', async (req, res) => {
    const { reported_by_user_id, consejo_id, comentario_id, reason, details } = req.body;

    if (!reported_by_user_id || !reason) {
        return res.status(400).json({ message: 'Usuario y motivo son requeridos.' });
    }
    if (!consejo_id && !comentario_id) {
        return res.status(400).json({ message: 'Se debe reportar un consejo o un comentario.' });
    }

    try {
        const query = 'INSERT INTO reportes (reported_by_user_id, consejo_id, comentario_id, reason, details, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const { rows } = await db.query(query, [reported_by_user_id, consejo_id || null, comentario_id || null, reason, details || null, 'pendiente']);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error al crear reporte:', error);
        res.status(500).json({ message: 'Error en el servidor al crear el reporte.' });
    }
});

// [ADMIN] Obtener todos los reportes
router.get('/admin/reportes', async (req, res) => {
    // Aquí iría la verificación de admin
    try {
        const query = `
            SELECT 
                r.id, r.reason, r.details, r.status, r.created_at,
                r.consejo_id, c.title as consejo_title,
                r.comentario_id, cc.comment as comentario_text,
                reporter.name as reporter_name, reporter.last_name as reporter_last_name
            FROM reportes r
            JOIN usuarios reporter ON r.reported_by_user_id = reporter.id
            LEFT JOIN consejos c ON r.consejo_id = c.id
            LEFT JOIN consejos_comentarios cc ON r.comentario_id = cc.id
            ORDER BY r.status ASC, r.created_at DESC
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// [ADMIN] Actualizar el estado de un reporte
router.put('/admin/reportes/:id', async (req, res) => {
    // Aquí iría la verificación de admin
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'El estado es requerido.' });
    }

    try {
        const query = 'UPDATE reportes SET status = $1 WHERE id = $2 RETURNING *';
        const { rows } = await db.query(query, [status, id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Reporte no encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al actualizar reporte:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// [ADMIN] Obtener estadísticas del dashboard
router.get('/admin/stats', async (req, res) => {
    // En una app real, aquí se verificaría que el usuario es administrador.
    try {
        const totalClientsQuery = db.query("SELECT COUNT(*) FROM usuarios WHERE type = 'Cliente'");
        const totalTrainersQuery = db.query("SELECT COUNT(*) FROM usuarios WHERE type = 'Entrenador'");
        const pendingReportsQuery = db.query("SELECT COUNT(*) FROM reportes WHERE status = 'pendiente'");
        const totalTipsQuery = db.query("SELECT COUNT(*) FROM consejos");

        const [
            totalClientsRes,
            totalTrainersRes,
            pendingReportsRes,
            totalTipsRes
        ] = await Promise.all([
            totalClientsQuery,
            totalTrainersQuery,
            pendingReportsQuery,
            totalTipsQuery
        ]);

        const stats = {
            totalClients: parseInt(totalClientsRes.rows[0].count, 10),
            totalTrainers: parseInt(totalTrainersRes.rows[0].count, 10),
            pendingReports: parseInt(pendingReportsRes.rows[0].count, 10),
            totalTips: parseInt(totalTipsRes.rows[0].count, 10),
        };

        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas del admin:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// [ADMIN] Obtener datos de crecimiento de usuarios para el gráfico
router.get('/admin/stats/growth', async (req, res) => {
    // En una app real, aquí se verificaría que el usuario es administrador.
    try {
        // Crecimiento de usuarios (clientes y entrenadores) por mes en los últimos 12 meses
        const userGrowthQuery = `
            SELECT
                to_char(date_trunc('month', registration_date), 'YYYY-MM') as month,
                type,
                COUNT(*) as new_users
            FROM usuarios
            WHERE registration_date >= date_trunc('month', NOW() - interval '11 months')
            GROUP BY 1, 2
            ORDER BY 1 ASC;
        `;

        const { rows } = await db.query(userGrowthQuery);

        // --- Procesamiento de datos para el gráfico ---
        const months = [];
        const clientDataMap = new Map();
        const trainerDataMap = new Map();

        // 1. Generar los últimos 12 meses para asegurar que no haya huecos
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = d.toISOString().slice(0, 7); // 'YYYY-MM'
            months.push(monthKey);
            clientDataMap.set(monthKey, 0);
            trainerDataMap.set(monthKey, 0);
        }

        // 2. Poblar los mapas con los datos de la BD
        rows.forEach(row => {
            if (row.type === 'Cliente') {
                clientDataMap.set(row.month, parseInt(row.new_users, 10));
            } else if (row.type === 'Entrenador') {
                trainerDataMap.set(row.month, parseInt(row.new_users, 10));
            }
        });

        // 3. Crear los arrays finales para el gráfico
        const labels = months.map(monthKey => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(year, month - 1, 1).toLocaleString('es-ES', { month: 'short' });
            return monthName.charAt(0).toUpperCase() + monthName.slice(1);
        });

        const clientData = months.map(monthKey => clientDataMap.get(monthKey));
        const trainerData = months.map(monthKey => trainerDataMap.get(monthKey));

        if (labels.length === 0) {
            return res.json({ labels: ['Sin Datos'], datasets: [{ data: [0] }] });
        }

        res.json({
            labels,
            datasets: [
                { data: clientData, color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})` }, // Azul para Clientes
                { data: trainerData, color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})` }  // Rojo para Entrenadores
            ],
            legend: ['Clientes', 'Entrenadores'], // Leyenda para el gráfico
        });
    } catch (error) {
        console.error('Error al obtener datos de crecimiento:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// [ADMIN] Obtener datos de estado de membresías para gráfico circular
router.get('/admin/stats/memberships', async (req, res) => {
    try {
        const query = `
            SELECT
                SUM(CASE WHEN type = 'Cliente' AND registration_date IS NOT NULL AND (registration_date + interval '30 days') >= NOW() THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN type = 'Cliente' AND (registration_date IS NULL OR (registration_date + interval '30 days') < NOW()) THEN 1 ELSE 0 END) as expired_count
            FROM usuarios;
        `;
        const { rows } = await db.query(query);
        const data = [
            { name: 'Activas', count: parseInt(rows[0].active_count || '0', 10), color: '#2ECC71', legendFontColor: '#7F7F7F', legendFontSize: 15 },
            { name: 'Vencidas', count: parseInt(rows[0].expired_count || '0', 10), color: '#E74C3C', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        ];

        // Filtrar para no mostrar categorías con 0 clientes, lo que puede causar errores en el gráfico
        const filteredData = data.filter(item => item.count > 0);

        res.json(filteredData);

    } catch (error) {
        console.error('Error al obtener estadísticas de membresías:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// --- Gestión de Notificaciones Push ---

// Guardar el push token de un usuario
router.post('/users/:id/push-token', async (req, res) => {
    const { id } = req.params;
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token es requerido.' });
    }

    try {
        await db.query('UPDATE usuarios SET push_token = $1 WHERE id = $2', [token, id]);
        res.status(200).json({ message: 'Token guardado correctamente.' });
    } catch (error) {
        console.error('Error al guardar push token:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// [TAREA PROGRAMADA] Enviar notificaciones de membresía a punto de vencer
router.post('/notifications/send-expiry-reminders', async (req, res) => {
    // En un entorno de producción, esta ruta debería estar protegida.
    console.log('Iniciando tarea de envío de recordatorios de vencimiento...');
    try {
        // Buscamos usuarios cuya membresía de 30 días (basada en registration_date)
        // vence en exactamente 3, 1 o 0 días (hoy).
        const query = `
            SELECT id, name, push_token, (registration_date + interval '30 days' - NOW()::date) as time_to_expiry
            FROM usuarios
            WHERE 
                type = 'Cliente' AND
                push_token IS NOT NULL AND
                (registration_date + interval '30 days')::date - NOW()::date IN (3, 1, 0)
        `;
        const { rows: users } = await db.query(query);

        if (users.length === 0) {
            console.log('No hay usuarios con membresías por vencer hoy, en 1 o 3 días.');
            return res.status(200).json({ message: 'No hay notificaciones para enviar.' });
        }

        const messages = [];
        for (const user of users) {
            const daysLeft = Math.ceil(user.time_to_expiry.days);
            let bodyMessage;
            if (daysLeft <= 0) {
                bodyMessage = `Hola ${user.name}, tu membresía ha vencido. ¡Reanúdala para no perderte de nada!`;
            } else if (daysLeft === 1) {
                bodyMessage = `¡Hola ${user.name}! Tu membresía vence mañana. ¡No olvides renovarla!`;
            } else {
                bodyMessage = `Hola ${user.name}, a tu membresía le quedan solo ${daysLeft} días. ¡Reanúdala pronto!`;
            }

            messages.push({
                to: user.push_token,
                sound: 'default',
                title: '🚨 Recordatorio de Membresía',
                body: bodyMessage,
                data: { screen: 'Perfil' }, // Para redirigir al usuario si abre la notificación
            });
        }

        // Enviar notificaciones en lotes usando el servicio de Expo
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });

        console.log(`Se enviaron ${messages.length} notificaciones.`);
        res.status(200).json({ message: `Se procesaron ${messages.length} notificaciones.` });
    } catch (error) {
        console.error('Error en la tarea de envío de notificaciones:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// RUTA PARA PROCESAR UN NUEVO PAGO
router.post('/payments', async (req, res) => {
  const { userId, amount, currency } = req.body;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener el usuario y su fecha de registro actual
    const userRes = await client.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('Usuario no encontrado.');
    }
    const user = userRes.rows[0];

    // 2. Calcular la nueva fecha de membresía (lógica acumulativa)
    const daysToAdd = Math.floor(amount / 10) * 30; // Asumimos $10 = 30 días
    const today = new Date();
    
    const currentStartDate = new Date(user.registration_date);
    const currentEndDate = new Date(new Date(user.registration_date).setDate(currentStartDate.getDate() + 30));
    const baseDate = (currentEndDate && currentEndDate > today) ? currentEndDate : today;
    const newExpiryDate = new Date(baseDate);
    newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);

    // 3. Recalcular la fecha de registro para que la lógica de "30 días desde el inicio" siga funcionando
    const newRegistrationDate = new Date(newExpiryDate);
    newRegistrationDate.setDate(newExpiryDate.getDate() - 30);

    // 4. Actualizar la fecha de membresía del usuario en la BD
    await client.query('UPDATE usuarios SET registration_date = $1 WHERE id = $2', [newRegistrationDate.toISOString(), userId]);

    // 5. Insertar el registro del pago en la nueva tabla 'pagos'
    await client.query(
      'INSERT INTO pagos(client_id, amount, currency) VALUES($1, $2, $3)',
      [userId, amount, currency]
    );

    // 6. Confirmar la transacción
    await client.query('COMMIT');

    // 7. Devolver el usuario actualizado para refrescar la app
    const updatedUserRes = await db.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
    const updatedUser = updatedUserRes.rows[0];
    delete updatedUser.password_hash;
    res.json(updatedUser);
  } catch (error) {
    await client.query('ROLLBACK'); // Revertir cambios en caso de error
    console.error('Error procesando el pago:', error);
    res.status(500).json({ message: error.message || 'Error interno del servidor al procesar el pago.' });
  } finally {
    client.release(); // Liberar el cliente de vuelta a la pool
  }
});

// RUTA PARA OBTENER EL HISTORIAL DE PAGOS DE UN USUARIO
router.get('/users/:userId/payments', async (req, res) => {
  const { userId } = req.params;
  try {
    const { rows } = await db.query('SELECT id, client_id, amount, currency, payment_date FROM pagos WHERE client_id = $1 ORDER BY payment_date DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    res.status(500).json({ message: 'Error al obtener el historial de pagos.' });
  }
});

module.exports = router;