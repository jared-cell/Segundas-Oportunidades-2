// server.js
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const server = express(); // ← Cambio aquí

// Configurar EJS como motor de vistas
server.set('view engine', 'ejs');
server.set('views', path.join(__dirname, 'views'));

// Middleware
server.use(express.static(path.join(__dirname, 'public')));
server.use(express.urlencoded({ extended: false })); // body-parser ya viene incluido

// Conexión a MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'albergue'
});

db.connect(err => {
    if (err) {
        console.error('❌ Error de conexión a MySQL:', err.message);
        process.exit(1); // Finaliza el servidor si falla la conexión
    }
    console.log('✅ Conectado a la base de datos MySQL');
});

// Ruta principal: mostrar login
server.get('/', (req, res) => {
    res.render('login', { error: null });
});

// Ruta para procesar login
server.post('/login', (req, res) => {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
        return res.render('login', { error: 'Por favor, complete todos los campos.' });
    }

    // Verificar si es administrador
    db.query(
        'SELECT * FROM administradores WHERE correo = ? AND contraseña = ?',
        [correo, contraseña],
        (err, adminResults) => {
            if (err) {
                console.error('❌ Error al consultar administradores:', err);
                return res.render('login', { error: 'Error en el servidor.' });
            }

            if (adminResults.length > 0) {
                return res.redirect('/admin_dashboard');
            }

            // Verificar si es usuario
            db.query(
                'SELECT * FROM usuarios WHERE correo = ? AND contraseña = ?',
                [correo, contraseña],
                (err, userResults) => {
                    if (err) {
                        console.error('❌ Error al consultar usuarios:', err);
                        return res.render('login', { error: 'Error en el servidor.' });
                    }

                    if (userResults.length > 0) {
                        return res.redirect('/menu');
                    } else {
                        return res.render('login', { error: 'Correo o contraseña incorrectos.' });
                    }
                }
            );
        }
    );
});

// Rutas simuladas
server.get('/admin_dashboard', (req, res) => {
    res.send('<h1>Bienvenido al panel de administración</h1>');
});

server.get('/menu', (req, res) => {
    res.send('<h1>Bienvenido al menú de usuario</h1>');
});

// Iniciar el servidor
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
});
