# Ensayo Stripe Test — HTTP 400, recuperación pendiente

Issues #25/#26 / ADR-0019. El fundador reporta el primer POST rechazado con HTTP 400.
Este corte corrige el payload y propone recuperación: cero solicitudes Stripe
durante la corrección. Los comandos generales son referencia; no repetir create
ni fixture ni crear escenarios alternativos mientras siga el bloqueo descrito abajo.
No portal, Delivery, dinero real ni despacho. Conekta/Openpay siguen alternativas.

## Cuenta y claves locales (#26)

1. Entrar personalmente al Dashboard oficial, crear/seleccionar un sandbox dedicado
   y comprobar visualmente el entorno de prueba y su accountId. No activar Live.
2. El sandbox ya fue creado por el fundador. Se aceptan `rk_test_` (preferida)
   y `sk_test_`; se rechazan absolutamente claves Live. Revisar los permisos abajo.
3. Guardar `STRIPE_SANDBOX_ACCOUNT_ID` y `STRIPE_SANDBOX_API_KEY` exclusivamente
   en `.env.stripe-manual.local` privado, ignorado por Git y con acceso limitado al operador.
   El primer aprovisionamiento copia internamente los valores ya existentes de `.env.local`,
   que conserva intacto como configuración del stack histórico en cuarentena.
   No exportar variables Stripe al proceso: el runner rechaza esa ambigüedad.
   Nunca pegar valores en chat, Issue, argv, captura, log ni archivo versionado.
   Si la terminal está grabándose/compartida, detenerse.
4. La clave se mantiene en memoria durante el comando; no se garantiza borrado
   físico de strings, memoria, swap o clipboard. Revisar custodia antes de usarla.

`STRIPE_SANDBOX_WEBHOOK_SECRET` y `STRIPE_SANDBOX_PUBLISHABLE_KEY` son opcionales:
omitirlas si no existen; no dejar asignaciones vacías. Si están presentes se
validan `whsec_` y `pk_test_`. Publishable queda reservada, sin uso ni frontend.
Solo el runner interactivo consume la clave tras comprobar TTY y barreras locales;
no instala secretos en process.env. Los dos preflights no leen archivos privados.
`--plan` valida archivo y cuenta contra PostgreSQL bajo Auth/RLS, sin Stripe.

### Permisos de la clave restringida

Revisar por recurso en el sandbox; el prefijo no demuestra permisos efectivos.

| Ruta | Permiso por revisar en Dashboard |
| --- | --- |
| GET /v1/account | Account / Account information: Read; si aparece bajo Connect, solo lectura de cuenta propia |
| POST Checkout Session y GET Session | Checkout Sessions: Write, incluyendo lectura |
| GET PaymentIntent | PaymentIntents: Read |
| GET Charge | Charges: Read |

El POST utiliza `price_data.product_data` inline: revisar también Products y
Prices si Stripe exige esos permisos para la creación implícita. La documentación
general de RAK no enumera todas las dependencias de ese POST. No se afirma que
la clave concreta tenga acceso: no se leyó ni probó contra Stripe. Si falta un
permiso, detener y revisar el mínimo adicional antes de aprobar otro plan;
no conceder Write global ni sustituir por sk_test automáticamente.
No hay escrituras directas a PaymentIntents/Charges, Customers, Refunds, Disputes,
Transfers, Payouts ni Webhook endpoints, ni GET Dispute. Eso no demuestra ausencia
de dependencias transitivas: revisar las que Dashboard asocie a Checkout Sessions
Write, incluyendo PaymentIntents/Charges y Products/Prices, antes del ensayo.
Un 401/403 produce `PROVIDER_REJECTED` sin mensaje externo ni retry; fallar GET
Account impide POST. No hacer probes adicionales fuera del presupuesto.

Fuentes oficiales revisadas 2026-10-20: [claves](https://docs.stripe.com/keys),
[RAK](https://docs.stripe.com/keys/restricted-api-keys),
[crear Session](https://docs.stripe.com/api/checkout/sessions/create).

## Preparación local sin Stripe

### Diagnosticar HISTORY_BLOCKED sin cambiar historial (#26)

Desde Git Bash: `pnpm stripe:sandbox:history --inspect`.
Comparte únicamente el reporte agregado. Usa las mismas barreras locales y archivo
ignorado del aprovisionador, sin consumir API key ni bearer y sin requerir TTY.
La transacción `REPEATABLE READ` + `READ ONLY` solo consulta las tres tablas de
laboratorio de la sucursal A. El JSON no incluye UUID, cuenta, subject, IDs de
Stripe, fechas, claves, hashes o payloads: muestra clases de cuenta, estados de
submission/eventos, totales y cantidades con cada binding/checkpoint presente.
Los errores están sanitizados y `stripeRequestsByInspection=0` es exclusivo de
esta inspección, no una afirmación sobre ejecuciones históricas.

`SUBMISSION_EXISTS_EVEN_WITHOUT_KEY` explica HISTORY_BLOCKED; múltiples escenarios
también impedirían crear otro. #27 inspecciona solo dos filas para decidir el
primer error; el diagnóstico examina todo el scope para no ocultar el resto.
Ni etiquetas de cuenta offline, ni UUID con forma de fixture, ni `captured_test`
demuestran por sí solos ausencia de red: la BD no registra transporte/procedencia.
El checkpoint de key/hash ocurre antes del GET Account, así que tampoco demuestra
un POST. Cuentas configuradas o desconocidas requieren revisión conservadora;
no se excluyen filas ni se rebaja el bloqueo al reconocer una etiqueta.

Origen en código: `stripe-persistence-fixtures.ts:durable` reutiliza Auth/tenant
A/B y persiste escenarios en sus sucursales con `OfflineStripe` inyectado. Las
pruebas TLS usan un servidor loopback; las de recuperación simulan interrupciones.
Esto conservó historia para verificar durabilidad, pero compartió el namespace
del futuro ensayo. #23 usa memoria; #24–#26 prueban persistencia y dejan filas;
#27 detecta historia preexistente y sus nuevos casos usan ramas aisladas.

Prevención inmediata: `pnpm test:integration`, sus fixtures centrales y el worker
de recuperación rechazan cualquier `STRIPE_SANDBOX_*` en archivo o proceso antes
de cargar credenciales/crear clientes. No quitar variables para saltar esta
barrera sobre la misma BD. No cambia ni limpia historia ya existente.

### Instancia manual dedicada — remediación aprobada y aplicada (#26)

ADR-0020: autorización del fundador del 2026-10-21 exclusivamente para preparar
una instancia nueva. La instalación histórica queda en cuarentena, sin migraciones,
seed, resets ni integraciones adicionales. Sus 148 escenarios, 127 submissions y
51 eventos se conservan; una huella privada de las tres tablas completas comprueba
que no cambiaron. Esta autorización no sustituye recuperación de intentos inciertos.

Docker Desktop debe estar activo. Desde **Windows Git Bash**, sin exportar claves,
DB URLs ni variables Docker/Stripe y sin usar `source` sobre archivos privados:

```bash
cd /d/RacoonDevs/volon
git pull --ff-only origin main
pnpm stripe:sandbox:manual:up
pnpm stripe:sandbox:manual:status
```

`manual:up` crea solo el proyecto/red `delivery-stripe-manual`, volumen
`delivery-stripe-manual-db`, PostgreSQL 57322 y gateway Supabase Auth 57321,
ambos publicados exclusivamente en 127.0.0.1. El stack antiguo 56321/56322 no se
arranca, detiene, migra ni reemplaza. Colisiones de puertos/nombres, cuenta distinta,
procedencia ausente o historial inesperado bloquean. No elegir otros puertos.
Bridge dedicado con default loopback; no promete aislamiento de tráfico saliente.
No hay API Delivery ni contenedores que reciban credenciales Stripe.

El primer `up` crea configuración privada, contraseñas aleatorias, migraciones y
Auth/comercio/sucursal sintéticos **solo en la base nueva**. Verifica 0/0/0 antes
del seed. `.env.stripe-manual.local` contiene la configuración manual;
`.local/stripe-manual/docker.env` contiene solo credenciales locales Docker/Auth;
`provenance.json` privado vincula instancia, cuenta, identificador del clúster y
huella histórica. Los tres deben mantenerse juntos, ignorados por Git; no copiarlos,
mostrarlos, compartirlos, versionarlos ni exportarlos. Nunca ejecutar `down -v`.

El `status` compara Docker, puertos, red, volumen, marcador PostgreSQL, rol runtime,
identidad habilitada y preservación histórica. Reporta solo agregados y banderas.
Ante diferencias detenerse, conservar datos y revisar #26. No reparar editando el
marcador. Integraciones automáticas se ejecutan en checkout/stack desechables sin
estos archivos ni variables Stripe; CI provisiona su propia instancia. El wrapper
rechaza tanto variables Stripe/marker como la presencia del archivo manual antes
de conectar. Nunca ejecutar `pnpm local:up`, seed o integraciones sobre esta instancia.

Comandos oficiales de fixture, exclusivamente para la instancia manual validada:

```bash
pnpm stripe:sandbox:fixture --dry-run
pnpm stripe:sandbox:fixture --create
pnpm stripe:sandbox:manual:status
```

Ya se ejecutaron una vez en la instancia aprobada: 0/0/0 antes; después 1 escenario,
0 submissions y 0 eventos. Cero solicitudes Stripe. Si no hay intentos posteriores,
repetir fixture reutiliza el mismo escenario; nunca crea otro para sortear historial.
No requiere TTY, bearer ni clave Stripe para operar sobre la base; los archivos
se parsean privadamente sin exportación ni impresión. Puertos históricos se
rechazan para fixture/runner; el inspector histórico continúa leyendo `.env.local`.

El aprovisionador usa el rol administrativo local `postgres` con bypass RLS y
permisos comprobados; no aumenta privilegios del rol `delivery_api`. Consulta en
PostgreSQL la identidad Auth ya provisionada `merchant-a@example.test`,
`membership_synthetic_a`, `branch_synthetic_a` y `merchant_synthetic_a` habilitados
y coherentes. No crea usuarios ni altera membresías. Crea solo un escenario
`offline-test`, 4400 centavos MXN, sin relación con Delivery/ServicePayment.

`--dry-run` usa transacción de solo lectura: sin escenario devuelve
`RESULTADO=LISTO_PARA_CREAR` y `ESCENARIO_UUID=NO_CREADO`; no reserva un UUID.
`--create` devuelve `RESULTADO=CREADO` o `REUTILIZADO` y el UUID persistido.
Ambos muestran únicamente resultado, escenario, `IMPORTE=44.00 MXN` y
`SOLICITUDES_A_STRIPE=0`; los bloqueos tienen código y explicación sanitizada.

Un bloqueo advisory transaccional por sucursal serializa procesos concurrentes.
Se revisan todos sus escenarios, incluso deshabilitados o con otra cuenta,
propietario o importe: cualquier fila de submission (aun sin key), múltiples
escenarios o datos incompatibles bloquean; nunca se reemplaza ni reinicia historia.
Los escenarios se bloquean durante create/reuse contra inserciones concurrentes
de submission. Dry-run es una inspección, no garantiza una ejecución posterior.
Esto también puede bloquear un stack usado antes por otras integraciones: pedir
revisión del #26, sin borrar datos ni crear otra sucursal para saltar el bloqueo.
La fixture no hace migraciones, limpieza, reinicio de intentos, llamadas Stripe ni secretos
en la salida. El ejecutor de planes/pagos sigue usando su rol runtime restringido.

Copiar solo el `ESCENARIO_UUID` devuelto al siguiente comando de Git Bash:

```bash
pnpm stripe:sandbox:preflight
pnpm stripe:sandbox:trial --preflight
pnpm stripe:sandbox:trial --plan create UUID_DEL_ESCENARIO
```

Plan inicia sesión automáticamente como `merchant-a@example.test` mediante el
[flujo oficial de contraseña](https://supabase.com/docs/guides/auth/passwords)
de Supabase Auth en 127.0.0.1:57321. Lee exclusivamente
`SYNTHETIC_USER_PASSWORD` y `SUPABASE_PUBLISHABLE_KEY` del archivo privado manual;
no requiere obtener ni pegar un Bearer. El token queda solo en memoria y se valida
con el autenticador existente, la identidad provisionada y las políticas RLS.
No se persiste/exporta la sesión ni se conserva su refresh token. Fallos de Auth,
credenciales ausentes o identidad ajena bloquean con errores sanitizados.
No sigue redirecciones ni reintenta. Hace cero consultas Stripe.
Devuelve JSON público mínimo y SHA-256. No es autorización. Revisar HEAD, cuenta,
escenario, MXN 44.00, dos requests máximo, un POST, cero checkout completado,
cero tarjetas, cero reintentos y vencimiento de la aprobación operacional.
El plan se guarda en `.local/stripe-manual/plan.json`, sin secretos, con vigencia
máxima de una hora. Volver a planificar sobrescribe solo ese documento público.

## Comandos preparados, NO ejecutar todavía

**Bloqueo vigente tras HTTP 400 (#26):** el fundador reportó
`invalid_request_error`, parámetro `payment_method_types`. Se eliminó el selector
del payload conforme a [métodos dinámicos](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods)
y la [guía oficial del error](https://support.stripe.com/questions/fix-the-payment-method-types-error).
No se añade `allowed_payment_method_types`: este ensayo solo crea una Session,
sin abrir/completar Checkout. Si después se exige solo tarjeta, evaluar esa
allowlist con soporte explícito para la versión fija y aprobación de un nuevo plan.
No se cambia la configuración del Dashboard ni se asume aceptación del nuevo POST.

El hash de envío cambia al omitir el campo; el de plan cambia con el nuevo HEAD.
Hay vectores SHA-256 completamente artificiales en `stripe-checkout-parameters.test.ts`,
incluidos cuerpo anterior/nuevo y rechazo del cuerpo anterior por el presupuesto.
No recalcular ni reemplazar el hash guardado en PostgreSQL. El algoritmo de clave
existente permanece intacto: cambiar solo el código no convierte la clave histórica
en una clave nueva. No repetir `--create`, ni fixture `--create`, ni generar un
escenario alternativo. HISTORY_BLOCKED y el bloqueo de plan con submission siguen.
No se conectó a la base manual ni se ejecutaron comandos de ensayo para esta corrección.
Las integraciones de CI usan su propia base desechable sin credenciales Stripe.

### Recuperación auditable — implementación offline, aplicación manual NO autorizada

ADR-0021 implementa el diseño siguiente exclusivamente para pruebas desechables.
La migración `20261022034450_stripe_sandbox_audited_recovery` crea tablas nuevas
RecoveryLab, RecoveryDecision y Successor bajo el prefijo StripeSandbox, funciones
privadas y sus restricciones/RLS. No altera columnas, triggers existentes ni permisos
de Submission; las FK nuevas añaden dependencias referenciales internas,
ni contiene backfill o migración de intentos existentes. No aplicarla en la manual.

El perfil manual se rechaza tanto en CLI como en PostgreSQL: puertos 57321/57322
no aceptados por esta herramienta, archivo manual presente bloquea, y el marcador
`local_control.Environment` impide usar el núcleo de escritura aunque se cambie el
archivo. El marcador desechable fija UUID y system_identifier real del clúster.
No editar/quitar marcadores para habilitar datos manuales. No hay flag de override.

En un checkout/base desechables **separados**, sin archivos ni variables Stripe,
el administrador de pruebas provisiona RecoveryLab con purpose
`disposable-recovery-v1`, UUID y system_identifier de esa base. Las fixtures de CI
hacen esto automáticamente. No se incluye un comando que marque bases existentes
como desechables. `.env.stripe-recovery.local` privado/ignorado debe contener solo
LOCAL_ENVIRONMENT_KIND=disposable-recovery-v1, LOCAL_SYNTHETIC_MODE=true,
RECOVERY_LAB_INSTANCE_ID y DATABASE_URL runtime 127.0.0.1:56322/postgres?schema=app,
SUPABASE_URL=http://127.0.0.1:56321, SUPABASE_PUBLISHABLE_KEY y
SYNTHETIC_USER_PASSWORD del usuario ya provisionado. Sin URL administrativa ni
claves Stripe. El CLI verifica la base en lectura antes de autenticar.

Comandos Git Bash oficiales, **solo sobre el laboratorio desechable**:

```bash
pnpm stripe:sandbox:recovery --inspect UUID_ESCENARIO_ORIGINAL
pnpm stripe:sandbox:recovery --prepare .local/stripe-recovery/evidence.json
pnpm stripe:sandbox:recovery --plan UUID_SUCESOR
```

Inspect usa transacción READ ONLY/REPEATABLE READ; muestra estado agregado,
cantidades, motivos y necesidad de evidencia, sin claves/hashes/IDs del proveedor.
Es inspección orientativa, no autorización: prepare vuelve a revisar bajo locks.
Prepare requiere TTY local, Auth/RLS, expediente revisado y confirmación oculta
`PREPARAR RECUPERACION OFFLINE SHA256_EXPEDIENTE`. El digest que muestra es el del
expediente de aprobación, no key/hash de idempotencia. En una transacción añade
una decisión y un sucesor, consume mediante UNIQUE/relación inmutable y no hace
UPDATE sobre historia. Repeticiones/concurrencia rechazan; después de perder un
acuse usar inspect, sin asumir rollback ni volver a crear. Un error entre INSERTs
revierte ambos. El mismo HEAD del expediente debe fijar el plan.

Expediente privado exacto: version=1, scenarioId, accountId, submissionDigest del registro
original completo, stripeRequestId, httpStatus=400, errorType=invalid_request_error,
errorParam=payment_method_types, apiVersion fija, noSessionConfirmed=true,
noOtherPostConfirmed=true, reviewedBy (subject Auth), reviewedAt ISO <=24h,
source=stripe-official-error-reviewed, artifactDigest y approvalHead. No otros campos.
El archivo vecino `stripe-error.json` debe conservar el extracto privado revisado:
status, accountId, scenarioId, requestId, apiVersion y response.error.type/param.
Su SHA-256 de bytes debe corresponder a artifactDigest y todos esos datos deben
coincidir con el expediente. No guardar claves, tokens o headers de autorización
en ninguno. El extracto y sus hashes nunca se imprimen ni se guardan en el plan.
La autoría de Stripe requiere revisión humana del error/request oficial: sin acceso
externo no se acredita criptográficamente. Un booleano o digest aislado no prueba
ausencia de otros envíos; ante incertidumbre no aprobar ese expediente.

El plan v2 queda en `.local/stripe-recovery/plan-v2.json`, sin key, token, evidencia
o hash de key. Fija decisión, sucesor, escenario, cuenta, subject, HEAD, digest del
payload dinámico, MXN 4400, vigencia <=1h, máximo 2 requests/1 Session y
readyForExternalCalls=false. Salida: SHA-256 del plan y banderas; no habilita Stripe.
El runner v1 lo rechaza. No existe `--execute`, envío o reconciliación de sucesores.

1. Conservar íntegros escenario, submission HTTP 400, key, hash, timestamps, estado,
   leases/versiones y eventos. No cerrar ni reclasificar la fila original; el adapter
   conserva estados conservadores. El HTTP 400 informado no acredita por sí solo
   ausencia de una Session o de otro envío incierto.
2. Revisar en lectura el intento y evidencia oficial vinculada a ese request:
   cuenta/versión, error/param, ausencia de bindings y otros POST/unknown. Cualquier
   consulta externa requerirá autorización aparte. Si hay incertidumbre, detener
   y seguir investigación/recuperación del intento original; no habilitar otro.
3. Tras aprobación de contrato y migración **aditiva**, registrar una decisión de
   recuperación inmutable en una tabla nueva: referencia al intento original,
   evidencia privada y su digest, clasificación revisada, operador, fecha servidor,
   HEAD y compromisos de los hashes anterior/nuevo. La decisión no modifica el
   intento ni declara pago/reembolso. No publicar claves, hashes de idempotencia,
   tokens ni identificadores sensibles en Issue/logs.
4. Crear un intento sucesor con UUID propio, enlazado al **mismo escenario** y a
   esa decisión, en almacenamiento nuevo; conservar la relación histórica 1:1
   Scenario/Submission actual. Su key única incluirá la identidad del nuevo intento,
   con digest nuevo e inmutable de los bytes exactos. Nunca reutilizar la key vieja,
   incluso si Stripe no retuvo el error o pasaron 24 horas. No crear otra fixture.
5. Una transacción local con lock de sucursal y consumo único de decisión mediante
   registro append-only debe impedir sucesores concurrentes o decisiones repetidas.
   Comprobar todos los intentos anteriores: solo el rechazo concreto revisado puede
   admitir un sucesor; cualquier binding/unknown diferente bloquea. El comando
   histórico mantiene HISTORY_BLOCKED; una futura interfaz explícita de recuperación
   necesitará sus propios gates auditados, sin flag de bypass ni permisos productivos.
6. Nuevo contrato/plan versionado fijará UUID de decisión e intento, cuenta,
   escenario MXN 4400, payload/digest exacto, nueva key, HEAD, SHA-256, ventana <=1h,
   máximo 2 requests/1 POST/1 Session. Revisión y aprobación humana independientes
   **antes de cualquier acceso Stripe**. Auth/RLS, instancia verificada, TTY local,
   no CI/cloud, límites, cero retry automático y recuperación desconocida conservados.

Primero aprobar diseño y alcance de escrituras; después implementar/probar la
herramienta y migración aditivas en instancia desechable. Solo con otra autorización
aplicar las escrituras locales revisadas, verificar preservación antes/después y
preparar el plan sucesor. Su ejecución externa tendrá aprobación adicional.
El núcleo y tablas solo se prueban en bases desechables; no hay habilitación
manual ni transporte. Ver [idempotencia oficial](https://docs.stripe.com/api/idempotent_requests).

#### Futuras escrituras locales exactas — requieren otra autorización

1. Autorizar HEAD/digest de la migración y respaldo/revisión privada de la base
   manual. Aplicar esa única migración aditiva mediante procedimiento administrativo
   aprobado, sin backfill/UPDATE/DELETE/TRUNCATE históricos. Hoy no se aplica.
2. Revisar en otro corte la habilitación manual: el binario actual la bloquea.
   Aprobar su contrato de procedencia y permisos; no reutilizar RecoveryLab ni
   etiquetar la manual como desechable. No cambiar el guard por edición de datos.
3. Tras revisar el error/request oficial, estado/bindings/eventos/leases, snapshot
   completo y demás intentos, autorizar el expediente privado concreto y HEAD.
   Una transacción añadirá exactamente **1 RecoveryDecision y 1 Successor**,
   con UUIDs/key nueva generados, digest dinámico calculado, referencias al mismo
   escenario y timestamps de servidor. Ningún campo de Scenario/Submission/Event,
   incluidas versiones y leases, recibirá UPDATE; la asociación vive en filas nuevas.
   Comparar el registro original completo antes/después y verificar conteos +1/+1.
4. Solo después generar plan v2 privado sin escrituras PostgreSQL. Un ejecutor
   externo de sucesores y cualquier solicitud Stripe requieren implementación,
   revisión y aprobación independientes de plan/HEAD/cuenta/SHA-256/límites/ventana.
   No reutilizar `trial --create` ni crear escenarios alternativos.

```bash
pnpm stripe:sandbox:trial --create UUID_DEL_ESCENARIO SHA256_DEL_PLAN
pnpm stripe:sandbox:trial --plan reconcile UUID_DEL_ESCENARIO
pnpm stripe:sandbox:trial --reconcile UUID_DEL_ESCENARIO SHA256_DEL_PLAN
```

Create exige teclear `AUTORIZO STRIPE TEST SHA256_DEL_PLAN` en entrada oculta;
después repite el login local y exige el mismo subject antes de cualquier solicitud
Stripe. El login automático no sustituye la aprobación independiente del plan.
la clave procede de `.env.stripe-manual.local`. GET /v1/account debe coincidir con archivo,
plan y escenario antes del POST. No se compone transporte antes de confirmar.
Se valida livemode=false en objetos, importe/moneda/binding y clave idempotente.
No abre Checkout ni devuelve URL tokenizada. El regreso del navegador no acredita pago.
Reconcile tiene plan separado, cuatro GET máximo y necesita Session ya enlazada.

Unknown/crash/commit incierto: **detener**, conservar escenario y key/hash en DB;
no repetir create ni crear otro fixture para saltar el bloqueo. Si existe binding,
revisar/autorizar reconcile. Sin binding se necesita investigación y aprobación
de recuperación con la misma clave antes de 23 h; el runner no la automatiza.

## Preparar la migración manual única — sin aplicarla (#26)

Estado: herramientas probadas en bases desechables. **La preparación no autoriza
aplicar la migración ni recuperar el intento HTTP 400.** No ejecutar trial,
fixture, seed, `local:up`, `db:status` ni `prisma migrate deploy` sobre la manual.
Cerrar otros procesos que puedan escribir en esa base durante preflight/aplicación.

Windows Git Bash, desde la raíz y sin exportar variables privadas:

```bash
git pull --ff-only origin main
pnpm stripe:sandbox:migration --inspect
pnpm stripe:sandbox:migration --prepare
```

Inspect solo lee la instancia 127.0.0.1:57322 y Docker local. Exige proyecto/red
`delivery-stripe-manual`, volumen `delivery-stripe-manual-db`, puertos loopback
57321/57322 y procedencia/nonce/system_identifier/cuenta consistentes. Comprueba
credenciales administrativas/runtime mediante transacciones TCP READ ONLY, rol
restringido y marcador bajo RLS. No conecta al stack histórico 56322 ni a Auth/Stripe.
Espera exactamente 1 Scenario MXN 4400, 1 Submission y 0 Event; no examina ni cambia
el expediente del error para autorizar una recuperación.

Debe estar pendiente únicamente `20261022034450_stripe_sandbox_audited_recovery`.
Su SQL público es el blob aprobado en HEAD `a49226790ffe86d5eedbd2f1d26c616eef7665dd`,
SHA-256 `00fa1a5bb12229b2af01a91b53a07fcfdb5694b3bb65647834cfeb31aa5eb073`.
Se verifica equivalencia Git/working tree salvo CRLF; la futura ejecución utiliza
los bytes Git/LF exactos y su checksum. Todos los registros previos de Prisma deben
estar terminados, sin rollback, duplicados o checksums ajenos al SQL del repositorio.
El commit aprobado debe existir en el clon local; un checkout superficial sin
ese objeto se bloquea. Actions descarga el historial completo para verificarlo.

Prepare requiere checkout limpio. Crea un directorio privado nuevo e ignorado
`.local/stripe-manual/migration/UUID_PREFLIGHT/`, protegido con ACL de usuario
actual/SYSTEM en Windows o modo 0700 en POSIX. Contiene `postgres.dump` (custom,
base completa con Auth, app, local_control, metadatos Prisma, ACL, RLS, funciones,
secuencias y objetos grandes), `globals.sql` (roles, contraseñas de roles y globals)
y `preflight.json`. Son **respaldos sensibles**: no abrir en terminal grabada,
subir a Git/CI, compartir ni convertir en Artifact. No se copian archivos .env ni
se consultan claves Stripe. Exige que postgres sea la única base no-template y
que no haya tablespaces personalizados. No es un respaldo físico de WAL,
configuración del servidor ni archivos Docker; esos archivos privados siguen intactos.

`pg_dump` toma un snapshot consistente; se comparan antes/después y contra la copia
restaurada las huellas SHA-256 de cada fila completa (multiconjunto ordenado), conteos
de todas las tablas, estados de secuencias, roles, membresías y objetos grandes.
También se compara schema/ACL/RLS/funciones con pg_dump schema-only. Solo se
normalizan el nonce efímero de psql, el grantor bootstrap de membresías internas
pg_* y la forma AND anidada/plana exacta del CHECK legado `branch_coordinates`
que PostgreSQL reanaliza al restaurarlo; tipos, límites y demás SQL deben coincidir.
Cambios concurrentes, otra base o cualquier diferencia bloquean sin reparar datos.

La prueba usa la misma imagen por digest en un contenedor nuevo, sin red, puertos,
volúmenes ni bind mounts. Initdb crea un administrador de restauración; restaura
globals y después la base completa con propietarios y privilegios. Solo en ese
contenedor comprueba también la migración bajo postgres, preservación de filas y
recuperación manual denegada. El clon se elimina al finalizar; el marcador copiado
no convierte al clon en una instancia manual válida. La base fuente solo se lee.
Salida: conteos, digest SQL público, UUID/SHA-256 del preflight, respaldo/restauración
verificados y cero solicitudes Stripe; nunca cuentas, huellas de filas, keys o tokens.

Los errores de preparación incluyen una etapa sanitizada `STAGE=...`: `INSTANCE`,
`PRIVATE_DIRECTORY` (ruta privada/ACL), `BACKUP_GLOBALS`, `BACKUP_DATABASE`,
`RESTORE_GLOBALS`, `RESTORE_DATABASE`, `RESTORE_FINGERPRINT`, `RESTORE_SCHEMA`,
`DISPOSABLE_MIGRATION` o `PREFLIGHT_WRITE`, entre otras. Conservan los motivos
de bloqueo conocidos; las excepciones de infraestructura se reducen a
`LOCAL_STEP_FAILED`. No imprimen stderr, SQL, rutas privadas ni argumentos de
procesos. Un fallo conserva el expediente parcial y nunca aplica DDL al origen.
No inferir su causa de la sola presencia de un respaldo parcial ni del antiguo
`LOCAL_PREFLIGHT_FAILED`, que no identificaba la etapa. No borrar esos expedientes.

Para repetir únicamente la restauración en otro contenedor desechable:

```bash
pnpm stripe:sandbox:migration --verify-backup UUID_PREFLIGHT SHA256_PREFLIGHT
```

Este comando verifica integridad de los archivos e imagen y no necesita acceder a
PostgreSQL manual. No restaura sobre el volumen existente. Si se necesita una
restauración real, detenerse, conservar el volumen y solicitar autorización de un
plan independiente con destino y downtime concretos. No ejecutar scripts de
restauración genéricos contra la manual.

### Aplicación futura: requiere autorización expresa después del preflight

Revisar HEAD, UUID/SHA del preflight, cuenta/identidad en privado, respaldo probado,
1/1/0 y migración/digest anteriores. Tras autorización independiente, preparar en
ese directorio un `approval.json` privado con `version=1`,
`operation=apply-single-manual-migration`, `authorized=true`, HEAD exacto,
`preflightSha256`, `migrationSha256` y `expiresAt` ISO vigente por máximo 1 hora.
La herramienta **no crea ese archivo**. Preflight máximo 24 horas; cualquier
cambio de HEAD o identidad/huella/configuración exige un preflight nuevo.

Comando reservado para después de esa autorización, **no ejecutar en este corte**:

```bash
pnpm stripe:sandbox:migration --apply UUID_PREFLIGHT SHA256_PREFLIGHT
```

Exige TTY local/no CI/cloud y frase oculta `AUTORIZO MIGRACION LOCAL SHA256_PREFLIGHT`.
Revalida datos después de confirmar, verifica hashes de ambos respaldos y escribe
solo una marca privada `application-started.json` antes de contactar con SQL de
escritura. Esa marca impide repetir una aplicación, incluso si falla o se pierde el
acuse. No borrarla para reintentar: inspeccionar y revisar autorización nuevamente.

**Escrituras futuras exactas:** una transacción administrativa con advisory lock,
locks SHARE de tablas existentes y EXCLUSIVE de `app._prisma_migrations`, timeout
de locks 5 s/statement 90 s. Ejecuta solo el cuerpo del SQL aprobado (sin su BEGIN/
COMMIT exterior) y añade **1 registro Prisma** con UUID, checksum aprobado,
nombre exacto, timestamps y applied_steps_count=1. No ejecuta otros directorios.
Añade schema privado, 3 tablas nuevas, funciones/políticas/triggers/índices/FK del
blob; no inserta RecoveryLab, Decision o Successor. Las FK agregan dependencias
referenciales internas al historial, sin cambiar sus filas. Verifica inventario,
huellas completas de todas las tablas anteriores y metadatos Prisma anteriores
dentro de la transacción; comprueba tablas nuevas vacías y lab_ready=false antes
de COMMIT. Conflicto/duplicación/interrupción antes del commit hace rollback.

Después registra `after.json` privado con huellas/conteos y compara preservación;
resultado financiero esperado **1/1/0**, tablas nuevas **0/0/0**, historial Prisma
**+1**. Estos son efectos previstos/probados en clones, no estado aplicado manual.
Error de commit o escritura del informe: detener, conservar respaldo/marca, no
reintentar ni restaurar automáticamente. Reversión ordinaria: conservar el DDL
aditivo y mantener recuperación bloqueada; restauración destructiva requerirá
otra autorización. FinancialEligibility=false, Delivery y despacho sin cambios.

## Recuperación manual auditable — implementación sin aplicación (#26)

Estado confirmado por el fundador: la migración
`20261022034450_stripe_sandbox_audited_recovery` ya fue aplicada con preservación
1/1/0. **No repetirla ni editar ese archivo.** La ruta de laboratorio conserva su
guard y nunca acepta la instancia manual. El ejecutor histórico `trial --create`
continúa bloqueado para el intento original.

Se incorpora `pnpm stripe:sandbox:manual-recovery`, que verifica exclusivamente
la instancia original manual 57321/57322, Docker/control/system_identifier,
volumen/red/puertos, configuración privada, cuenta y pertenencia sintética A.
No conecta a la instalación histórica ni construye transporte Stripe. TTY local
obligatoria y prohibición de CI/cloud/variables privadas heredadas conservadas.

### Nueva migración propuesta: autorización independiente pendiente

Archivo: `prisma/migrations/20261022055840_stripe_sandbox_manual_recovery/migration.sql`.
SHA-256 del SQL Git/LF:
`e1005213f757ed166ec075853e85df109ef67f5db0ed049082455257aa22cad4`.

Solo CREATE FUNCTION de `stripe_recovery_private.manual_ready`,
`manual_catalog_digest` y `manual_prepare`, REVOKE PUBLIC y GRANT EXECUTE a
delivery_api para esas firmas, dentro de BEGIN/COMMIT. No tablas nuevas, semillas,
modificación de funciones anteriores, columnas, historial o marcador original.
No hay grants directos de INSERT/UPDATE/DELETE sobre las tablas financieras.

No se aplica en este incremento. El ejecutor administrativo conserva el manifiesto
anterior como default y añade una selección explícita **solo** para este nuevo
manifiesto fijo, anclado al commit `bcef53671adf8f26ccda2a29f07efb1debce4115`.
No acepta nombres/rutas/hash arbitrarios y una aprobación del manifiesto anterior
no sirve para este. Preparación futura de lectura y respaldo:

```bash
pnpm stripe:sandbox:migration --target manual-recovery --inspect
pnpm stripe:sandbox:migration --target manual-recovery --prepare
```

La siguiente autorización de DDL debe fijar archivo/digest y HEAD, confirmar la
anterior aplicada y que solo esta nueva esté pendiente, revisar el nuevo respaldo/
restauración/preflight y preparar approval.json con las reglas ya documentadas.
Comando reservado para **después** de esa autorización expresa:

```bash
pnpm stripe:sandbox:migration --target manual-recovery --apply UUID_PREFLIGHT SHA256_PREFLIGHT
```

Conserva TTY, frase oculta, vencimiento, marca anti-reintento, locks y verificación
transaccional de todas las tablas/huellas; solo aplica el SQL de este manifiesto.
No usar migrate deploy ni repetir la migración anterior. Manual-recovery no aplica
DDL; la aplicación del nuevo manifiesto solo se probó en bases desechables.

Escrituras de esa futura aplicación: tres funciones y sus ACL, más 1 fila de
bookkeeping Prisma con nombre/checksum exactos en la transacción administrativa.
Esperado después: Scenario/Submission/Event **1/1/0**, RecoveryLab/Decision/Successor
**0/0/0**, marcador y todas las huellas anteriores intactos. Tener funciones
instaladas no autoriza crear el sucesor ni realizar solicitudes Stripe.

### Inspección estrictamente READ ONLY

Desde la raíz, en una terminal local Git Bash privada:

```bash
git pull --ff-only origin main
pnpm stripe:sandbox:manual-recovery --inspect
```

Verifica auth.users provisionado y membresías por SELECT y vuelve a consultar el
escenario con rol delivery_api y las políticas RLS. **No hace password grant**,
no crea sesiones Auth ni modifica PostgreSQL. Su salida declara
operatorAuthenticated=false, sessionAbsenceConfirmed=false y muestra conteos,
estado y bloqueos técnicos sanitizados. No confundir esa identidad provisionada
con la autenticación humana requerida para escribir. Puede inspeccionar antes
de aplicar la nueva migración y reporta MANUAL_FUNCTION_MIGRATION_PENDING.

### Expediente privado obligatorio y propuesta offline

No se ha fabricado evidencia ni expediente real. El error HTTP 400 reportado no
sustituye el extracto oficial con requestId ni la revisión independiente. Tras
autorizar/aplicar solamente el DDL nuevo, preparar en una carpeta privada ignorada,
por ejemplo `.local/stripe-manual/recovery-dossier`, estos archivos:

- `evidence.json`: contrato RecoveryEvidence de 16 campos ya documentado, con
  requestId oficial, cuenta/escenario/reviewer/HEAD, API fija, snapshot completo de
  Submission y hash del extracto. No inventar ni cambiar valores para que valide.
- `stripe-error.json`: extracto privado revisado con status=400, accountId,
  scenarioId, requestId, apiVersion y response.error.type/param correspondientes.
  Retirar Authorization, claves, tokens y URLs tokenizadas antes de custodiarlo.
- `manual-review.json`: contrato de 14 campos: version=1, scenarioId, accountId,
  stripeRequestId, reviewedBy, reviewedAt, source=stripe-request-and-session-history-reviewed,
  originalAttemptConfirmed, noSessionConfirmed, noOtherPostConfirmed,
  notInferredFromHttp400, windowFrom, windowTo, artifactDigest. Las cuatro
  confirmaciones deben provenir de revisión explícita y ser true; nunca se
  completan automáticamente por existir el 400 o ser sessionId NULL.
- `stripe-history-review.txt`: segundo documento privado, exportación/referencia
  revisada de solicitudes y sesiones de la misma cuenta/ventana; su digest debe
  coincidir con manual-review y ser distinto del extracto del error. Describe
  cómo se verificó correspondencia del intento y ausencia de otros POST/sesiones
  contradictorias. La ventana cubre startedAt y llega a la última hora. Si no puede
  acreditarse, conservar bloqueo y documentar lo faltante; no enviar consultas Stripe.

Fechas ISO UTC canónicas, actor sintético provisionado y cuenta/escenario exactos.
La revisión es humana; los digests no constituyen una firma de Stripe. Los hashes
de filas/keys y los contenidos se mantienen privados y nunca se imprimen.

Comando futuro que **no crea sucesor ni autentica contra Auth**:

```bash
pnpm stripe:sandbox:manual-recovery --propose .local/stripe-manual/recovery-dossier
```

Exige nueva migración aplicada y checkout limpio. Todos los accesos PostgreSQL son
READ ONLY; crea solo `.local/stripe-manual/recovery/UUID_OPERACION/` protegido con
ACL/modo privado, con proposal.json y dossier-reference.json, sin copiar secretos
o extractos. Devuelve UUID operativo, SHA-256 de la propuesta canónica y caducidad
<=1h. Fija HEAD/cuenta/actor/escenario/instancia/configuración física, snapshot,
catálogo/índices/constraints/triggers/permisos, digests del expediente/revisión y
payload corregido. Efectos declarados: 1 Decision, 1 Successor, 0 updates históricos,
0 Stripe; conteos fuente 1/1/0/0/0. No acredita autenticación del operador.

### Otra autorización futura: exactamente una decisión y un sucesor

Revisar expediente, HEAD y SHA de la propuesta, identidad física y cuenta en
privado, huellas/conteos, plazo y efectos. Esta aprobación es independiente del
DDL y de cualquier ensayo Stripe. Solo entonces preparar `authorization.json`
en el directorio operativo, con exactamente: version=1,
operation=manual-recovery-1-decision-1-successor, operationId, authorized=true,
head, proposalSha256 y expiresAt ISO vigente <=1h y <=caducidad de la propuesta.
La herramienta no crea autorizaciones. No hay archivo de aprobación generado
en este incremento ni permiso para ejecutar el comando siguiente:

```bash
pnpm stripe:sandbox:manual-recovery --execute UUID_OPERACION SHA256_PROPUESTA
```

Exige frase oculta `AUTORIZO RECUPERACION LOCAL SHA256_PROPUESTA` y revalida después
del prompt. Escribe una marca privada operation-started.json **antes del login**.
Solo tras esa aprobación usa las credenciales existentes del usuario sintético
en el password grant oficial de Auth local, valida el token en GET /user con el
autenticador existente y compara subject; token en memoria, sin exportar/persistir.
Ese login tendrá sus escrituras normales de sesiones Auth en la instancia manual:
también quedan incluidas en la futura autorización; no ocurren en inspect/propose.
Revalida perfil/HEAD/caducidad después del login y conserva Auth/RLS.

Una transacción runtime llama a manual_prepare: locks de sucursal/escenario y
FOR SHARE de Submission/membresías; comprueba marcador físico y rol restringido,
ausencia de laboratorio, datos sintéticos, evidencia/revisión/propuesta vigentes,
checkpoint viejo exacto, sin bindings/eventos/leases o decisiones previas.
Estado unknown solo se admite con ese checkpoint y revisión completos; cualquier
unknown distinto sigue bloqueado. **Inserta 1 RecoveryDecision y 1 Successor**
del mismo escenario MXN 4400, con UUID/key nuevos y payloadDigest corregido.
La decisión guarda base de evidencia más manualReview/manualProposal/SHA de
operación inmutables. No actualiza ningún campo, versión, lease o timestamp del
intento anterior. Compara snapshot y catálogo antes/después y exige conteos
1/1/0/1/1; registra after.json privado con identidad del sucesor y resultado.

UNIQUE/FK, locks y transacción impiden duplicación. Error, pérdida de respuesta o
commit incierto: conservar expediente/marca, **no reintentar ni borrar la marca**,
no fabricar after.json y no generar otro escenario. Inspeccionar/revisar antes de
otra acción. Rollback parcial se prueba solo en bases desechables.

### Plan v2 separado, sin solicitudes externas

Después de una recuperación local aprobada y confirmada:

```bash
pnpm stripe:sandbox:manual-recovery --plan UUID_OPERACION
```

Solo READ ONLY y archivo privado plan-v2.json: vincula sucesor/decisión/cuenta/HEAD/
payload/SHA, MXN 4400, <=1h y presupuesto futuro máximo 2 requests/1 Session,
readyForExternalCalls=false. No inicia otro login ni acredita autorización externa.
El ejecutor externo de sucesores no se implementa en este corte; un futuro ensayo
necesitará nueva revisión y autorización de su plan/HEAD/hash/límites/ventana.
FinancialEligibility=false, Delivery y despacho permanecen sin cambios.

Pruebas reproducibles sin tocar manual/histórica: `pnpm check` y
`node --experimental-strip-types scripts/local/check-manual-recovery.mjs`.
El segundo crea su propio PostgreSQL sin red/puertos/montajes, con evidencia
marcada artificial; prueba perfiles/actor/cuenta/HEAD/plazos/conflictos, RLS,
rollback parcial, dos procesos/repetición/lost-ack y preservación completa.

## Webhook privado, fase posterior

El receptor preparado solo escucha loopback temporal y delega firma/raw bytes al
adaptador; no hay endpoint público en API. Un relay saliente de Stripe CLI podrá
reenviar eventos al puerto local una vez aprobado. Su whsec es distinto del de
un endpoint Dashboard; no intercambiarlos. Capturarlo por canal privado sin
banner/log, cargarlo en memoria y verificar HMAC antes de JSON. No instalar,
autenticar ni ejecutar Stripe CLI/túneles en este incremento.
La API fija sigue siendo `2026-09-30.endive`, verificada en
[stripe-node v23.0.0](https://github.com/stripe/stripe-node/blob/v23.0.0/src/apiVersion.ts)
y la [referencia oficial](https://docs.stripe.com/api/versioning). No se configura
desde env. La versión de cuenta, el header `Stripe-Version` del runner y la versión
del destino son independientes: el header no cambia los eventos Snapshot.
`2022-11-15` visto en Dashboard no acredita compatibilidad y se rechaza.

En una fase aprobada por separado, configurar destino **Snapshot**, cuenta propia
del sandbox sin Connect/organización, `api_version=2026-09-30.endive` y solo los
tipos de la allowlist del contrato. Si Dashboard no ofrece esa versión, detener:
revisar sandbox/Workbench y configuración explícita por API con aprobación aparte.
No actualizar globalmente la cuenta ni elegir otra versión como sustituto.
No crear destino ahora. Un relay privado también deberá demostrar la versión
exacta en un evento firmado; no asumir que hereda el header del runner.
HMAC y `event.api_version` siguen obligatorios; versiones diferentes y Thin events
se rechazan antes de consultas. [Versionado Snapshot](https://docs.stripe.com/webhooks/versioning).
Ver [CLI](https://docs.stripe.com/cli) y
[firmas](https://docs.stripe.com/webhooks/signature). No hay comando de listener
remoto habilitado: requiere aprobación de TTL, tipos y presupuesto GET separado.

## Aprobación pendiente y riesgos

Fundador: aprobar sandbox/cuenta y alcance de clave, hash/HEAD exactos, ventana
temporal, una Session de MXN 44.00 y dos solicitudes máximo; aceptar que una
respuesta incierta exige revisión. Aprobar por separado webhooks/relay y ensayos
con tarjetas ficticias. Revisar PII/retención y custodia local. Test doubles no
demuestran aceptación de cuenta, captura, reembolso o disputa auténticos.
Preflight continúa readyForExternalCalls:false; ninguna variable desbloquea CI,
production, portal o elegibilidad. No hay aprobación productiva en este documento.
