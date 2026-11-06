# Clubes, logos y usuarios de demo

La carga prepara 7 clubes y 10 socios ficticios para cada uno: Ferro Carril Oeste,
CISSAB, Boca Juniors, Sociedad Hebraica Argentina, River Plate, Macabi y
Club Náutico Hacoaj. No son cuentas de personas reales.

## Logos

Los escudos se guardan como archivos del frontend en `frontend/public/club-logos`.
Se publican junto con la app en Render; Supabase guarda la referencia en
`Comunidad.logoUrl`. No hace falta abrir un bucket ni dar permisos de escritura al
navegador. Se incorporaron los archivos enviados en el ZIP: `ferro.jpg`, `cissab.png`,
`boca-juniors.png`, `hebraica.png`, `river-plate.png`, `macabi.jpg` y `hacoaj.png`.
Se conservaron sus bytes y formatos; solo se normalizaron los nombres de Ferro y
Hebraica. No se inventaron ni redibujaron escudos.

El logo se muestra al elegir una comunidad en Registro y, después de ingresar, en
la cabecera, Inicio y Perfil. Las comunidades antiguas sin logo muestran sus iniciales
con la indicación “Logo pendiente”; un archivo roto también tiene ese reemplazo.
No se confunden con la foto personal del socio.

La migración exige un logo para comunidades nuevas y para las que se modifiquen.
Admite rutas `/club-logos/nombre.png|jpg|jpeg|webp|svg` o URLs HTTPS. Las comunidades
anteriores se conservan para completar sus logos sin interrumpir el login.
El check obliga a guardar una referencia válida; no puede comprobar por sí solo
que el archivo remoto exista ni que la imagen sea el escudo correcto.

## Ejecutar en Supabase

1. Tener aplicada `registro_migration.sql`, como se explica en `REGISTRO.md`.
2. Incorporar los archivos de los escudos y actualizar el frontend/backend.
3. Ejecutar **`clubes_logos_migration.sql`** en SQL Editor como propietario.
4. Ejecutar **`clubes_demo_seed.sql`**. El resultado debe mostrar los 7 clubes con
   10 usuarios de demo por club. Toda la carga ocurre en una transacción.

Si ya existe un club con alguno de sus nombres habituales, se reutiliza su ID y se
completa el logo únicamente si estaba vacío. No se cambian sus nombres ni logos
existentes. Si hay varias coincidencias, se detiene para revisión; no se fusionan.
Para otra escritura del nombre, agregarla a los aliases del generador y regenerar.

Los nuevos socios de demo quedan aceptados para poder probar el ingreso. **No reciben
permisos de administrador.** El registro público normal sigue exigiendo aprobación.
La carga se puede repetir: no duplica socios, no resetea claves ni vuelve a aceptar
cuentas rechazadas/revocadas. Si un email de demo pertenece a otra cuenta o una cuenta
de demo está en otra comunidad, se detiene sin modificarla.

## Accesos de prueba

Los emails utilizan el dominio reservado `demo.example.com`, por ejemplo:

| Club | Primer socio | Último socio |
| --- | --- | --- |
| Ferro | `ferro.socio01@demo.example.com` | `ferro.socio10@demo.example.com` |
| CISSAB | `cissab.socio01@demo.example.com` | `cissab.socio10@demo.example.com` |
| Boca Juniors | `boca-juniors.socio01@demo.example.com` | `boca-juniors.socio10@demo.example.com` |
| Hebraica | `hebraica.socio01@demo.example.com` | `hebraica.socio10@demo.example.com` |
| River Plate | `river-plate.socio01@demo.example.com` | `river-plate.socio10@demo.example.com` |
| Macabi | `macabi.socio01@demo.example.com` | `macabi.socio10@demo.example.com` |
| Hacoaj | `hacoaj.socio01@demo.example.com` | `hacoaj.socio10@demo.example.com` |

**Contraseña compartida de demo: `ComuniDemo2026!`.** Es pública y solo sirve para
estas cuentas ficticias. Cada contraseña se almacena con scrypt y una sal aleatoria
distinta, compatible con el login actual. No se almacenan claves nuevas en texto plano.
Los teléfonos son números ficticios del rango reservado +1 202-555-0100 a 0169;
no se enviaron mensajes ni se verificó titularidad. Los números de socio parten de
900001 y difieren por club.

No usar estas cuentas para datos personales ni darles roles privilegiados. Para una
demo pública, conservar solo información ficticia. Este script no borra cuentas.

## Reproducir y probar

```bash
# Genera los hashes en Node; no conecta con Supabase ni usa secretos.
node database/generar_clubes_demo.mjs
node --test backend/test/registration.test.mjs
PGLITE_MODULE=/workspace/clubes-test-tools/node_modules/@electric-sql/pglite/dist/index.js node --test database/clubes_demo.test.mjs
```

El generador cambia las sales del archivo SQL al volver a generarlo; al ejecutar ese
SQL contra una base ya cargada se preservan los hashes existentes.
La prueba de PostgreSQL aislado comprueba repetición, rollback, reutilización de
clubes, aprobación inicial de demo, hashes y exigencia del logo. Los escudos reales
deben revisarse también en navegador cuando estén incorporados.
