export const clubHandler = (operation, status = 200) => async (req, res) => {
  try { res.status(status).json(await operation(req)); }
  catch (error) {
    const code = error.statusCode ?? ({'23505':409,'23503':400,'23514':400}[error.code]) ?? 500;
    res.status(code).json({ message: code >= 500 ? 'No se pudo completar la operación del club' : error.code === '23505' ? 'La operación ya fue registrada' : error.message });
  }
};
