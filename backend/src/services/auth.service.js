
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { jwtSecret } from '../config/index.js';
import {
  findUserByEmail,
  getAcceptedMembershipByUserId,
  findCommunityById,
  createUser,
  createMembership
} from '../repositories/user.repository.js';
import { getFullName } from '../utils/helpers.js';

export async function register({
  nombre,
  apellido,
  email,
  password,
  telefono,
  idComunidad,
  nroSocio
}) {
  if (
    !nombre?.trim() ||
    !apellido?.trim() ||
    !email?.trim() ||
    !password ||
    !telefono?.trim() ||
    !idComunidad
  ) {
    const err = new Error('Completá todos los campos obligatorios');
    err.statusCode = 400;
    throw err;
  }

  if (password.length < 8) {
    const err = new Error('La contraseña debe tener al menos 8 caracteres');
    err.statusCode = 400;
    throw err;
  }

  const emailNormalizado = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(emailNormalizado);

  if (existingUser) {
    const err = new Error('Ese email ya está registrado');
    err.statusCode = 409;
    throw err;
  }

  const community = await findCommunityById(Number(idComunidad));

  if (!community) {
    const err = new Error('La comunidad seleccionada no existe');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await createUser({
    nombre,
    apellido,
    email: emailNormalizado,
    password: hashedPassword,
    telefono
  });

  try {
    await createMembership({
      idUsuario: user.id,
      idComunidad: Number(idComunidad),
      nroSocio
    });
  } catch (error) {
    console.error('Error creando la membresía:', error);
    const err = new Error(
      'Se creó el usuario, pero no se pudo vincular a la comunidad. Contactá al administrador.'
    );
    err.statusCode = 500;
    throw err;
  }

  return {
    ok: true,
    message: 'Registro exitoso. Tu membresía debe ser aprobada antes de ingresar.',
    user: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      mail: user.mail,
      telefono: user.telefono,
      idComunidad: Number(idComunidad),
      comunidad: community.nombre,
      nroSocio: nroSocio || null
    }
  };
}

export async function login(email, password) {
  if (!email || !password) {
    const err = new Error('Ingresá mail y contraseña');
    err.statusCode = 400;
    throw err;
  }

  const user = await findUserByEmail(email);

  if (!user) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  const storedPassword = String(user.contraseña ?? '').trim();

  // Compatibilidad temporal con usuarios antiguos.
  const isHashed = storedPassword.startsWith('$2');
  const validPassword = isHashed
    ? await bcrypt.compare(password, storedPassword)
    : storedPassword === password;

  if (!validPassword) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  // Actualiza la contraseña antigua al formato seguro al iniciar sesión.
  if (!isHashed) {
    const newHash = await bcrypt.hash(password, 10);
    const { updateUserPassword } = await import(
      '../repositories/user.repository.js'
    );
    await updateUserPassword(user.id, newHash);
  }

  const membership = await getAcceptedMembershipByUserId(user.id);
  const community = await findCommunityById(membership.idComunidad);

  if (!community) {
    const err = new Error('Comunidad no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const tokenPayload = {
    idUsuario: user.id,
    mail: user.mail,
    nombre: user.nombre,
    apellido: user.apellido,
    telefono: user.telefono,
    idComunidad: membership.idComunidad,
    idComunidadUsuario: membership.id,
    nroSocio: membership.nroSocio
  };

  const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });

  return {
    ok: true,
    message: 'Login correcto',
    token,
    user: {
      id: user.id,
      idUsuario: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      mail: user.mail,
      email: user.mail,
      telefono: user.telefono,
      fullName: getFullName(user),
      idComunidad: membership.idComunidad,
      communityId: membership.idComunidad,
      idComunidadUsuario: membership.id,
      comunidadUsuarioId: membership.id,
      nroSocio: membership.nroSocio,
      community: community.nombre
    }
  };
}
