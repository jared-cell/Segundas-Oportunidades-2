// ============================
// 📦 IMPORTACIONES Y CONFIG
// ============================
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');

const server = express();

// ============================
// ⚙️ CONFIGURACIÓN DE EJS Y MIDDLEWARES
// ============================
server.set('view engine', 'ejs');
server.set('views', path.join(__dirname, 'views'));
server.use(express.static(path.join(__dirname, 'public')));
server.use(express.urlencoded({ extended: false }));

// ============================
// 🔐 CONFIGURACIÓN DE SESIÓN
// ============================
server.use(session({
    secret: 'tu_clave_secreta_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 } // 10 minutos
}));

// ============================
// 🔗 CONEXIÓN A BASE DE DATOS
// ============================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'albergue',
    charset: 'utf8mb4'
});

db.connect(err => {
    if (err) {
        console.error('❌ Error de conexión a MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos MySQL');
});

// ============================
// 🛡️ MIDDLEWARES DE AUTENTICACIÓN
// ============================
function authUser(req, res, next) {
    if (req.session.user && !req.session.isAdmin) {
        next();
    } else {
        res.redirect('/login');
    }
}

function authAdmin(req, res, next) {
    if (req.session.user && req.session.isAdmin) {
        next();
    } else {
        res.redirect('/login');
    }
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
    const { nombre, direccion, telefono, correo, password } = req.body;

    if (!nombre || !direccion || !telefono || !correo || !password) {
        return res.render('crearCuenta', { error: 'Por favor, completa todos los campos.', title: 'Crear Cuenta' });
    }

    db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], (err, results) => {
        if (err) {
            console.error('❌ Error al verificar correo:', err);
            return res.render('crearCuenta', { error: 'Error en el servidor.', title: 'Crear Cuenta' });
        }
        if (results.length > 0) {
            return res.render('crearCuenta', { error: 'Este correo ya está registrado.', title: 'Crear Cuenta' });
        }

        db.query(
            'INSERT INTO usuarios (nombre, direccion, telefono, correo, password) VALUES (?, ?, ?, ?, ?)',
            [nombre, direccion, telefono, correo, password],
            err => {
                if (err) {
                    console.error('❌ Error al insertar usuario:', err);
                    return res.render('crearCuenta', { error: 'Error al registrar el usuario.', title: 'Crear Cuenta' });
                }
                res.redirect('/login?success=Registro completado con éxito. Ahora puedes iniciar sesión.');
            }
        );
    });
});

// ============================
// 🔐 LOGIN DE USUARIOS Y ADMINISTRADORES
// ============================
server.post('/login', (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.render('Login', { error: 'Por favor, completa todos los campos.', success: null, title: 'Login' });
    }

    const esCorreo = usuario.includes('@');

    if (esCorreo) {
        // Login usuario
        db.query('SELECT * FROM usuarios WHERE correo = ? AND password = ?', [usuario, password], (err, userResults) => {
            if (err) {
                console.error('❌ Error al consultar usuarios:', err);
                return res.render('Login', { error: 'Error en el servidor.', success: null, title: 'Login' });
            }

            if (userResults.length > 0) {
                req.session.user = userResults[0];
                req.session.isAdmin = false;
                return res.redirect('/menu?success=¡Bienvenido ' + userResults[0].nombre + '!');
            } else {
                return res.render('Login', { error: 'Correo o contraseña incorrectos.', success: null, title: 'Login' });
            }
        });
    } else {
        // Login admin
        db.query('SELECT * FROM administradores WHERE nombre = ? AND password = ?', [usuario, password], (err, adminResults) => {
            if (err) {
                console.error('❌ Error al consultar administradores:', err);
                return res.render('Login', { error: 'Error en el servidor.', success: null, title: 'Login' });
            }

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
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.redirect('/login');
    });
});

// ============================
// 🐾 RUTAS AUTENTICADAS USUARIO
// ============================
server.get('/menu', authUser, (req, res) => {
    res.render('Menu', { title: 'Menú Principal', user: req.session.user, success: req.query.success || null });
});

server.get('/infoadopciones', authUser, (req, res) => {
    res.render('InfoAdopcion', { title: 'Adopciones', user: req.session.user });
});

// NUEVA RUTA que pediste para mostrar InfoDonaciones
server.get('/infodonaciones', authUser, (req, res) => {
    res.render('InfoDonaciones', { title: 'Donaciones', user: req.session.user });
});

// Formulario donaciones
server.get('/formdonacion', authUser, (req, res) => {
    res.render('FormularioDonaciones', { title: 'Donación', user: req.session.user });
});

// Acerca del albergue
server.get('/acerca', authUser, (req, res) => {
    res.render('AcercaDelAlbergue', { title: 'Acerca del Albergue' });
});

// ============================
// 🧑‍💻 PANEL ADMINISTRADOR
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
