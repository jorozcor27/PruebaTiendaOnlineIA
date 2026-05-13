const express = require('express');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE LA BASE DE DATOS
// Para LocalDB es necesario especificar un Driver ODBC moderno o el Native Client
const dbConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=PortalCorporativoDB;Trusted_Connection=yes;'
};

// Intentar conexión inicial
sql.connect(dbConfig).then(pool => {
    if (pool.connected) {
        console.log("✅ Conectado exitosamente a SQL Server");
    }
}).catch(err => {
    console.error("❌ Error conectando a SQL Server:", err.message);
});

// 1. ENDPOINT: INICIO DE SESIÓN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query(`
                SELECT u.Id as id, u.Nombre as nombre, u.Email as email, r.NombreRol as rol 
                FROM Usuarios u
                INNER JOIN Roles r ON u.RolId = r.Id
                WHERE u.Email = @email AND u.Password = @password
            `);

        if (result.recordset.length > 0) {
            res.json({ success: true, user: result.recordset[0] });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 2. ENDPOINT: OBTENER TODOS LOS USUARIOS (Para el CRUD)
app.get('/api/usuarios', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT u.Id as id, u.Nombre as nombre, u.Email as email, r.NombreRol as rol 
            FROM Usuarios u
            INNER JOIN Roles r ON u.RolId = r.Id
            ORDER BY u.Id ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. ENDPOINT: CREAR USUARIO
app.post('/api/usuarios', async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        const pool = await sql.connect(dbConfig);

        // Primero obtenemos el ID del Rol basado en su nombre
        const rolResult = await pool.request()
            .input('nombreRol', sql.NVarChar, rol)
            .query('SELECT Id FROM Roles WHERE NombreRol = @nombreRol');

        if (rolResult.recordset.length === 0) return res.status(400).json({ error: 'Rol no válido' });
        const rolId = rolResult.recordset[0].Id;

        // Validar si el email ya existe
        const emailCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT Id FROM Usuarios WHERE Email = @email');

        if (emailCheck.recordset.length > 0) return res.status(400).json({ error: 'El correo ya está registrado' });

        await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .input('rolId', sql.Int, rolId)
            .query('INSERT INTO Usuarios (Nombre, Email, Password, RolId) VALUES (@nombre, @email, @password, @rolId)');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 4. ENDPOINT: ACTUALIZAR USUARIO
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, password, rol } = req.body;
        const pool = await sql.connect(dbConfig);

        // Obtener ID del rol
        const rolResult = await pool.request()
            .input('nombreRol', sql.NVarChar, rol)
            .query('SELECT Id FROM Roles WHERE NombreRol = @nombreRol');
        const rolId = rolResult.recordset[0].Id;

        const request = pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar, nombre)
            .input('email', sql.NVarChar, email)
            .input('rolId', sql.Int, rolId);

        // Si se envió contraseña nueva, se actualiza. Si no, se mantiene la antigua
        if (password && password.trim() !== '') {
            request.input('password', sql.NVarChar, password);
            await request.query('UPDATE Usuarios SET Nombre = @nombre, Email = @email, RolId = @rolId, Password = @password WHERE Id = @id');
        } else {
            await request.query('UPDATE Usuarios SET Nombre = @nombre, Email = @email, RolId = @rolId WHERE Id = @id');
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 5. ENDPOINT: ELIMINAR USUARIO
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Usuarios WHERE Id = @id');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
