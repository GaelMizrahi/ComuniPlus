CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public."Comunidad" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,nombre text NOT NULL,tipo text NOT NULL DEFAULT 'otro');
CREATE TABLE public."Usuario" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,nombre text NOT NULL,apellido text NOT NULL,mail text NOT NULL,"contraseña" text NOT NULL,telefono bigint NOT NULL);
CREATE TABLE public."ComunidadUsuario" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidad" bigint NOT NULL REFERENCES public."Comunidad", "idUsuario" bigint NOT NULL REFERENCES public."Usuario",aceptado boolean NOT NULL,"nroSocio" bigint NOT NULL,foto text,UNIQUE(id,"idComunidad"));
CREATE TABLE public."Administrador" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidad" bigint NOT NULL REFERENCES public."Comunidad","idComunidadUsuario" bigint,FOREIGN KEY("idComunidadUsuario","idComunidad") REFERENCES public."ComunidadUsuario"(id,"idComunidad"));
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC,anon,authenticated;
INSERT INTO public."Comunidad" (nombre) VALUES ('Comunidad A'),('Comunidad B');
INSERT INTO public."Usuario" (nombre,apellido,mail,"contraseña",telefono) VALUES
 ('Admin','A',' ADMIN@EXAMPLE.COM ','anterior',5491100000001),('Admin','B','adminb@example.com','anteriorb',5491100000002),('Miembro','A','miembro@example.com','anteriorc',5491100000003);
INSERT INTO public."ComunidadUsuario" ("idComunidad","idUsuario",aceptado,"nroSocio") VALUES (1,1,true,101),(2,2,true,201),(1,3,true,103);
INSERT INTO public."Administrador" ("idComunidad","idComunidadUsuario") VALUES (1,1),(2,2),(1,NULL);
