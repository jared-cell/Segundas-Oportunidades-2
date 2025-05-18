// ============================
// 📦 IMPORTACIONES
// ============================
const express = require('express');
const path = require('path');
const session = require('express-session');
const {
  verificarCorreo,
  registrarUsuario,
  loginUsuario,
  loginAdmin,
  registrarDonacion,
  registrarReporte,
  obtenerPerros,
  obtenerPerroPorId
} = require('./bd');

const server = express();

// ============================
// ⚙️ CONFIGURACIÓN DE VISTAS Y MIDDLEWARES
// ============================
server.set('view engine', 'ejs');
server.set('views', path.join(__dirname, 'views'));
server.use(express.static(path.join(__dirname, 'public')));
server.use(express.urlencoded({ extended: false }));

// ============================
// 🔒 CONFIGURACIÓN DE SESIÓN
// ============================
server.use(session({
  secret: 'segundas_oportunidades_123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 600000 } // 10 minutos
}));

// ============================
// 🛡️ MIDDLEWARES DE AUTENTICACIÓN
// ============================
function authUser(req, res, next) {
  if (req.session.user && !req.session.isAdmin) return next();
  res.redirect('/login');
}

function authAdmin(req, res, next) {
  if (req.session.user && req.session.isAdmin) return next();
  res.redirect('/login');
}

// ============================
// 🌐 RUTAS PÚBLICAS
// ============================
server.get('/', (req, res) => {
  res.render('bienvenido', { title: 'Bienvenido' });
});

server.get('/login', (req, res) => {
  res.render('Login', { error: null, success: req.query.success || null, title: 'Login' });
});

server.get('/registro', (req, res) => {
  res.render('crearCuenta', { error: null, title: 'Crear Cuenta' });
});

// ============================
// 🖍️ REGISTRO DE USUARIOS
// ============================
server.post('/registro', async (req, res) => {
  const { nombre, direccion, telefono, correo, password } = req.body;

  if (!nombre || !direccion || !telefono || !correo || !password) {
    return res.render('crearCuenta', { error: 'Por favor, completa todos los campos.', title: 'Crear Cuenta' });
  }

  try {
    const existentes = await verificarCorreo(correo);
    if (existentes.length > 0) {
      return res.render('crearCuenta', { error: 'Este correo ya está registrado.', title: 'Crear Cuenta' });
    }

    await registrarUsuario({ nombre, direccion, telefono, correo, password });
    res.redirect('/login?success=Registro completado con éxito. Ahora puedes iniciar sesión.');
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.render('crearCuenta', { error: 'Error en el servidor.', title: 'Crear Cuenta' });
  }
});

// ============================
// 🔐 LOGIN DE USUARIOS Y ADMINS
// ============================
server.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.render('Login', {
      error: 'Por favor, completa todos los campos.',
      success: null,
      title: 'Login'
    });
  }

  try {
    if (usuario.includes('@')) {
      // Login de usuario
      const userResults = await loginUsuario(usuario);
      if (userResults.length > 0 && userResults[0].password === password) {
        req.session.user = userResults[0];
        req.session.isAdmin = false;
        return res.redirect('/menu');
      } else {
        return res.render('Login', { error: 'Correo o contraseña incorrectos.', success: null, title: 'Login' });
      }
    } else {
      // Login de admin
      const adminResults = await loginAdmin(usuario);
      if (adminResults.length > 0 && adminResults[0].password === password) {
        req.session.user = adminResults[0];
        req.session.isAdmin = true;
        return res.redirect('/admin_dashboard');
      } else {
        return res.render('Login', { error: 'Nombre de administrador o contraseña incorrectos.', success: null, title: 'Login' });
      }
    }
  } catch (err) {
    console.error('Error en el login:', err);
    res.render('Login', { error: 'Error interno del servidor.', success: null, title: 'Login' });
  }
});

// ============================
// 🚪 CERRAR SESIÓN
// ============================
server.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Error al cerrar sesión:', err);
    res.redirect('/login');
  });
});

// ============================
// 🧭 RUTAS DEL MENÚ PRINCIPAL (usuario logueado)
// ============================
server.get('/menu', authUser, (req, res) => {
  res.render('Menu', { usuario: req.session.user });
});

server.get('/acerca', authUser, (req, res) => {
  res.render('Acerca del albergue');
});

server.get('/donaciones', authUser, (req, res) => {
  res.render('InfoDonaciones');
});

server.get('/donaciones/formulario', authUser, (req, res) => {
  res.render('FormularioDonaciones');
});

server.post('/donaciones/formulario', authUser, async (req, res) => {
  try {
    await registrarDonacion(req.body);
    res.redirect('/menu');
  } catch (err) {
    console.error('Error al registrar donación:', err);
    res.status(500).send('Error al registrar donación');
  }
});

server.get('/reportes', authUser, (req, res) => {
  res.render('InfoReportes');
});

server.get('/reportes/formulario', authUser, (req, res) => {
  res.render('FormularioReporte');
});

server.post('/reportes/formulario', authUser, async (req, res) => {
  try {
    await registrarReporte(req.body);
    res.redirect('/menu');
  } catch (err) {
    console.error('Error al registrar reporte:', err);
    res.status(500).send('Error al registrar reporte');
  }
});

server.get('/adopciones', authUser, async (req, res) => {
  try {
    const perros = await obtenerPerros();
    res.render('Perros', { perros, title: 'Perros disponibles para adopción' });
  } catch (err) {
    console.error('Error al obtener perros:', err);
    res.status(500).send('Error al obtener perros');
  }
});

server.get('/adopciones/:id', authUser, async (req, res) => {
  const id = req.params.id;
  try {
    const results = await obtenerPerroPorId(id);
    if (results.length === 0) return res.status(404).send('Perro no encontrado');
    const perro = results[0];
    res.render('DetallesPerros', { perro, title: `Detalle de ${perro.nombre}` });
  } catch (err) {
    console.error('Error al obtener perro:', err);
    res.status(500).send('Error al obtener perro');
  }
});

// ============================
// 🚀 INICIAR SERVIDOR
// ============================
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
