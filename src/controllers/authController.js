const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: result
    });
  } catch (error) {
    // Para simplificar, devolvemos 401 si es un error de credenciales
    if (error.message === 'Credenciales inválidas.') {
      return res.status(401).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  register,
  login,
};
