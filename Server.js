// ============================
// 📦 IMPORTACIONES
// ============================
const express = require('express'); // Framework principal
const path = require('path'); // Para manejar rutas de carpetas
const session = require('express-session'); // Para manejar sesiones de usuario
const { verificarCorreo, registrarUsuario, loginUsuario, loginAdmin } = require('./bd'); // Funciones que conectan con la base de datos

const server = express();

// ============================
// ⚙️ CONFIGURACIONES DE VISTAS Y MIDDLEWARES
// ============================
server.set('view engine', 'ejs'); // Usamos EJS como motor de plantillas
server.set('views', path.join(__dirname, 'views')); // Carpeta de las vistas
server.use(express.static(path.join(__dirname, 'public'))); // Carpeta pública para CSS, imágenes, etc.
server.use(express.urlencoded({ extended: false })); // Para leer formularios HTML

// ============================
// 🔐 CONFIGURACIÓN DE SESIÓN
// ============================
// Esto es necesario si vas a usar `req.session` para guardar datos de login, etc.
server.use(session({
    secret: 'segundas_oportunidades_123', // 🔑 Puedes poner algo sencillo si es proyecto escolar
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 } // 10 minutos de duración
}));

// ============================
// 🛡️ MIDDLEWARES DE AUTENTICACIÓN
// ============================
function authUser(req, res, next) {
    if (req.session.user && !req.session.isAdmin) return next(); // Si está logueado como usuario
    res.redirect('/login');
}

function authAdmin(req, res, next) {
    if (req.session.user && req.session.isAdmin) return next(); // Si está logueado como admin
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
// 📝 REGISTRO DE USUARIOS
// ============================
server.post('/registro', (req, res) => {
    const { nombre, direccion, telefono, correo, paswsword } = req.body;

    if (!nombre || !direccion || !telefono || !correo || !paswsword) {
        return res.render('crearCuenta', { error: 'Por favor, completa todos los campos.', title: 'Crear Cuenta' });
    }

    verificarCorreo(correo, (err, results) => {
        if (err) return res.render('crearCuenta', { error: 'Error en el servidor.', title: 'Crear Cuenta' });
        if (results.length > 0) {
            return res.render('crearCuenta', { error: 'Este correo ya está registrado.', title: 'Crear Cuenta' });
        }

        registrarUsuario({ nombre, direccion, telefono, correo, paswsword }, err => {
            if (err) return res.render('crearCuenta', { error: 'Error al registrar el usuario.', title: 'Crear Cuenta' });
            res.redirect('/login?success=Registro completado con éxito. Ahora puedes iniciar sesión.');
        });
    });
});

// ============================
// 🔐 LOGIN DE USUARIOS Y ADMINS
// ============================
server.post('/login', (req, res) => {
    const { usuario, paswsword } = req.body;

    if (!usuario || !paswsword) {
        return res.render('Login', { error: 'Por favor, completa todos los campos.', success: null, title: 'Login' });
    }

    if (usuario.includes('@')) {
        loginUsuario(usuario, paswsword, (err, userResults) => {
            if (err) return res.render('Login', { error: 'Error en el servidor.', success: null, title: 'Login' });
            if (userResults.length > 0) {
                req.session.user = userResults[0];
                req.session.isAdmin = false;
                return res.redirect('/menu?success=¡Bienvenido ' + userResults[0].nombre + '!');
            } else {
                return res.render('Login', { error: 'Correo o contraseña incorrectos.', success: null, title: 'Login' });
            }
        });
    } else {
        loginAdmin(usuario, paswsword, (err, adminResults) => {
            if (err) return res.render('Login', { error: 'Error en el servidor.', success: null, title: 'Login' });
            if (adminResults.length > 0) {
                req.session.user = adminResults[0];
                req.session.isAdmin = true;
                return res.redirect('/admin_dashboard');
            } else {
                return res.render('Login', { error: 'Nombre o contraseña incorrectos.', success: null, title: 'Login' });
            }
        });
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
// 🐾 RUTAS DE USUARIO AUTENTICADO
// ============================
server.get('/menu', authUser, (req, res) => {
    res.render('Menu', { title: 'Menú Principal', user: req.session.user, success: req.query.success || null });
});

server.get('/infoadopciones', authUser, (req, res) => {
    res.render('InfoAdopcion', { title: 'Adopciones', user: req.session.user });
});

server.get('/infodonaciones', authUser, (req, res) => {
    res.render('InfoDonaciones', { title: 'Donaciones', user: req.session.user });
});

server.get('/formdonacion', authUser, (req, res) => {
    res.render('FormularioDonaciones', { title: 'Donación', user: req.session.user });
});

server.get('/acerca', authUser, (req, res) => {
    res.render('AcercaDelAlbergue', { title: 'Acerca del Albergue' });
});

// ============================
// 🧑‍💻 PANEL DE ADMINISTRADOR
// ============================
server.get('/admin_dashboard', authAdmin, (req, res) => {
    res.render('admin_dashboard', { title: 'Panel de Administrador', user: req.session.user });
});

// ============================
// 🚀 INICIAR SERVIDOR
// ============================
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
