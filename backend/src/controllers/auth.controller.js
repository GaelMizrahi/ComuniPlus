
import { login, register } from '../services/auth.service.js';

export async function loginHandler(req, res) {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error en login' : error.message;
    const body = status === 500
      ? { message, detail: error.message }
      : { message };

    res.status(status).json(body);
  }
}

export async function registerHandler(req, res) {
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      telefono,
      idComunidad,
      nroSocio
    } = req.body;

    const result = await register({
      nombre,
      apellido,
      email,
      password,
      telefono,
      idComunidad,
      nroSocio
    });

    res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500
      ? 'Error en el registro'
      : error.message;

    res.status(status).json({ message });
  }
}
