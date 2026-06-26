import { login } from '../services/auth.service.js';

export async function loginHandler(req, res) {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error en login' : error.message;
    const body = status === 500 ? { message, detail: error.message } : { message };
    res.status(status).json(body);
  }
}
