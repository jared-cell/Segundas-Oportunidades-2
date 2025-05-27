// ============================
// 📦 IMPORTACIONES Y CONFIGURACIÓN INICIAL
// ============================
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');

// ============================
// ⚙️ CONFIGURACIÓN DE BASE DE DATOS
// ============================
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'albergue',
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

pool.on('error', (err) => {
  console.error('Error en la conexión a la base de datos:', err.code, err.message);
});

function query(sql, params = []) {
  return pool.promise().query(sql, params)
    .then(([results]) => results)
    .catch((err) => {
      console.error('Error en consulta SQL:', err.message);
      throw err;
    });
}

// ============================
// 📋 FUNCIONES DE USUARIO
// ============================
async function verificarCorreo(correo) {
  const usuarios = await query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
  return usuarios.length > 0;
}

async function registrarUsuario({ nombre, direccion, telefono, correo, password }) {
  await query(
    `INSERT INTO usuarios (nombre, direccion, telefono, correo, password)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, direccion, telefono, correo, password]
  );
}

async function loginUsuario(correo, password) {
  const usuarios = await query('SELECT * FROM usuarios WHERE correo = ? AND password = ?', [correo, password]);
  return usuarios.length > 0 ? usuarios[0] : null;
}

// ============================
// 🚀 CREACIÓN DEL SERVIDOR
// ============================
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false
}));

// ============================
// 🔁 RUTAS
// ============================

// RUTA RAÍZ: SIEMPRE REDIRIGE A BIENVENIDO
app.get('/', (req, res) => {
  res.redirect('/bienvenido');
});

// RUTA DE BIENVENIDA: MUESTRA OPCIONES BASADAS EN AUTENTICACIÓN
app.get('/bienvenido', (req, res) => {
  res.render('Bienvenido', {
    title: 'Bienvenido',
    user: req.session.user || null,
  });
});

app.get('/bienvenido', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('Bienvenido', {
    title: 'Bienvenido',
    user: req.session.user
  });
});

app.get('/login', (req, res) => {
  res.render('Login', {
    title: 'Login',
    error: null,
    success: req.query.success || null
  });
});

app.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.render('Login', {
      title: 'Login',
      error: 'Por favor, completa todos los campos.',
      success: null
    });
  }

  try {
    const usuario = await loginUsuario(correo, password);
    if (usuario) {
      req.session.user = usuario;
      return res.redirect('/menu');
    } else {
      return res.render('Login', {
        title: 'Login',
        error: 'El usuario no está registrado. Por favor, regístrate.',
        success: null
      });
    }
  } catch (err) {
    console.error('Error en login:', err);
    return res.render('Login', {
      title: 'Login',
      error: 'Error del servidor. Intenta más tarde.',
      success: null
    });
  }
});

app.get('/registro', (req, res) => {
  res.render('crearCuenta', {
    title: 'Registro',
    error: null
  });
});

app.post('/registro', async (req, res) => {
  const { nombre, direccion, telefono, correo, password } = req.body;

  if (!nombre || !direccion || !telefono || !correo || !password) {
    return res.render('crearCuenta', {
      title: 'Registro',
      error: 'Por favor, completa todos los campos.'
    });
  }

  try {
    const existe = await verificarCorreo(correo);
    if (existe) {
      return res.render('crearCuenta', {
        title: 'Registro',
        error: 'Este correo ya está registrado.'
      });
    }

    await registrarUsuario({ nombre, direccion, telefono, correo, password });

    const nuevoUsuario = await loginUsuario(correo, password);
    req.session.user = nuevoUsuario;

    return res.redirect('/menu');
  } catch (err) {
    console.error(err);
    res.render('crearCuenta', {
      title: 'Registro',
      error: 'Error en el servidor. Inténtalo más tarde.'
    });
  }
});

app.get('/menu', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?error=Debes+iniciar+sesión+primero');
  }

  res.render('menu', {
    title: 'Menú Principal',
    user: req.session.user
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/acerca_del_albergue', (req, res) => {
  res.render('AcercaDelAlbergue', {
    title: 'Acerca del Albergue',
    user: req.session.user || null
  });
});

app.get('/infoAdopcion', (req, res) => {
  res.render('InfoAdopcion', {
    title: 'Información sobre Adopciones',
    user: req.session.user || null
  });
});

app.get('/infoDonaciones', (req, res) => {
  res.render('InfoDonaciones', {
    title: 'Información sobre Donaciones',
    user: req.session.user || null
  });
});

// MOSTRAR FORMULARIO DE REPORTE
app.get('/FormularioReporte', (req, res) => {
  res.render('FormularioReporte', {
    title: 'Formulario de Reportes',
    user: req.session.user || null,
    error: null,
    success: null,
    formData: {}
  });
});

// RUTA PARA MOSTRAR LOS PERROS DESDE LA BASE DE DATOS
app.get('/perros', async (req, res) => {
  try {
    const perros = await query('SELECT * FROM perros');

    res.render('Perros', {
      title: 'Nuestros Perros',
      user: req.session.user || null,
      perros
    });
  } catch (err) {
    console.error('Error al obtener los perros:', err);
    res.status(500).render('Perros', {
      title: 'Nuestros Perros',
      user: req.session.user || null,
      perros: [],
      error: 'No se pudieron cargar los perros.'
    });
  }
});

// RUTA PARA MOSTRAR DETALLES DE UN PERRO EN DETALLESPERROS.EJS
app.get('/perros/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [perro] = await query('SELECT * FROM perros WHERE id = ?', [id]);

    if (!perro) {
      return res.status(404).render('404', {
        title: 'Perro no encontrado',
        user: req.session.user || null
      });
    }

    res.render('DetallesPerros', {
      title: `Detalles de ${perro.nombre}`,
      user: req.session.user || null,
      perro
    });
  } catch (err) {
    console.error('Error al obtener detalles del perro:', err);
    res.status(500).render('DetallesPerros', {
      title: 'Error al cargar detalles',
      user: req.session.user || null,
      perro: null,
      error: 'No se pudieron cargar los detalles del perro.'
    });
  }
});

// RUTA PARA FORMULARIO DE DONACIONES
app.get('/formulariodonaciones', (req, res) => {
  res.render('FormularioDonaciones', {
    title: 'Formulario de Donaciones',
    user: req.session.user || null,
    error: null,
    success: null,
    formData: {}
  });
});

// RUTA PARA GUARDAR DONACIONES EN LA BASE DE DATOS
app.post('/donaciones/guardar', async (req, res) => {
  const {
    tipo_donacion,
    monto,
    descripcion,
    nombre_material,
    cantidad_material,
    id_usuario
  } = req.body;

  try {
    if (tipo_donacion === 'economica') {
      if (!monto || monto <= 0) {
        return res.render('FormularioDonaciones', {
          title: 'Formulario de Donaciones',
          user: req.session.user || null,
          error: 'Por favor, ingresa un monto válido mayor a 0 para la donación económica.',
          success: null,
          formData: req.body
        });
      }

      await query(
        `INSERT INTO donaciones (tipo_donacion, monto, id_usuario)
         VALUES (?, ?, ?)`,
        [tipo_donacion, monto, id_usuario]
      );
    } else if (tipo_donacion === 'material') {
      if (!nombre_material || nombre_material.trim() === '' || !cantidad_material || cantidad_material <= 0) {
        return res.render('FormularioDonaciones', {
          title: 'Formulario de Donaciones',
          user: req.session.user || null,
          error: 'Por favor, completa el nombre del material y una cantidad válida mayor a 0.',
          success: null,
          formData: req.body
        });
      }

      await query(
        `INSERT INTO donaciones (tipo_donacion, descripcion, nombre_material, cantidad_material, id_usuario)
         VALUES (?, ?, ?, ?, ?)`,
        [tipo_donacion, descripcion || '', nombre_material, cantidad_material, id_usuario]
      );
    } else {
      return res.render('FormularioDonaciones', {
        title: 'Formulario de Donaciones',
        user: req.session.user || null,
        error: 'Tipo de donación inválido.',
        success: null,
        formData: req.body
      });
    }

    return res.render('FormularioDonaciones', {
      title: 'Formulario de Donaciones',
      user: req.session.user || null,
      error: null,
      success: 'Donación guardada con éxito. ¡Gracias por tu generosidad!',
      formData: {}
    });
  } catch (err) {
    console.error('Error al guardar la donación:', err);
    return res.render('FormularioDonaciones', {
      title: 'Formulario de Donaciones',
      user: req.session.user || null,
      error: 'Hubo un error al procesar la donación. Por favor, intenta nuevamente.',
      success: null,
      formData: req.body
    });
  }
});

// ============================
// 🛑 RUTA 404 - PÁGINA NO ENCONTRADA
// ============================
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada',
    user: req.session.user || null
  });
});

// ============================
// 💻 INICIAR SERVIDOR
// ============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
