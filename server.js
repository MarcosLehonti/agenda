const app = require('./src/app');
const sequelize = require('./src/config/database');
const { startCron } = require('./src/services/notificationCron');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Probar conexión a BD
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Sincronizar modelos (crear tablas si no existen)
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados con la base de datos.');

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      startCron();
    });
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error);
  }
}

startServer();
