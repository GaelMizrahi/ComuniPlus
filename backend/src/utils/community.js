export function positiveId(value) {
  if (!/^[1-9]\d*$/.test(String(value ?? '')) || !Number.isSafeInteger(Number(value))) {
    throw Object.assign(new Error('Identificador inválido'), { statusCode: 400 });
  }
  return Number(value);
}
export function notFound(message) { throw Object.assign(new Error(message), { statusCode: 404 }); }
