const mysql = require('mysql2');

const conexion = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'yamilemontes29',
    database: 'tarea1_notas'
});

conexion.connect((error) => {
    if (error) {
        console.error('Error al conectar con MySQL:', error);
        return;
    }

    console.log('Conexión con MySQL exitosa');
});
module.exports = conexion;