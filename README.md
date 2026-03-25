# Gym Manager App

Aplicación móvil para la gestión de gimnasios desarrollada con React Native, Expo y Node.js, con backend desplegado en Render.

## Descripción

Gym Manager App es una solución completa para la administración de gimnasios que permite:
- Gestión de usuarios y membresías
- Registro y seguimiento de asistencia
- Administración de rutinas de entrenamiento
- Sistema de autenticación seguro
- Panel de control para administradores

## Tecnologías Utilizadas

- **Frontend**: React Native con Expo
- **Backend**: Node.js con Express
- **Base de datos**: PostgreSQL (en Render) / MongoDB (opcional)
- **Almacenamiento de archivos**: Cloudinary
- **Autenticación**: JWT y bcryptjs
- **Navegación**: React Navigation
- **UI**: React Native Paper y componentes personalizados
- **Despliegue backend**: Render.com

## Instalación

### Prerrequisitos
- Node.js (v14 o superior)
- Expo CLI instalado globalmente
- Git

### Pasos para ejecutar en desarrollo local

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd Gym_manager_app-main
```

2. Instalar dependencias del frontend:
```bash
npm install
```

3. Configurar el backend:
```bash
cd backend
npm install
```

4. Configurar variables de entorno para desarrollo local:
   - Editar el archivo `backend/.env` con tus credenciales locales
   - Por defecto apunta a MongoDB local en puerto 27017
   - Configurar credenciales de Cloudinary si se usa para almacenamiento de imágenes

5. Iniciar el backend localmente:
```bash
# Desde la carpeta backend
npm start
# El servidor correrá en http://localhost:5000
```

6. Iniciar la aplicación frontend:
```bash
# Desde la carpeta raíz
npm start
# O usar Expo directamente
expo start
```

7. Escanear el código QR con la aplicación Expo Go en su dispositivo móvil o usar un emulador.

## Despliegue en Render

El backend está configurado para desplegarse automáticamente en Render.com:

1. Crear una cuenta en [Render.com](https://render.com)
2. Nuevo Servicio Web -> Conectar tu repositorio de GitHub/GitLab
3. Configurar:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` o `node server.js`
   - **Environment Variables**: Añadir las variables del archivo `.env`
4. Render detectará automáticamente que es un proyecto Node.js y desplegará el servicio

Variables de entorno necesarias para Render:
- `PORT`: Se asigna automáticamente por Render (usar `process.env.PORT || 5000`)
- `MONGODB_URI` o similar para la conexión a la base de datos
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Uso

Una vez que la aplicación esté ejecutándose:
1. Regístrese como nuevo usuario o inicie sesión con credenciales existentes
2. Navegue entre las diferentes secciones según su rol (usuario regular o administrador)
3. Gestione su perfil, membresías, rutinas y otras funcionalidades disponibles

## Estructura del Proyecto

```
Gym_manager_app-main/
├── assets/              # Recursos estáticos (imágenes, iconos, etc.)
├── components/          # Componentes reutilizables de React Native
├── screens/             # Pantallas de la aplicación
├── navigation/          # Configuración de navegación
├── hooks/               # Hooks personalizados
├── utils/               # Funciones utilitarias
├── backend/             # Servidor Node.js (desplegado en Render)
│   ├── controllers/     # Lógica de controladores
│   ├── routes/          # Definición de rutas API
│   ├── db.js            # Configuración de base de datos
│   ├── server.js        # Entrada del servidor
│   └── .env             # Variables de entorno (no subir a Git)
├── App.js               # Componente principal
├── AuthContext.js       # Contexto de autenticación
└── apiConfig.js         # Configuración de la API
```

## Notas Adicionales

- La aplicación requiere una conexión a internet para comunicarse con el backend
- En desarrollo, el backend se ejecuta en `http://localhost:5000` por defecto
- En producción, el backend se accede mediante la URL proporcionada por Render
- Las imágenes y archivos multimedia se almacenan en Cloudinary
- Para contribuciones: crear un branch, hacer cambios, y enviar pull request

## Credenciales de Administrador Predeterminadas

Al iniciar el backend por primera vez, se crea automáticamente un usuario administrador:
- Usuario: `admin`
- Contraseña: `12345678`

Se recomienda cambiar estas credenciales después del primer ingreso por seguridad.