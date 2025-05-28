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

function query(sql, params = []) {
  return pool.promise().query(sql, params).then(([results]) => results);
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
    `INSERT INTO usuarios (nombre, direccion, telefono, correo, password) VALUES (?, ?, ?, ?, ?)`,
    [nombre, direccion, telefono, correo, password]
  );
}

async function loginUsuario(correo, password) {
  const usuarios = await query('SELECT * FROM usuarios WHERE correo = ? AND password = ?', [correo, password]);
  return usuarios.length ? usuarios[0] : null;
}

// ============================
// 🚀 CONFIGURACIÓN DEL SERVIDOR
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
  saveUninitialized: false,
}));

// ============================
// 🔁 RUTAS PÚBLICAS Y DE AUTENTICACIÓN
// ============================

app.get('/', (req, res) => {
  res.redirect('/bienvenido');
});

app.get('/bienvenido', (req, res) => {
  res.render('Bienvenido', { title: 'Bienvenido', user: req.session.user || null });
});


app.get('/login', (req, res) => {
  res.render('Login', { title: 'Login', error: null, success: req.query.success || null });
});

app.post('/login', async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) {
    return res.render('Login', { title: 'Login', error: 'Por favor, completa todos los campos.', success: null });
  }

  try {
    const usuario = await loginUsuario(correo, password);
    if (usuario) {
      req.session.user = usuario;
      return res.redirect('/menu');
    }
    res.render('Login', { title: 'Login', error: 'Usuario no registrado o contraseña incorrecta.', success: null });
  } catch (err) {
    console.error('Error login:', err);
    res.render('Login', { title: 'Login', error: 'Error del servidor. Intenta más tarde.', success: null });
  }
});

app.get('/registro', (req, res) => {
  res.render('crearCuenta', { title: 'Registro', error: null });
});

app.post('/registro', async (req, res) => {
  const { nombre, direccion, telefono, correo, password } = req.body;
  if (!nombre || !direccion || !telefono || !correo || !password) {
    return res.render('crearCuenta', { title: 'Registro', error: 'Por favor, completa todos los campos.' });
  }

  try {
    if (await verificarCorreo(correo)) {
      return res.render('crearCuenta', { title: 'Registro', error: 'Este correo ya está registrado.' });
    }
    await registrarUsuario({ nombre, direccion, telefono, correo, password });
    req.session.user = await loginUsuario(correo, password);
    res.redirect('/menu');
  } catch (err) {
    console.error('Error registro:', err);
    res.render('crearCuenta', { title: 'Registro', error: 'Error en el servidor. Inténtalo más tarde.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ============================
// 🔒 RUTAS PROTEGIDAS CON SESIÓN
// ============================

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login?error=Debes+iniciar+sesión+primero');
  next();
}

app.get('/menu', requireLogin, (req, res) => {
  res.render('Menu', { title: 'Menú Principal', user: req.session.user });
});

app.get('/acerca_del_albergue', requireLogin, (req, res) => {
  res.render('AcercaDelAlbergue', { title: 'Acerca del Albergue', user: req.session.user });
});

app.get('/infoAdopciones', requireLogin, (req, res) => {
  res.render('InfoAdopciones', { title: 'Información sobre Adopciones', user: req.session.user });
});

app.get('/infoDonaciones', requireLogin, (req, res) => {
  res.render('InfoDonaciones', { title: 'Información sobre Donaciones', user: req.session.user });
});

// NUEVA RUTA AGREGADA PARA INFO REPORTES
app.get('/infoReportes', requireLogin, (req, res) => {
  res.render('InfoReportes', { title: 'Información sobre Reportes', user: req.session.user });
});

// ============================
// 🐶 RUTAS RELACIONADAS CON PERROS
// ============================

app.get('/perros', requireLogin, async (req, res) => {
  try {
    const perros = await query('SELECT * FROM perros');
    res.render('Perros', { title: 'Nuestros Perros', user: req.session.user, perros });
  } catch (err) {
    console.error('Error al obtener perros:', err);
    res.status(500).render('Perros', { title: 'Nuestros Perros', user: req.session.user, perros: [], error: 'No se pudieron cargar los perros.' });
  }
});

app.get('/perros/:id', requireLogin, async (req, res) => {
  try {
    const [perro] = await query('SELECT * FROM perros WHERE id = ?', [req.params.id]);
    if (!perro) return res.status(404).render('404', { title: 'Perro no encontrado', user: req.session.user });
    res.render('DetallesPerros', { title: `Detalles de ${perro.nombre}`, user: req.session.user, perro });
  } catch (err) {
    console.error('Error detalles perro:', err);
    res.status(500).render('DetallesPerros', { title: 'Error al cargar detalles', user: req.session.user, perro: null, error: 'No se pudieron cargar los detalles.' });
  }
});

// ============================
// 📝 FORMULARIO DE REPORTES (con nombre respetado)
// ============================

app.get('/FormularioReportes', requireLogin, (req, res) => {
  res.render('FormularioReportes', { title: 'Formulario de Reportes', user: req.session.user, error: null, success: null, formData: {} });
});

// ============================
// 💰 FORMULARIO Y PROCESO DE DONACIONES
// ============================

app.get('/FormularioDonaciones', requireLogin, (req, res) => {
  res.render('FormularioDonaciones', { title: 'Formulario de Donaciones', user: req.session.user, error: null, success: null, formData: {} });
});

app.post('/donaciones/guardar', requireLogin, async (req, res) => {
  const { tipo_donacion, monto, descripcion, nombre_material, cantidad_material, id_usuario } = req.body;

  try {
    if (tipo_donacion === 'economica') {
      if (!monto || monto <= 0) throw new Error('Monto inválido');
      await query(`INSERT INTO donaciones (tipo_donacion, monto, id_usuario) VALUES (?, ?, ?)`, [tipo_donacion, monto, id_usuario]);
    } else if (tipo_donacion === 'material') {
      if (!nombre_material || !cantidad_material || cantidad_material <= 0) throw new Error('Datos inválidos');
      await query(`INSERT INTO donaciones (tipo_donacion, descripcion, nombre_material, cantidad_material, id_usuario) VALUES (?, ?, ?, ?, ?)`, [tipo_donacion, descripcion || '', nombre_material, cantidad_material, id_usuario]);
    } else {
      throw new Error('Tipo de donación inválido');
    }

    res.render('FormularioDonaciones', { title: 'Formulario de Donaciones', user: req.session.user, error: null, success: 'Donación guardada con éxito. ¡Gracias!', formData: {} });
  } catch (err) {
    res.render('FormularioDonaciones', { title: 'Formulario de Donaciones', user: req.session.user, error: err.message || 'Error procesando la donación.', success: null, formData: req.body });
  }
});

// ============================
// 🚫 PÁGINA 404 PARA RUTAS NO ENCONTRADAS
// ============================

app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada', user: req.session.user || null });
});

// ============================
// 🔊 INICIAR EL SERVIDOR
// ============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

// ============================
// 📤 EXPORTACIONES (si las necesitas)
// ============================
module.exports = {
  query,
  verificarCorreo,
  registrarUsuario,
  loginUsuario,
};
