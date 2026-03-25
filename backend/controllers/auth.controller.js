exports.register = async (req, res) => {
  const {
    name,
    lastName,
    idCard,
    age,
    weight,
    height,
    type,
    password,
  } = req.body;
  
console.log('Datos recibidos:', req.body);

  try {
    // Verificar si ya existe el usuario
    const existingUser = realm.objects('User').filtered('idCard == $0', idCard)[0];

    if (existingUser) {
      return res.status(400).json({ message: 'Usuario ya existe' });
    }

    // Crear nuevo usuario
    const newUser = {
      id: idCard,
      name,
      lastName,
      idCard,
      age: parseInt(age),
      weight: parseFloat(weight),
      height: parseFloat(height),
      type,
      password,
    };

    realm.write(() => {
      realm.create('User', newUser);
    });

    res.status(201).json({ message: 'Registro exitoso', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error });
  }
};

exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = realm.objects('User').filtered(
      '(name == $0 OR idCard == $0) AND password == $1',
      identifier,
      password
    )[0];

    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    res.json({ message: 'Inicio exitoso', user });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.updateUser = async (req, res) => {
  const { idCard: userIdFromParams } = req.params; // El ID viene de los parámetros de la URL
  const updates = req.body; // Los datos a actualizar vienen del cuerpo de la solicitud

  // No permitir la actualización de idCard o id directamente si son la clave primaria
  // y se usan para identificar al usuario. Tampoco la contraseña por esta vía.
  delete updates.idCard;
  delete updates.id;
  delete updates.password;
  delete updates.type; // Generalmente el tipo de usuario no se cambia así.

  try {
    const userToUpdate = realm.objects('User').filtered('idCard == $0', userIdFromParams)[0];

    if (!userToUpdate) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    realm.write(() => {
      for (const key in updates) {
        if (userToUpdate.hasOwnProperty(key) && updates[key] !== undefined) {
          // Convertir a los tipos correctos según el esquema antes de asignar
          if (key === 'age') userToUpdate[key] = parseInt(updates[key], 10);
          else if (key === 'weight' || key === 'height') userToUpdate[key] = parseFloat(updates[key]);
          else userToUpdate[key] = updates[key];
        }
      }
    });

    // Devolver el usuario actualizado (opcional, pero buena práctica)
    const updatedUser = realm.objects('User').filtered('idCard == $0', userIdFromParams)[0];
    res.json({ message: 'Usuario actualizado exitosamente', user: updatedUser });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error en el servidor al actualizar usuario', error: error.message });
  }
};