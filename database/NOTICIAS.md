# Noticias del club

Inicio muestra **Noticias debajo de Consultas y encima de Cerrar sesión**. Se quitó
la tarjeta con avatares y cantidades ficticias de socios. Cada miembro aceptado lee
las noticias de la comunidad de su sesión, abre el detalle y carga más páginas.
La API revalida su membresía; un ID de otro club devuelve 404.

Solo un administrador vinculado a una membresía aceptada del mismo club puede
publicar o eliminar noticias. El formulario exige título (5–140 caracteres), texto
(20–8000) y una imagen JPEG/PNG/WebP de hasta 5 MB, con vista previa. La comunidad y
el autor se toman del servidor, aunque el cliente intente enviar otros valores.
El backend y las RPC comprueban el rol; no depende de esconder el botón.
Eliminar conserva el registro con eliminadoEn y trata de quitar la imagen del bucket.
No se agregó edición ni programación de noticias.

## Aplicar en Supabase

1. Actualizar el código del backend y frontend después de fusionar la PR en UXUAI.V2.
2. Ejecutar **noticias_migration.sql** como propietario en SQL Editor. Agrega Noticia,
   índices y RPC, activa RLS y restringe el acceso directo de clientes. Es repetible y
   no borra filas ni cambia roles existentes.
3. Ejecutar **noticias_demo_seed.sql**. Carga tres ejemplos para cada uno de los siete
   clubes ya cargados: Ferro, CISSAB, Boca, Hebraica, River, Macabi y Hacoaj. Deben
   aparecer siete filas con noticias_demo=3. No hace falta repetir el seed de usuarios.
4. Ejecutar noticias_preflight.sql: todos los indicadores deben ser true.
5. Reiniciar backend y Vite (o desplegar la versión actualizada en Render), volver a
   ingresar y abrir Noticias desde Inicio.

Los ejemplos se guardan en la base, no se mezclan en una lista global del frontend.
Utilizan los escudos enviados como imagen y la etiqueta **Ejemplo de demo**; sus
textos aclaran que no anuncian actividades reales. El seed se puede repetir sin
duplicar filas, restaurar noticias eliminadas ni sobrescribir contenido modificado.
No crea clubes, usuarios ni administradores. Si falta un club o hay varias
coincidencias por nombre, se detiene sin una carga parcial.

Las 70 cuentas de socio de la demo siguen sin rol de administrador. Para probar
publicación, usar una cuenta ya autorizada. Si Administrador.idComunidadUsuario está
vacío, vincular explícitamente a la persona autorizada y a su comunidad siguiendo
REGISTRO.md; no elegir al primer socio automáticamente. Un administrador puede
eliminar cualquier noticia de su club, incluidas las de demo.

## Imágenes privadas

El bucket **noticias** es privado. El backend genera rutas con el club y la membresía
y entrega enlaces firmados de cinco minutos después de autorizar la lectura.
Anon/authenticated no pueden leer ni escribir ese bucket, incluso si otra política
de Storage era permisiva. Los escudos de los ejemplos siguen siendo archivos públicos
del frontend, como ya eran antes. No se requieren nuevas claves o proveedores.

Si la escritura en base rechaza definitivamente una publicación, el backend limpia
el archivo recién subido. Una respuesta de red perdida puede dejar un archivo
huérfano: se conserva por si la transacción confirmó; no se borra un archivo que
podría estar referenciado. Una limpieza posterior requiere revisar Noticia.imagenPath.
Si falla la eliminación de Storage, queda pendiente de limpieza aunque el registro
ya no sea visible. No se ejecutó SQL ni se subieron imágenes a tu Supabase remoto
desde este entorno.

## Pruebas

Desde la raíz del repositorio, con runtimes externos y Vite en 127.0.0.1:5173 como
se documenta en DEMO.md y CLUBES_DEMO.md:

```bash
node --test backend/test/news.test.mjs
PGLITE_MODULE=/workspace/clubes-test-tools/node_modules/@electric-sql/pglite/dist/index.js node --test database/noticias.test.mjs
BACKEND_RUNTIME=/workspace/comuniplus-runtime/backend node --test backend/test/community.http.test.mjs
PLAYWRIGHT_MODULE=/workspace/clubes-test-tools/node_modules/playwright/index.mjs node frontend/test/noticias.browser.mjs
```

SQL: migración repetida, permisos, acceso privado a Storage, RPC por administrador y
21 ejemplos idempotentes. HTTP: Express/JWT/cliente Supabase contra stub para membresía,
rol, aislamiento e imagen firmada. Navegador: ubicación en Inicio, socio sin controles
admin, detalle, imagen/vista previa, doble envío, publicación, eliminación y otro club.
Las pruebas usan datos aislados/simulados; después de aplicar los scripts, comprobar
el flujo también con dos clubes y un administrador real en tu Supabase.
