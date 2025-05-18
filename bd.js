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
module.exports = {
  verificarCorreo,
  registrarUsuario,
  loginUsuario,
  loginAdmin,
  registrarDonacion,
  obtenerDonaciones,
  registrarReporte,
  obtenerReportes,
  obtenerPerros,
  obtenerPerroPorId,
  obtenerSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
};
