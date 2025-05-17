// bd.js
const mysql = require('mysql2');

// Configuración de conexión
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'albergue',
    charset: 'utf8mb4'
});

// Conectar
db.connect(err => {
    if (err) {
        console.error('❌ Error de conexión a MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos MySQL');
});

// Funciones exportadas

function verificarCorreo(correo, callback) {
    db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], callback);
}

function registrarUsuario(usuario, callback) {
    const { nombre, direccion, telefono, correo, paswsword } = usuario;
    db.query(
        'INSERT INTO usuarios (nombre, direccion, telefono, correo, paswsword) VALUES (?, ?, ?, ?, ?)',
        [nombre, direccion, telefono, correo, paswsword],
        callback
    );
}

function loginUsuario(correo, paswsword, callback) {
    db.query('SELECT * FROM usuarios WHERE correo = ? AND paswsword = ?', [correo, paswsword], callback);
}

function loginAdmin(nombre, paswsword, callback) {
    db.query('SELECT * FROM administradores WHERE nombre = ? AND paswsword = ?', [nombre, paswsword], callback);
}

module.exports = {
    verificarCorreo,
    registrarUsuario,
    loginUsuario,
    loginAdmin
};
