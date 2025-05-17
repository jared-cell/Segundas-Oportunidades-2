const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // tu contraseña
    database: 'Alverge'
});

db.connect(err => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err);
    } else {
        console.log('✅ Conexión a la base de datos exitosa');
    }
});

function verificarCorreo(correo, callback) {
    db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], callback);
}

function registrarUsuario({ nombre, direccion, telefono, correo, password }, callback) {
    db.query(
        'INSERT INTO usuarios (nombre, direccion, telefono, correo, password) VALUES (?, ?, ?, ?, ?)',
        [nombre, direccion, telefono, correo, password],
        callback
    );
}

function loginUsuario(correo, password, callback) {
    db.query(
        'SELECT * FROM usuarios WHERE correo = ? AND password = ?',
        [correo, password],
        callback
    );
}

function loginAdmin(nombre, password, callback) {
    db.query(
        'SELECT * FROM administradores WHERE nombre = ? AND password = ?',
        [nombre, password],
        callback
    );
}

module.exports = {
    verificarCorreo,
    registrarUsuario,
    loginUsuario,
    loginAdmin
};