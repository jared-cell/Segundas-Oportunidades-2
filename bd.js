<<<<<<< HEAD
const mysql = require('mysql2');

// Configuración de la conexión a la base de datos
const pool = mysql.createPool({
  host: 'localhost', // Cambia si tu base de datos no está en localhost
  user: 'root',      // Cambia al usuario correcto de tu base de datos
  password: '',      // Cambia a la contraseña correcta de tu base de datos
  database: 'albergue', // Cambia al nombre correcto de tu base de datos
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

// Manejo de errores en la conexión
pool.on('error', (err) => {
  console.error('Error en la conexión a la base de datos:', err.code, err.message);
});

// Función para ejecutar consultas a la base de datos
function query(sql, params = []) {
  return pool
    .promise()
    .query(sql, params)
    .then(([results]) => results)
    .catch((err) => {
      console.error('Error en consulta SQL:', err.message);
      throw err;
    });
}

// Funciones de usuarios
async function verificarCorreo(correo) {
  return query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
}

async function registrarUsuario({ nombre, direccion, telefono, correo, password }) {
  return query(
    `INSERT INTO usuarios (nombre, direccion, telefono, correo, password)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, direccion, telefono, correo, password]
  );
}

async function loginUsuario(correo, password) {
  return query(
    `SELECT * FROM usuarios WHERE correo = ? AND password = ?`,
    [correo, password]
  );
}

// Funciones de administrador
async function loginAdmin(nombre, password) {
  return query(
    `SELECT * FROM administradores WHERE nombre = ? AND password = ?`,
    [nombre, password]
  );
}

// Funciones de donaciones
async function registrarDonacion({ id_usuario, monto, metodoPago, material, materialOtro }) {
  if (!metodoPago) throw new Error("El campo 'metodoPago' es obligatorio.");

  return query(
    `INSERT INTO donaciones (id_usuario, monto, metodoPago, material, materialOtro)
     VALUES (?, ?, ?, ?, ?)`,
    [id_usuario || null, monto || null, metodoPago, material || '', materialOtro || '']
  );
}

// Funciones de reportes
async function registrarReporte({ id_usuario, tipodemaltrato, fecha, pruebas, pruebasOtro }) {
  const sql = `
    INSERT INTO reportes (id_usuario, tipodemaltrato, fecha, pruebas, pruebasOtro)
    VALUES (?, ?, ?, ?, ?)
  `;
  return query(sql, [id_usuario, tipodemaltrato, fecha, pruebas, pruebasOtro]);
}



// Funciones de perros
async function obtenerPerros() {
  return query('SELECT * FROM perros');
}

async function obtenerPerroPorId(id) {
  return query('SELECT * FROM perros WHERE id = ?', [id]);
}

// Exportación de funciones
=======
// ============================
// 🔌 CONEXIÓN A LA BASE DE DATOS
// ============================
const mysql = require('mysql2');

// Creación del pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'segundas_oportunidades',
  connectionLimit: 10,
});

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('Error en el pool de conexión:', err.code, err.message);
});

// Función utilitaria para consultas con Promesas
function asyncQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) {
        console.error('Error en la consulta SQL:', { sql, params, err });
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

// ============================
// 📦 FUNCIONES EXPORTADAS
// ============================

// 📌 Usuarios
async function verificarCorreo(correo) {
  const sql = 'SELECT * FROM usuarios WHERE correo = ?';
  return asyncQuery(sql, [correo]);
}

async function registrarUsuario({ nombre, direccion, telefono, correo, password }) {
  const sql = `
    INSERT INTO usuarios (nombre, direccion, telefono, correo, password)
    VALUES (?, ?, ?, ?, ?)
  `;
  return asyncQuery(sql, [nombre, direccion, telefono, correo, password]);
}

async function loginUsuario(correo) {
  const sql = 'SELECT * FROM usuarios WHERE correo = ?';
  return asyncQuery(sql, [correo]);
}

// 🛠️ Admins
async function loginAdmin(nombre) {
  const sql = 'SELECT * FROM admins WHERE nombre = ?';
  return asyncQuery(sql, [nombre]);
}

// 💸 Donaciones
async function registrarDonacion({
  id_usuario, monto, metodoPago,
  nombreTarjeta, numeroTarjeta, fechaVencimiento,
  cvv, material, materialOtro,
}) {
  const sql = `
    INSERT INTO donaciones (
      id_usuario, monto, metodoPago,
      nombreTarjeta, numeroTarjeta, fechaVencimiento,
      cvv, material, materialOtro
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return asyncQuery(sql, [
    id_usuario, monto, metodoPago,
    nombreTarjeta, numeroTarjeta, fechaVencimiento,
    cvv, material, materialOtro,
  ]);
}

async function obtenerDonaciones() {
  const sql = `
    SELECT d.*, u.nombre
    FROM donaciones d
    JOIN usuarios u ON d.id_usuario = u.id
    ORDER BY d.fecha DESC
  `;
  return asyncQuery(sql);
}

// 📢 Reportes
async function registrarReporte({ id_usuario, descripcion, ubicacion, foto }) {
  const sql = `
    INSERT INTO reportes (id_usuario, descripcion, ubicacion, foto)
    VALUES (?, ?, ?, ?)
  `;
  return asyncQuery(sql, [id_usuario, descripcion, ubicacion, foto]);
}

async function obtenerReportes() {
  const sql = `
    SELECT r.*, u.nombre
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id
    ORDER BY r.fecha DESC
  `;
  return asyncQuery(sql);
}

// 🐶 Perros
async function obtenerPerros() {
  const sql = 'SELECT * FROM perros WHERE adoptado = 0';
  return asyncQuery(sql);
}

async function obtenerPerroPorId(id) {
  const sql = 'SELECT * FROM perros WHERE id = ?';
  return asyncQuery(sql, [id]);
}

// 📋 Solicitudes de adopción
async function obtenerSolicitudes() {
  const sql = `
    SELECT s.*, u.nombre AS nombre_usuario, p.nombre AS nombre_perro
    FROM solicitudes_adopcion s
    JOIN usuarios u ON s.id_usuario = u.id
    JOIN perros p ON s.id_perro = p.id
    ORDER BY s.fecha DESC
  `;
  return asyncQuery(sql);
}

async function aprobarSolicitud(idSolicitud) {
  const sql = `
    UPDATE solicitudes_adopcion
    SET estado = 'Aprobada'
    WHERE id = ?
  `;
  return asyncQuery(sql, [idSolicitud]);
}

async function rechazarSolicitud(idSolicitud) {
  const sql = `
    UPDATE solicitudes_adopcion
    SET estado = 'Rechazada'
    WHERE id = ?
  `;
  return asyncQuery(sql, [idSolicitud]);
}

// ============================
// 📤 EXPORTACIONES
// ============================
>>>>>>> c001f92c18387878fd31110a8302fd268c3734e3
module.exports = {
  verificarCorreo,
  registrarUsuario,
  loginUsuario,
  loginAdmin,
  registrarDonacion,
<<<<<<< HEAD
  registrarReporte,
  obtenerPerros,
  obtenerPerroPorId,
=======
  obtenerDonaciones,
  registrarReporte,
  obtenerReportes,
  obtenerPerros,
  obtenerPerroPorId,
  obtenerSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
>>>>>>> c001f92c18387878fd31110a8302fd268c3734e3
};
