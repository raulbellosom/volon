# Backend local reproducible

**Propósito/estado:** entorno de desarrollo sintético, sin servicios públicos ni operación real. Arquitectura elegida por el usuario el 17-10-2026: [ADR-0007](../decisions/0007-local-backend.md). No es distribución Self-Hosted productiva.

## Requisitos y arranque

Docker Desktop con motor Linux y WSL2 en Windows, Docker Compose, Node 22.23.3 y pnpm 10.15.1. Docker debe tener memoria disponible para Supabase y el build (este equipo dispone de aproximadamente 8 GiB para el motor). Mantener Docker activo. Desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm local:up
pnpm local:status
pnpm db:status
pnpm local:quote
pnpm test:integration
```

`local:up` es repetible: crea la red dedicada, usa Supabase CLI oficial 2.121.0 para iniciar PostgreSQL/Auth/Realtime/Storage, valida protección de red, genera `.env.local`, genera Prisma Client, aplica migraciones, crea dos usuarios/comercios sintéticos y construye/inicia API y Redis mediante Compose. La primera descarga/build puede tardar varios minutos sin imprimir progreso detallado. Los errores se guardan en `.local/last-error.log`; revisar y redactar antes de compartir, pues las herramientas pueden incluir secretos locales.

`local:quote` inicia sesión con el usuario de prueba A, crea una quote y la consulta mediante HTTP; muestra solo el DTO, nunca contraseña ni bearer. Las integraciones verifican ambos comercios, BOLA, RLS sin filtros de tenant en la aplicación, revocación de membresía, PostGIS y fallos reales de PostgreSQL/conexión. Las pruebas de rechazo modifican temporalmente un permiso del rol local y lo restauran en `finally`; ejecutar una sola suite a la vez en este stack exclusivo de pruebas.

Delivery añade `POST /v1/deliveries` y `GET /v1/deliveries/{deliveryId}` según el [contrato](../specification/api-contracts.md). `local:up` aplica también su migración y reconstruye la API. La misma suite de integración verifica creación/consulta, snapshots, duplicados concurrentes, claves en conflicto, expiración, revocación durante locks y rollback al commit. Reinicia una vez el contenedor API para comprobar durabilidad; crea y elimina su propio trigger de fallo diferido dentro de `finally`. No ejecutar mientras otra persona use este stack sintético. Los archivos corren secuencialmente; las solicitudes dentro de los tests de carrera sí son concurrentes.

## Puertos y redes

El historial `GET /v1/deliveries?branchId=...` usa el mismo bearer y devuelve
páginas según el [contrato API](../specification/api-contracts.md), con DTOs y
validadores exportados por `@delivery/contracts`. `pnpm test:integration` incluye
pruebas de cursor, límites y RLS. Sus fixtures usan sucursales e identificadores
UUID sintéticos propios; al terminar deshabilitan membresía y sucursal. Las
entregas de prueba se conservan porque son inmutables: no se desactivan triggers
ni se borran datos para limpiar la suite. No ejecutar suites simultáneamente
sobre este stack, pues las pruebas restauran grants y flags temporales en finally.

El portal puede consumir `GET /v1/me` y
`GET /v1/merchants/{merchantId}/branches` con el mismo bearer de Supabase Auth.
DTOs, campos y errores están definidos en el [contrato API](../specification/api-contracts.md).
La integración de contexto verifica múltiples membresías, sucursales hermanas sin
acceso, comercio/sucursal deshabilitados, revocación, tokens inválidos/vencidos,
RLS y fallos de lectura DB/Auth. Usa fixtures sintéticos con UUID y restaura flags
y grants en `finally`; no ejecutarla en paralelo con otra suite sobre este stack.
La firma del token vencido de prueba usa únicamente la clave del contenedor Auth
local, en memoria y sin imprimirla. No se requiere service role en runtime.

| Servicio | Acceso desde el host |
| --- | --- |
| API propia | `http://127.0.0.1:3100` (`GET /health`) |
| Supabase gateway (Auth/Storage/REST) | `http://127.0.0.1:56321` |
| PostgreSQL único | `127.0.0.1:56322` |
| Buzón de correo sintético | `http://127.0.0.1:56324` |
| Redis | Sin puerto publicado; red Compose `backend` interna |

La API se une además a `delivery-local` para acceder a Supabase por DNS Docker; no usa `host.docker.internal` ni otro PostgreSQL. API y Redis tienen healthchecks; los servicios Supabase conservan los healthchecks oficiales (PostgREST no declara uno propio). `local:up` no usa `--ignore-health-check`. Volúmenes de DB/Storage los administra la CLI; Redis usa volumen nombrado con AOF. No se borra ninguno al detener.

### Docker Desktop que ignora el enlace a loopback

La red usa la [opción oficial de Supabase](https://supabase.com/docs/guides/local-development#quickstart) `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`. Aun así, en Docker Desktop 4.92.0/Engine 29.8.0 de este equipo se observaron publicaciones wildcard (`0.0.0.0` y `::`), incluso en un contenedor de prueba independiente. No se debe asumir protección solo por esa opción.

El arranque inspecciona las publicaciones efectivas. Si no son loopback, en Windows exige una regla activa de firewall y perfiles habilitados, o detiene este stack conservando volúmenes. Esta sesión no tiene permisos de administrador para crearla. Ejecutar una vez **PowerShell como administrador**:

```powershell
New-NetFirewallRule -DisplayName 'Delivery local Supabase - block remote inbound' -Direction Inbound -Action Block -Protocol TCP -LocalPort 56321,56322,56324 -RemoteAddress Any -Profile Any
```

Después repetir `pnpm local:up`. El script verifica la regla en `ActiveStore`, protocolo, puertos, dirección, acción y cobertura antes de continuar. La regla afecta únicamente esos puertos de entrada, no los puertos de otros proyectos. No abrirlos en router, túneles o servicios públicos. En otros hosts con publicaciones inseguras, corregir el enlace Docker a loopback; no existe flag para ignorar la comprobación. No cambiar configuraciones globales de Docker para resolverlo silenciosamente.

## Credenciales y privilegios

`.env.example` contiene únicamente nombres y valores no secretos. `.env.local` y `.local/` están ignorados por Git y excluidos del contexto Docker. El bootstrap toma las claves de la CLI sin imprimirlas, genera una contraseña aleatoria para `delivery_api` y otra para los dos usuarios de prueba (`merchant-a@example.test`, `merchant-b@example.test`). No se usan cuentas reales, coordenadas de personas ni service role en la API. No compartir `.env.local` ni los logs sin revisión.

La conexión administrativa local `MIGRATION_DATABASE_URL` se usa solo en Prisma Migrate, seed y pruebas de rechazo. No se pasa al contenedor API. La API recibe `DATABASE_DOCKER_URL` con rol limitado y la clave publicable, valida su rol al arrancar y se ejecuta como usuario `node`, con filesystem de solo lectura, sin capabilities y sin acceso al socket Docker. Redis se ejecuta como usuario `redis` y no tiene consumidores ficticios.

## Esquema y migraciones

Prisma CLI/client/adapter 7.10.1 están fijados y son estables; [conexión mediante adapter PostgreSQL](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool), pool y tiempos acotados. `prisma/schema.prisma` declara solo `app`. Los esquemas `auth`, `storage`, `realtime` y demás internos pertenecen a Supabase y no se introspectan ni migran con Prisma.

El único historial propio es `prisma/migrations`: extensión PostGIS y tablas iniciales, luego constraints/rol/grants/RLS. El SQL inicial fue generado por `prisma migrate diff` y completado con PostGIS/search_path explícito. `prisma migrate deploy` aplica los archivos y verifica su historial. No usar `db push`, `supabase db reset/push` ni otro migrador para estas tablas. La migración de seguridad crea un rol local sin contraseña; el seed asigna la contraseña aleatoria. No se introducen claves en SQL versionado.

Para una migración nueva: revisar primero especificación/ADR, generar SQL con Prisma `migrate diff` a una carpeta nueva, revisar el SQL (incluidas RLS/constraints) y aplicar mediante Prisma Migrate. No modificar migraciones ya aplicadas. En este corte no se ofrece reset automático ni rollback destructivo; ante cambios posteriores, preparar una migración de avance y respaldo/revisión pertinentes.

## Detener y recuperar

```sh
pnpm local:stop
pnpm local:up
pnpm local:quote
```

El stop afecta solo `delivery-backend-local` y el proyecto Supabase `delivery-local`. Conserva datos/volúmenes y no utiliza `--all`, `--no-backup` ni `down -v`. Repetir el arranque verifica migraciones sin duplicarlas y reutiliza usuarios/configuración. Si `.env.local` se pierde, no regenerar contra volúmenes con usuarios existentes sin revisar credenciales; recuperar el archivo local o planear una reconstrucción sintética autorizada.

## Límites del incremento

El issue #14 añade una cuarta migración exclusivamente aditiva para el
[laboratorio privado](../specification/private-location-lab.md). Ejecutar
`pnpm local:up` y `pnpm test:integration`; los archivos private-location-*.test.ts
componen Auth, repositorio, KMS y ledger simulados dentro del proceso de pruebas.
No hay servidor, endpoint ni flag que lo conecte al cotizador. Solo fixtures
predefinidos. La tabla no conserva claves/ledger; reiniciar simuladores cierra
acceso. No reconstruirlos desde DB ni interpretar key_destroyed como purge real.
No hay rollback destructivo: para retirar el laboratorio conservar su tabla y
dejar de construir el módulo. Copias temporales de pruebas no son backups reales.


El corte de direcciones #11 permite destino textual e indicaciones sintéticas
opcionales en el snapshot existente y tres lecturas explícitas bajo Auth/RLS.
Contrato y secuencia para Claude: [integración de ubicaciones](location-integration.md).
Sin migraciones nuevas ni servicios comerciales. La integración prueba pickup
autoritativo, destino inmutable, legacy, RLS y fallos de infraestructura.


La ruta es distancia geodésica PostGIS desde sucursales sintéticas en `(0, 0)`, con recogida dentro de 1 m y radio máximo sintético de 8 km, sin ruta vial, ETA o tarifa comercial. El listener exige `LOCAL_SYNTHETIC_MODE=true`. Cotizar no crea Delivery ni cobra; el comando separado Delivery consume una quote vigente una sola vez y persiste `requested` con snapshot/idempotencia inmutables. No hay otras transiciones, pagos ni despacho; quedan pendientes auditoría completa/outbox, rate limiting, gestión completa de sesiones y retención. Realtime y Storage están disponibles sin flujos de negocio ni buckets/canales abiertos. Redis está disponible sin workers. Self-Hosted de producción, backups/restore y capacidad quedan fuera de esta entrega.
## Laboratorio Courier #16

1. `pnpm local:up`: aplica quinta migración aditiva con Prisma y aprovisiona
   courier-a@example.test / courier-b@example.test en Supabase local. No hay cuentas
   públicas; contraseña local aleatoria en `.env.local`, nunca imprimirla.
2. `node --experimental-strip-types scripts/local/courier.ts`: autentica el
   fixture A, consulta perfil, modifica disponibilidad y verifica replay. Solo
   loopback/puertos locales conocidos; no muestra token, clave ni contraseña.
3. `pnpm test:integration`: incluye pruebas Courier con Auth/PostgreSQL reales.
   Pruebas focalizadas: `node --experimental-strip-types --test --test-concurrency=1
   apps/api/integration/courier-*.test.ts`.
4. `node scripts/local/check-clean-migrations.mjs`: aplica todos los SQL en cluster
   PostgreSQL/PostGIS vacío del mismo image fijado que Supabase, sin puertos ni
   mounts del host (`--network none`), verifica FORCE RLS y elimina solo su
   contenedor UUID etiquetado. No usa/muta volúmenes existentes. Requiere imagen
   `public.ecr.aws/supabase/postgres:17.11.0.004` ya disponible o acceso para pull.
5. `node --env-file=.env.local node_modules/prisma/build/index.js migrate diff
   --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: verifica
   ausencia de drift del modelo soportado por Prisma; constraints/RLS/triggers
   se verifican con integración, no los infiere Prisma diff.

El seed repetido no habilita perfiles revocados ni cambia turnos/versiones. Los
tests dejan recibos sintéticos inmutables con claves únicas y restauran cambios
temporales de grants/habilitación; no se ofrece limpieza destructiva del ledger.
Un reinicio del backend conserva disponibilidad y recibos en PostgreSQL.
No conectar aún CourierGateway, no crear ofertas ni invocar Geoapify. Falta
elegibilidad legal/vehicular, TTL, rate limits para despliegue, PSP y política de
datos del destinatario. Disponible no equivale a elegible para asignación.

## Núcleo de asignación interno #18

Después de `pnpm local:up`, ejecutar desde la raíz:

```sh
node --experimental-strip-types --test --test-concurrency=1 apps/api/integration/dispatch-lab-*.test.ts
node scripts/local/check-clean-migrations.mjs
pnpm check
pnpm test:integration
```

La sexta migración agrega cinco tablas DispatchLab sin cambiar Delivery ni sus
triggers. El harness verifica Auth local, crea escenarios UUID con conexión de
fixtures y compone un adaptador financiero sintético **solo dentro de tests**.
Comandos de usuario usan delivery_api/RLS, no la conexión administrativa. Conserva
historia y libera reservas artificiales mediante comandos auditados al repetir;
no borra registros. Restaura grants/flags y retira únicamente sus triggers de
fallo en finally. Usar un stack sintético exclusivo, una suite a la vez.

No hay CLI operativa, endpoint, env/header de aprobación financiera, publicador,
PSP ni conexión móvil. El default deniega. No usar IDs operativos como escenarios.
Contrato exacto, estados y límites: [dispatch-lab](../specification/dispatch-lab.md).
Conexión nueva comprueba durabilidad de commits; no es prueba de backup/restore.
