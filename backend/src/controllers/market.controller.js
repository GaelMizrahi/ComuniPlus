export const marketHandler = (operation) => async (req, res) => {
  try {
    const result = await operation(req);
    res.json(result);
  } catch (error) {
    const status = error.statusCode ?? ({ P0002: 404, '42501': 403, '23505': 409, P0001: 409, '22023': 400 }[error.code]) ?? 500;
    res.status(status).json({ message: status === 500 ? 'No se pudo completar la operación de Mercado' : error.message });
  }
};
