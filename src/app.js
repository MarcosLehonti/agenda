const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173', // Para cuando desarrolles localmente
    'https://agenda-frontend-wine.vercel.app' // Para producción en Vercel
  ],
  credentials: true
}));
app.use(express.json());

// Routes (We will add these soon)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

module.exports = app;
