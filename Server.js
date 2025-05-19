// ============================
// 📦 IMPORTACIONES Y CONFIGURACIÓN INICIAL
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
  obtenerPerroPorId,
} = require('./bd');

const app = express();

// ============================
// ⚙️ CONFIGURACIÓN DE VISTAS Y MIDDLEWARES
// ============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ============================
// 🔒 CONFIGURACIÓN DE SESIÓN
// ============================
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'proyecto_secreto_segundas_oportunidades',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 }, // 10 minutos
  })
);

// ============================
// 🛡️ MIDDLEWARES DE AUTENTICACIÓN
// ============================
function authUser(req, res, next) {
  if (req.session.user && !req.session.isAdmin) return next();
  res.redirect('/login?error=Por+favor+inicia+sesión+como+usuario');
}

function authAdmin(req, res, next) {
  if (req.session.user && req.session.isAdmin) return next();
  res.redirect('/login?error=Por+favor+inicia+sesión+como+administrador');
}

// ============================
// 🌐 RUTAS PÚBLICAS
// ============================

// Página principal
app.get('/', (req, res) => {
  res.render('bienvenido', { title: 'Bienvenido' });
});

// Login
app.get('/login', (req, res) => {
  res.render('Login', {
    error: req.query.error || null,
    success: req.query.success || null,
    title: 'Login',
  });
});

// Registro de usuarios
app.get('/registro', (req, res) => {
  res.render('crearCuenta', { error: null, title: 'Crear Cuenta' });
});

// Registro de usuarios (POST)
app.post('/registro', async (req, res) => {
  const { nombre, direccion, telefono, correo, password } = req.body;
  if (!nombre || !direccion || !telefono || !correo || !password) {
    return res.render('crearCuenta', {
      error: 'Por favor, completa todos los campos.',
      title: 'Crear Cuenta',
    });
  }
  try {
    const existentes = await verificarCorreo(correo);
    if (existentes.length > 0) {
      return res.render('crearCuenta', {
        error: 'Este correo ya está registrado.',
        title: 'Crear Cuenta',
      });
    }
    await registrarUsuario({ nombre, direccion, telefono, correo, password });
    res.redirect('/login?success=Registro+completado+con+éxito');
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.render('crearCuenta', {
      error: 'Error en el servidor.',
      title: 'Crear Cuenta',
    });
  }
});

// Login usuario/admin (POST)
app.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.render('Login', {
      error: 'Por favor, completa todos los campos.',
      success: null,
      title: 'Login',
    });
  }
  try {
    if (usuario.includes('@')) {
      // Login usuario
      const usuarios = await loginUsuario(usuario, password);
      if (usuarios.length > 0) {
        req.session.user = usuarios[0];
        req.session.isAdmin = false;
        return res.redirect('/menu');
      }
      return res.render('Login', {
        error: 'Correo o contraseña incorrectos.',
        success: null,
        title: 'Login',
      });
    } else {
      // Login admin
      const admins = await loginAdmin(usuario, password);
      if (admins.length > 0) {
        req.session.user = admins[0];
        req.session.isAdmin = true;
        return res.redirect('/admin_dashboard');
      }
      return res.render('Login', {
        error: 'Nombre de administrador o contraseña incorrectos.',
        success: null,
        title: 'Login',
      });
    }
  } catch (error) {
    console.error('Error en el login:', error);
    res.render('Login', {
      error: 'Error interno del servidor.',
      success: null,
      title: 'Login',
    });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Error al cerrar sesión:', err);
    res.redirect('/login');
  });
});

// ============================
// 🧭 RUTAS PARA USUARIOS (requieren sesión usuario)
// ============================

// Menú principal de usuario
app.get('/menu', authUser, (req, res) => {
  res.render('Menu', {
    title: 'Menú Principal',
    user: req.session.user,
  });
});

// Acerca del albergue
app.get('/acerca', authUser, (req, res) => {
  res.render('AcercaDelAlbergue', { title: 'Acerca del albergue' });
});

// Listado de perros para adopción
app.get('/adopciones', authUser, async (req, res) => {
  try {
    const perros = await obtenerPerros();
    res.render('Perros', {
      title: 'Perros en adopción',
      user: req.session.user,
      perros,
    });
  } catch (error) {
    console.error('Error al obtener perros:', error);
    res.render('Perros', {
      title: 'Perros en adopción',
      user: req.session.user,
      perros: [],
      error: 'No se pudieron cargar los perros para adopción.',
    });
  }
});

// Detalle de un perro específico
app.get('/adopciones/:id', authUser, async (req, res) => {
  const id = req.params.id;
  try {
    const perro = await obtenerPerroPorId(id);
    if (!perro || perro.length === 0) {
      return res.status(404).render('404', { title: 'Perro no encontrado' });
    }
    res.render('DetallePerros', {
      title: 'Detalle de los Perros',
      perro: perro[0],
      user: req.session.user,
    });
  } catch (error) {
    console.error('Error al obtener perro:', error);
    res.status(500).render('500', { title: 'Error Interno del Servidor' });
  }
});

// Información y formulario de donaciones
app.get('/donaciones', authUser, (req, res) => {
  res.render('InfoDonaciones', { title: 'Donaciones', user: req.session.user });
});

app.get('/donaciones/formulario', authUser, (req, res) => {
  res.render('FormularioDonaciones', {
    title: 'Formulario de Donaciones',
    user: req.session.user,
    error: null,
    success: null,
    formData: {},
  });
});

app.post('/donaciones/guardar', authUser, async (req, res) => {
  const { monto, metodoPago, material, materialOtro } = req.body;
  let errores = [];
  const montoParseado = parseFloat(monto);

  if (!monto || isNaN(montoParseado) || montoParseado <= 0) {
    errores.push('Por favor, ingresa un monto válido mayor que 0.');
  }
  if (!metodoPago) {
    errores.push('Selecciona un método de pago.');
  }
  if (errores.length > 0) {
    return res.render('FormularioDonaciones', {
      title: 'Formulario de Donaciones',
      user: req.session.user,
      error: errores.join(' '),
      success: null,
      formData: req.body,
    });
  }

  let materialGuardado = '';
  if (material) {
    if (Array.isArray(material)) {
      materialGuardado = material.join(', ');
    } else if (typeof material === 'string') {
      materialGuardado = material;
    }
  }

  let materialOtroGuardado = null;
  if (
    (Array.isArray(material) && material.includes('otro')) ||
    (typeof material === 'string' && material === 'otro')
  ) {
    materialOtroGuardado = materialOtro?.trim() || null;
  }

  try {
    await registrarDonacion({
      id_usuario: req.session.user.id,
      monto: montoParseado,
      metodoPago,
      material: materialGuardado,
      materialOtro: materialOtroGuardado,
    });

    res.render('FormularioDonaciones', {
      title: 'Formulario de Donaciones',
      user: req.session.user,
      success: 'Donación registrada con éxito.',
      error: null,
      formData: {},
    });
  } catch (error) {
    console.error('Error al registrar donación:', error);
    res.render('FormularioDonaciones', {
      title: 'Formulario de Donaciones',
      user: req.session.user,
      error: 'Error al registrar la donación.',
      success: null,
      formData: req.body,
    });
  }
});

// Formulario de reportes
app.get('/reportes/formulario', authUser, (req, res) => {
  res.render('FormularioReporte', {
    title: 'Formulario de Reportes',
    user: req.session.user,
    error: null,
    success: null,
    formData: {},
  });
});

app.post('/reportes/guardar', authUser, async (req, res) => {
  const { tipodemaltrato, fecha, pruebas, pruebasOtro } = req.body;
  if (!tipodemaltrato || !fecha) {
    return res.render('FormularioReporte', {
      title: 'Formulario de Reportes',
      user: req.session.user,
      error: 'Por favor, completa los campos obligatorios.',
      success: null,
      formData: req.body,
    });
  }
  try {
    const pruebasFormatted = Array.isArray(pruebas) ? pruebas.join(',') : pruebas || '';
    await registrarReporte({
      id_usuario: req.session.user.id,
      tipodemaltrato,
      fecha,
      pruebas: pruebasFormatted,
      pruebasOtro: pruebasOtro || null,
    });
    res.render('FormularioReporte', {
      title: 'Formulario de Reportes',
      user: req.session.user,
      success: 'Reporte enviado con éxito.',
      error: null,
      formData: {},
    });
  } catch (error) {
    console.error('Error al registrar reporte:', error);
    res.render('FormularioReporte', {
      title: 'Formulario de Reportes',
      user: req.session.user,
      error: 'Ocurrió un problema al enviar el reporte.',
      success: null,
      formData: req.body,
    });
  }
});

// ============================
// 🛠️ RUTAS PARA ADMINISTRADORES
// ============================
app.get('/admin_dashboard', authAdmin, (req, res) => {
  res.render('adminDashboard', {
    title: 'Panel de Administración',
    admin: req.session.user,
  });
});

// ============================
// 🔥 MANEJO DE ERRORES GENERALES
// ============================
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error general:', err);
  res.status(500).render('500', { title: 'Error Interno del Servidor' });
});

// ============================
// 🚀 INICIAR SERVIDOR
// ============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});