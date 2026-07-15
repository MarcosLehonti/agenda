const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decodificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Agregar el usuario a la request
      req.user = decoded; // { id: ... }

      return next();
    } catch (error) {
      console.error('Error de JWT:', error.message);
      return res.status(401).json({ success: false, message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    console.error('No se recibió token en los headers');
    return res.status(401).json({ success: false, message: 'No autorizado, no hay token' });
  }
};

module.exports = { protect };
