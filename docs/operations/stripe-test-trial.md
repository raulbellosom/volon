# Primer ensayo Stripe Test — preparado, ejecución todavía no autorizada

Issue #25 / ADR-0019. Solo prepara código; ninguna solicitud Stripe fue ejecutada.
No portal, Delivery, dinero real ni despacho. Conekta/Openpay siguen alternativas.

## Cuenta y claves locales (#26)

1. Entrar personalmente al Dashboard oficial, crear/seleccionar un sandbox dedicado
   y comprobar visualmente el entorno de prueba y su accountId. No activar Live.
2. El sandbox ya fue creado por el fundador. Se aceptan `rk_test_` (preferida)
   y `sk_test_`; se rechazan absolutamente claves Live. Revisar los permisos abajo.
3. Guardar `STRIPE_SANDBOX_ACCOUNT_ID` y `STRIPE_SANDBOX_API_KEY` exclusivamente
   en `.env.local` privado, ignorado por Git y con acceso limitado al operador.
   No exportar variables Stripe al proceso: el runner rechaza esa ambigüedad.
   Nunca pegar valores en chat, Issue, argv, captura, log ni archivo versionado.
   Si la terminal está grabándose/compartida, detenerse.
4. La clave se mantiene en memoria durante el comando; no se garantiza borrado
   físico de strings, memoria, swap o clipboard. Revisar custodia antes de usarla.

`STRIPE_SANDBOX_WEBHOOK_SECRET` y `STRIPE_SANDBOX_PUBLISHABLE_KEY` son opcionales:
omitirlas si no existen; no dejar asignaciones vacías. Si están presentes se
validan `whsec_` y `pk_test_`. Publishable queda reservada, sin uso ni frontend.
Solo el runner interactivo consume la clave tras comprobar TTY y barreras locales;
no instala secretos en process.env. Los dos preflights no leen `.env.local`.
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

Issue #27: herramienta oficial del repositorio, sin descargas, here-doc, stdin ni
PowerShell. Desde Windows Git Bash, con Docker activo y el checkout actualizado:

```bash
cd /d/RacoonDevs/volon
pnpm local:up
pnpm stripe:sandbox:fixture --dry-run
pnpm stripe:sandbox:fixture --create
```

Si el stack ya está provisionado, bastan las dos líneas `stripe:sandbox:fixture`.
`.env.local` debe estar ignorado y no versionado. La herramienta solo consume
`STRIPE_SANDBOX_ACCOUNT_ID`, `MIGRATION_DATABASE_URL`, `SUPABASE_URL` y
`LOCAL_SYNTHETIC_MODE`: no solicita, valida, usa ni exporta la API key, ni necesita
password del usuario, bearer o publishable key. El parser lee el archivo privado
sin cargarlo en process.env y descarta los demás campos. Rechaza variables
heredadas que entren en conflicto, CI/cloud/production, TLS/proxy inseguros y DB
distinta de `postgresql://postgres:…@127.0.0.1:56322/postgres?schema=app`, con
Supabase `http://127.0.0.1:56321` y modo sintético explícito. No requiere TTY.

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
No hay migraciones, limpieza, reinicio de intentos, llamadas Stripe ni secretos
en la salida. El ejecutor de planes/pagos sigue usando su rol runtime restringido.

Copiar solo el `ESCENARIO_UUID` devuelto al siguiente comando de Git Bash:

```bash
pnpm stripe:sandbox:preflight
pnpm stripe:sandbox:trial --preflight
pnpm stripe:sandbox:trial --plan create UUID_DEL_ESCENARIO
```

Plan pide el bearer local sin eco y verifica Auth/RLS; hace cero consultas Stripe.
Devuelve JSON público mínimo y SHA-256. No es autorización. Revisar HEAD, cuenta,
escenario, MXN 44.00, dos requests máximo, un POST, cero checkout completado,
cero tarjetas, cero reintentos y vencimiento de la aprobación operacional.
El plan se guarda en `.local/stripe-trial-plan.json`, sin secretos, con vigencia
máxima de una hora. Volver a planificar sobrescribe solo ese documento público.

## Comandos preparados, NO ejecutar todavía

```bash
pnpm stripe:sandbox:trial --create UUID_DEL_ESCENARIO SHA256_DEL_PLAN
pnpm stripe:sandbox:trial --plan reconcile UUID_DEL_ESCENARIO
pnpm stripe:sandbox:trial --reconcile UUID_DEL_ESCENARIO SHA256_DEL_PLAN
```

Create exige teclear `AUTORIZO STRIPE TEST SHA256_DEL_PLAN` en entrada oculta;
la clave procede de `.env.local`. GET /v1/account debe coincidir con archivo,
plan y escenario antes del POST. No se compone transporte antes de confirmar.
Se valida livemode=false en objetos, importe/moneda/binding y clave idempotente.
No abre Checkout ni devuelve URL tokenizada. El regreso del navegador no acredita pago.
Reconcile tiene plan separado, cuatro GET máximo y necesita Session ya enlazada.

Unknown/crash/commit incierto: **detener**, conservar escenario y key/hash en DB;
no repetir create ni crear otro fixture para saltar el bloqueo. Si existe binding,
revisar/autorizar reconcile. Sin binding se necesita investigación y aprobación
de recuperación con la misma clave antes de 23 h; el runner no la automatiza.

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
