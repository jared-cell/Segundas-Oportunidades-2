// ... OMITIDO POR BREVEDAD (las importaciones y configuración inicial) ...

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