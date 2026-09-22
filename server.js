require('dotenv').config();

const express = require('express');
const conexion = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

const autenticarToken = (req, res, next) => {
    const encabezado = req.headers['authorization'];

    if (!encabezado) {
        return res.status(401).json({
            mensaje: 'Token no proporcionado'
        });
    }

    const partes = encabezado.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({
            mensaje: 'Formato de token inválido'
        });
    }

    const token = partes[1];

    jwt.verify(token, process.env.JWT_SECRET, (error, usuario) => {
        if (error) {
            return res.status(403).json({
                mensaje: 'Token inválido o expirado'
            });
        }

        req.usuario = usuario;

        next();
    });
};

app.use(express.json());
let notas = [
    {
        id: 1,
        titulo: 'Primera nota',
        contenido: 'Esta es mi primera nota'
    }
];
const PORT = 3000;

app.post('/api/registro', async (req, res) => {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({
            mensaje: 'Todos los campos son obligatorios'
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
        INSERT INTO usuarios (nombre, email, password)
        VALUES (?, ?, ?)
    `;

    conexion.query(
        sql,
        [nombre, email, passwordHash],
        (error, resultado) => {
            if (error) {
                console.error('Error al registrar usuario:', error);

                return res.status(500).json({
                    mensaje: 'Error al registrar usuario'
                });
            }

            res.status(201).json({
                mensaje: 'Usuario registrado correctamente',
                id: resultado.insertId
            });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            mensaje: 'Email y contraseña son obligatorios'
        });
    }

    const sql = 'SELECT * FROM usuarios WHERE email = ?';

    conexion.query(sql, [email], async (error, resultados) => {
        if (error) {
            console.error('Error al buscar usuario:', error);

            return res.status(500).json({
                mensaje: 'Error en el servidor'
            });
        }

        if (resultados.length === 0) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        const usuario = resultados[0];

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '2h'
            }
        );

        res.json({
            mensaje: 'Login exitoso',
            token: token,
            usuario_id: usuario.id
        });
    }); 
});

app.get('/api/notas', autenticarToken, (req, res) => {
  const sql = 'SELECT * FROM notas WHERE usuario_id = ?';

conexion.query(sql, [req.usuario.id], (error, resultados) => {
        if (error) {
            console.error('Error al consultar las notas:', error);

            return res.status(500).json({
                mensaje: 'Error al consultar las notas'
            });
        }

        res.json(resultados);
    });
});

app.post('/api/notas', autenticarToken, (req, res) => {
    const { titulo, contenido } = req.body;

    const usuario_id = req.usuario.id;

    const sql = `
        INSERT INTO notas (titulo, contenido, usuario_id)
        VALUES (?, ?, ?)
    `;

    conexion.query(
        sql,
        [titulo, contenido, usuario_id],
        (error, resultado) => {
            if (error) {
                console.error('Error al guardar la nota:', error);

                return res.status(500).json({
                    mensaje: 'Error al guardar la nota'
                });
            }

            res.status(201).json({
                id: resultado.insertId,
                titulo: titulo,
                contenido: contenido,
                usuario_id: usuario_id
            });
        }
    );
});
app.put('/api/notas/:id', autenticarToken, (req, res) => {
    const id = parseInt(req.params.id);
    const { titulo, contenido } = req.body;

    const sql = `
    UPDATE notas
    SET titulo = ?, contenido = ?
    WHERE id = ? AND usuario_id = ?
`;

    conexion.query(
        sql,
       [titulo, contenido, id, req.usuario.id],
        (error, resultado) => {
            if (error) {
                console.error('Error al actualizar la nota:', error);

                return res.status(500).json({
                    mensaje: 'Error al actualizar la nota'
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensaje: 'Nota no encontrada'
                });
            }

            res.json({
                id: id,
                titulo: titulo,
                contenido: contenido
            });
        }
    );
});
app.delete('/api/notas/:id', autenticarToken, (req, res) => {
    const id = parseInt(req.params.id);

    const sql = 'DELETE FROM notas WHERE id = ? AND usuario_id = ?';

    conexion.query(
    sql,
    [id, req.usuario.id],
    (error, resultado) => {
        if (error) {
            console.error('Error al eliminar la nota:', error);

            return res.status(500).json({
                mensaje: 'Error al eliminar la nota'
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Nota no encontrada'
            });
        }

        res.json({
            mensaje: 'Nota eliminada correctamente',
            id: id
        });
    });
});
app.get('/', (req, res) => {
    res.send('API de notas funcionando correctamente 🚀');
});
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
