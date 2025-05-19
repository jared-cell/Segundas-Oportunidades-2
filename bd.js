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
module.exports = {
  verificarCorreo,
  registrarUsuario,
  loginUsuario,
  loginAdmin,
  registrarDonacion,
  registrarReporte,
  obtenerPerros,
  obtenerPerroPorId,
};
