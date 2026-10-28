import { hashPassword, verifyPassword, isLegacyPassword } from '../utils/passwords.js';
import { getFullName } from '../utils/helpers.js';

const fail = (statusCode, message, code) => { throw Object.assign(new Error(message), { statusCode, code }); };
const id = (value) => {
  if (!/^[1-9]\d*$/.test(String(value ?? '')) || !Number.isSafeInteger(Number(value))) fail(400, 'Identificador inválido');
  return Number(value);
};

export function normalizeEmail(value) {
  if (typeof value !== 'string') fail(400, 'Ingresá un email válido');
  const email = value.trim().toLowerCase();
  const parts = email.split('@');
  if (email.length > 254 || parts.length !== 2) fail(400, 'Ingresá un email válido');
  const [local, domain] = parts;
  if (!local || local.length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
      domain.split('.').length < 2 || !domain.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/[a-z]/.test(domain.split('.').at(-1))) fail(400, 'Ingresá un email válido');
  return email;
}

export function registrationData(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Completá los datos del registro');
  const name = (value, label) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) fail(400, `${label} es obligatorio y admite hasta 80 caracteres`);
    return value.trim();
  };
  const phone = typeof body.phone === 'string' ? body.phone.replace(/[()\s-]/g, '') : '';
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) fail(400, 'Ingresá el teléfono con código de país, por ejemplo +5491123456789');
  if (!/^\d{1,15}$/.test(String(body.membershipNumber ?? ''))) fail(400, 'Ingresá un número de socio de hasta 15 dígitos');
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128 || Buffer.byteLength(body.password) > 512 || !body.password.trim()) fail(400, 'La contraseña debe tener entre 12 y 128 caracteres');
  if (body.password !== body.confirmPassword) fail(400, 'Las contraseñas no coinciden');
  return {
    firstName: name(body.firstName, 'El nombre'), lastName: name(body.lastName, 'El apellido'), email: normalizeEmail(body.email),
    phone: phone.slice(1), membershipNumber: String(body.membershipNumber), communityId: id(body.communityId), password: body.password
  };
}

export function createRegistrationService(repo, { hash = hashPassword } = {}) {
  const member = async (claims) => {
    id(claims?.idUsuario); id(claims?.idComunidad); id(claims?.idComunidadUsuario);
    const result = await repo.membership(claims);
    if (!result) fail(403, 'Tu membresía no está activa');
    return result;
  };
  const admin = async (claims) => {
    const result = await member(claims);
    if (!(await repo.isAdmin(result))) fail(403, 'Solo los administradores de esta comunidad pueden gestionar solicitudes');
    return result;
  };
  return {
    communities: () => repo.communities(),
    register: async (body) => {
      const data = registrationData(body);
      if (!(await repo.community(data.communityId))) fail(400, 'La comunidad elegida no existe');
      const passwordHash = await hash(data.password);
      const { password, ...safe } = data;
      await repo.register({ ...safe, passwordHash });
      return { ok: true, message: 'Tu cuenta fue creada y la solicitud está pendiente de aprobación. Podrás ingresar cuando el administrador te acepte.' };
    },
    permissions: async (claims) => ({ isAdmin: await repo.isAdmin(await member(claims)) }),
    pending: async (claims) => {
      const actor = await admin(claims);
      return (await repo.pending(actor)).map((row) => ({
        id: row.id, membershipNumber: row.nroSocio, requestedAt: row.fechaSolicitud,
        fullName: getFullName(row.usuario), email: row.usuario?.mail, phone: String(row.usuario?.telefono ?? '')
      }));
    },
    decide: async (claims, requestId, action) => {
      const actor = await admin(claims);
      if (!['aprobar', 'rechazar'].includes(action)) fail(400, 'Elegí aprobar o rechazar');
      await repo.decide(actor, id(requestId), action === 'aprobar');
      return { ok: true, message: action === 'aprobar' ? 'Solicitud aprobada. La persona ya puede iniciar sesión.' : 'Solicitud rechazada.' };
    }
  };
}

export function createLoginService(repo, { signToken, hash = hashPassword, verify = verifyPassword } = {}) {
  return async (email, password) => {
    const normalized = normalizeEmail(email);
    if (typeof password !== 'string' || !password || password.length > 128 || Buffer.byteLength(password) > 512) fail(400, 'Ingresá mail y contraseña');
    const user = await repo.userByEmail(normalized);
    if (!(await verify(password, user?.contraseña)) || !user) fail(401, 'Credenciales inválidas');
    if (isLegacyPassword(user.contraseña)) {
      if (!(await repo.upgradePassword(user.id, user.contraseña, await hash(user.contraseña.trim())))) fail(401, 'La contraseña cambió. Intentá ingresar de nuevo');
    }
    const memberships = await repo.memberships(user.id);
    const membership = memberships.find((row) => row.aceptado && !row.rechazado);
    if (!membership) {
      if (memberships.some((row) => !row.aceptado && !row.rechazado)) fail(403, 'Tu solicitud está pendiente de aprobación del administrador.', 'REGISTRATION_PENDING');
      if (memberships.some((row) => row.rechazado)) fail(403, 'Tu solicitud fue rechazada. Contactá al administrador de la comunidad.', 'REGISTRATION_REJECTED');
      fail(403, 'Tu cuenta no tiene una comunidad habilitada. Contactá al administrador.');
    }
    const community = await repo.community(membership.idComunidad);
    if (!community) fail(403, 'La comunidad no está disponible');
    const payload = {
      idUsuario: user.id, mail: user.mail, nombre: user.nombre, apellido: user.apellido, telefono: user.telefono,
      idComunidad: membership.idComunidad, idComunidadUsuario: membership.id, nroSocio: membership.nroSocio
    };
    return {
      ok: true, message: 'Login correcto', token: signToken(payload),
      user: { ...payload, id: user.id, email: user.mail, fullName: getFullName(user), communityId: membership.idComunidad,
        comunidadUsuarioId: membership.id, community: community.nombre, foto: membership.foto ?? null,
        isAdmin: await repo.isAdmin(membership) }
    };
  };
}

export function createSessionService(repo) {
  return async (claims) => {
    const member = await repo.membership(claims);
    if (!member) fail(401, 'Tu membresía no está activa. Volvé a ingresar.');
    const [user, memberships, community] = await Promise.all([
      repo.userById(claims.idUsuario), repo.memberships(claims.idUsuario), repo.community(member.idComunidad)
    ]);
    const membership = memberships.find((row) => row.id === member.id && row.aceptado && !row.rechazado);
    if (!user || !membership || !community) fail(401, 'Tu sesión ya no está disponible. Volvé a ingresar.');
    return {
      id: user.id, idUsuario: user.id, nombre: user.nombre, apellido: user.apellido,
      mail: user.mail, email: user.mail, telefono: user.telefono, fullName: getFullName(user),
      idComunidad: membership.idComunidad, communityId: membership.idComunidad, community: community.nombre,
      idComunidadUsuario: membership.id, comunidadUsuarioId: membership.id, nroSocio: membership.nroSocio,
      foto: membership.foto ?? null, isAdmin: await repo.isAdmin(membership)
    };
  };
}
