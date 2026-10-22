# Stripe Checkout — laboratorio #23 / persistencia #24 / preparación HTTPS #25

## Recuperación auditable offline #26

ADR-0021: solo implementación y pruebas desechables. Tablas nuevas RecoveryLab,
RecoveryDecision y Successor bajo el prefijo StripeSandbox, sin cambiar Submission.
Decisión inmutable ligada al escenario/submission, evidencia HTTP 400 revisada y
snapshot completo; UNIQUE escenario y UNIQUE decisión consumida. Sucesor inmutable
prepared-offline, UUID/key/digest nuevos y MXN 4400. RLS hereda dueño/membresía.
Creación transaccional privada con locks y comprobación de incertidumbre; sin
transporte ni autorizaciones productivas. El perfil manual queda bloqueado.
Plan v2 independiente del runner v1; no habilita `--create` ni HISTORY_BLOCKED.
Contrato y límites en ADR-0021 y procedimiento propietario en el runbook.

Estado: código de sandbox aislado autorizado por el fundador el 2026-10-19;
**cero llamadas externas**, sin credenciales ni cobros en este incremento.
RF-022 / DEC-03 / [Issue #23](https://github.com/raulbellosom/volon/issues/23).
[ADR-0017](../decisions/0017-stripe-checkout-offline.md), base [#20](service-payments.md).

## Frontera

StripeCheckoutTestAdapter implementa SandboxCheckoutPort, separado del futuro
PaymentProviderPort: devuelve observaciones marcadas `scope: 'offline-test'` y
`eligible: false`, nunca VerifiedProviderEvidence. Sin wiring en app/main, HTTP,
portal, courier, dispatcher o tablas ServicePayment*. El transporte predeterminado
deniega. #25 añade un transporte HTTPS opt-in preparado, sin activación ni llamadas
a Stripe en este corte; sus pruebas utilizan servidores controlados loopback.
API Stripe fija `2026-09-30.endive`, verificada en stripe-node v23.0.0. No dependencia
nueva: HMAC SHA-256 equivalente al protocolo documentado, crypto de Node fijado por
el proyecto. Ningún valor de webhook, metadata o redirect concede permisos.

## Comandos internos v1

`create(actor, {intentId})`, `reconcile(actor, {intentId})` y
`observe(actor, {intentId}, rawBytes, stripeSignature)`. UUID canónico, objeto exacto;
sin importes, moneda, URLs, cuenta, entorno o IDs de Stripe enviados por cliente.
Actor es subject verificado por el llamador; el almacén de fixtures debe reautorizar
pertenencia efectiva en cada operación, antes de replay. No hay autenticación nueva.

El puerto de almacén carga exclusivamente fixtures aislados del servidor: propósito
explícito, intentId sin FK a Delivery, importe MXN entero de 1,000–99,999,999 centavos,
binding inmutable de sesión/PaymentIntent/charge, comando y eventos. No se reutiliza
ServicePaymentAttempt.not_submitted para representar envío. El almacén en memoria
de #23 fue sustituido por PostgreSQL en #24 mediante el protocolo siguiente.
La persistencia no autoriza sandbox remoto.

## Persistencia aislada #24

[ADR-0018](../decisions/0018-stripe-sandbox-persistence.md). Tres tablas nuevas:
`StripeSandboxScenario` (UUID opaco, owner subject, merchant/branch, cuenta de
fixture, MXN sintético, enabled, purpose offline-test), `StripeSandboxSubmission`
(PK/FK escenario/cuenta, key/hash inmutables al primer envío, startedAt, binding
Session/PI/Charge únicos por cuenta, state, adverse, leaseToken/leaseUntil,
version/changedAt servidor) y `StripeSandboxEvent` (cuenta/eventId único, FK al
escenario, digest, state del recibo, version, receivedAt). Sin FK a Delivery.
Los escenarios se aprovisionan únicamente con fixtures administrativos locales.
Issue #27 incorpora `pnpm stripe:sandbox:fixture --dry-run|--create`: aprovisionador
administrativo local separado del runner, identidad Auth/membresía A ya provisionada,
MXN 4400 offline-test, sin API key ni HTTP. Read-only en dry-run; create/reuse con
advisory lock transaccional por sucursal y locks de escenario contra submission.
Un solo escenario exacto habilitado sin submission es reutilizable. Múltiples,
incompatibles o cualquier submission/historial bloquean, incluso tras cambiar
cuenta/importe/propietario; sin reset, borrado o nueva fixture de evasión.
No modifica RLS, tablas, enums, endpoints ni elegibilidad. Configuración, salida y
comandos Git Bash en el [runbook](../operations/stripe-test-trial.md).
Diagnóstico #26: `stripe:sandbox:history --inspect` agrega escenarios/submissions/
eventos sin exponer identificadores, claves o hashes, bajo SQL READ ONLY y snapshot
repetible. No clasifica procedencia como certificada: esta no existe en el esquema.
Integraciones automatizadas rechazan configuración manual STRIPE_SANDBOX_* antes
de conexiones; el aislamiento físico permanente sigue propuesto y requiere revisión.
Ninguna etiqueta del reporte excluye filas del bloqueo ni autoriza remediación.

Todas FORCE RLS: contexto offline-test-v1, subject propietario exacto y Branch
visible por membresía vigente/comercio/sucursal habilitados; escenario habilitado.
El rol runtime restringido no crea ni cambia escenarios, elimina filas o modifica
eventos. Rechaza conexiones administrativas antes de acceder a estados/secretos.
La revocación impide replay, reserva y confirmación; una reserva previa no concede
derechos futuros. Sin contexto, registros o permisos se deniega.

Puerto sin callbacks: `reserve(actor,id,account)` devuelve snapshot+token+versión;
`save(actor,reservation,release)` confirma mediante CAS. Reserva transaccional
breve → checkpoint de key/hash → transporte simulado SIN transacción/lock SQL →
confirmación atómica. Lease 30 s, máximo 60 s; vencido o reemplazado devuelve
VERSION_CONFLICT; activo en otro trabajador devuelve REQUEST_BUSY (reintento
explícito con backoff, sin espera del proveedor dentro de SQL). Fechas de primer
envío, recepción y cambios proceden de PostgreSQL. Estado inicial pending;
reserva interrumpida con key existente se recupera como unknown. Un binding
existente evita nuevo POST; sin binding se conserva la clave y el límite de 23 h.
La exclusión de leases no promete exactamente un HTTP tras crash: se exige la
misma idempotencia del proveedor simulado para una sola sesión lógica.

Checkpoint de adverso firmado ya enlazado antes del await de proveedor;
refund/disputa son monotónicos en SQL. Eventos finales se insertan con la
proyección en una sola transacción; no se consumen al fallar binding/consulta.
Replay requiere firma fresca válida, mismo digest y autorización actual; el
recibo conserva adversos posteriores. No se guardan mensajes libres, JSON de
proveedor, cuerpos ni secretos. Máximo 1,000 eventos por escenario de laboratorio;
superarlo falla cerrado. Ninguna tabla ni observación habilita elegibilidad.

POST `/v1/checkout/sessions`: mode=payment, métodos dinámicos, captura automática, MXN y una
línea de logística de cantidad 1. Importe sale del fixture autorizado. Correlación
client_reference_id/metadata informativa; nunca se localiza binding mediante metadata.
Se omiten `payment_method_types` y `allowed_payment_method_types`; Stripe selecciona
los métodos elegibles de la configuración del sandbox. Este corte solo propone
crear una sesión, sin abrir/completar Checkout ni autorizar métodos de pago nuevos.
Una futura restricción explícita a tarjetas requerirá revisar la versión/soporte
de `allowed_payment_method_types` y aprobar un payload/plan nuevo, sin fallback.
El digest de envío sigue SHA-256(API-version + ':' + account + ':' + form-encoded).
Eliminar el selector cambia ese digest; no actualiza hashes, claves o intentos
persistidos. El algoritmo de idempotencia existente no se modifica para sortearlos.
Tras el HTTP 400 reportado en #26, una recuperación con payload diferente requiere
un contrato aditivo de decisión e intento sucesor inmutables, enlazados al escenario
y al intento original; key nueva por intento y plan versionado independiente.
ADR-0021 implementa la migración aditiva y el núcleo de preparación exclusivamente
para instancias desechables; no hay habilitación manual ni ejecutor externo.
Conserva HISTORY_BLOCKED y el almacenamiento histórico actual.
Procedimiento y aprobaciones previas en el [runbook](../operations/stripe-test-trial.md).
Clave idempotente estable por cuenta/fixture, hash de parámetros/URLs reservado antes
del envío. Replay devuelve la misma sesión, cambio de parámetros falla. Timeout
conserva reserva y retorna unknown sin retry automático; retry explícito conserva
clave/cuerpo. Tras 23 h sin sesión vinculada se bloquea nuevo POST y exige revisión
(margen conservador frente a limpieza de claves Stripe a partir de 24 h).

URLs de retorno se construyen en servidor desde origen loopback HTTP con puerto
explícito y rutas fijas `/stripe-test/success` y `/stripe-test/cancel`. La URL de
Checkout recibida se valida contra checkout.stripe.com y se descarta: no se publica.
No existen esas rutas HTTP ni callback que confirme dinero.

## Firmas, binding y reconciliación

Snapshot del cuerpo original antes de cualquier await, máximo 64 KiB; UTF-8 estricto.
Firma v1 HMAC SHA-256 sobre timestamp + punto + bytes originales, comparación constante,
tolerancia simétrica ±300 s de reloj servidor y hasta 8 firmas para rotación. No
parsear JSON antes de verificar. Encabezado máximo 4 KiB; timestamp único. Rechazar
livemode=true, API version distinta, eventos/contexto Connect y tipos inesperados.
El secreto de endpoint es exclusivo de la cuenta configurada; GET autenticado de
`/v1/account` verifica el scope antes de solicitudes de sesión/pago. Solo rk_test/sk_test; rechazar Live,
configuración production y cuentas distintas; no imprimir claves, firmas o cuerpos.

Allowlist: checkout.session.completed/async_payment_succeeded/async_payment_failed/
expired; payment_intent.succeeded/payment_failed/canceled; charge.refunded;
charge.dispute.created/updated/closed. ID de evento único por cuenta/fixture:
duplicado de mismos bytes se ignora sin consulta/efecto; otro digest falla. El
almacén impone unicidad global de IDs externos y event.id; replay conserva cualquier
suspensión posterior por refund/disputa, sin volver a mostrar captured_test.
El ID de recurso debe coincidir con binding servidor; evento previo al binding
se rechaza sin consumirlo. La fecha del evento no gobierna el estado: se consulta
estado actual. Refund/disputa observados son conservadoramente pegajosos, incluso
ante eventos posteriores de éxito; no reactivación automática por disputa cerrada.

GET Session, PaymentIntent y Charge con IDs enlazados, no URLs del mensaje. Validar
IDs, tipo de objeto, livemode=false, mode=payment, cuenta, moneda e importe.
Un PI puede tener cargos rechazados sucesivos: se consultan sin fijarlos como
captura; el binding de Charge se congela al éxito del PI o evidencia adversa.
`captured_test` requiere Session completa/paid, PI succeeded con amount_received total
y Charge pagado/capturado completo, sin importe reembolsado ni disputa. Autorización,
captura pendiente, falta de charge o sesión completed/unpaid nunca bastan.
Estados: pending, unknown, failed, capture_pending, captured_test, expired, refunded,
disputed. Refunded significa observación de devolución parcial o total, no liquidación.
Se devuelve `{scope:'offline-test', intentId, sessionId, state, eligible:false,
duplicate}`. No PII, URL, raw body, bearer, client_secret, hashes ni metadata.
Refund/disputa del evento suspende aunque la consulta vaya atrasada. Los demás
eventos solo motivan lectura autenticada; no reescriben estado a partir del payload.

Transporte tipado inyectado, URL base fija api.stripe.com, headers de autenticación
y Stripe-Version controlados, AbortSignal y timeout 5 s, respuesta máxima 256 KiB.
Sin reintentos implícitos. 5xx/429/timeout => unknown; 4xx => PROVIDER_REJECTED,
respuesta malformada/discrepante => RESPONSE_MISMATCH. Otros errores internos:
INVALID_COMMAND, CONFIGURATION_INVALID, NOT_FOUND, IDEMPOTENCY_CONFLICT,
RETRY_WINDOW_EXPIRED, INVALID_SIGNATURE, EVENT_REJECTED, REPLAY_CONFLICT,
INFRASTRUCTURE_UNAVAILABLE, REQUEST_UNKNOWN y TRANSPORT_DISABLED. Nunca se incluyen
mensajes externos en errores. Una firma adversa ya enlazada conserva suspensión
ante timeout y el evento queda reintentable hasta completar reconciliación.

## Preflight y fase siguiente

### Preparación manual #25

[ADR-0019](../decisions/0019-stripe-test-https-preparation.md),
[runbook](../operations/stripe-test-trial.md). Ningún componente de app/main importa
el transporte HTTPS. Solo el ejecutor manual puede componerlo explícitamente.
HTTPS a api.stripe.com:443, TLS >=1.2, CA incorporadas de Node/hostname verificados,
DNS IPv4 público sin destinos privados/reservados. No URL base, proxy, CA o DNS
configurables por el cliente; no redirects. GET account/Session/PaymentIntent/Charge
y POST checkout/sessions exactos; sin queries, Connect, otros headers o endpoints.
Timeout total 5 s, cancelación AbortSignal, headers 8 KiB, body 16 KiB y respuesta
256 KiB medidos durante streaming; sin compresión o errores crudos. Sin retries.

Plan SHA-256 determinista: versión, HEAD, escenario/propietario/cuenta autorizados,
MXN 4400, origen loopback fijo, operación y presupuesto. Primer create: dos
solicitudes máximo y un POST con cuerpo/clave servidor exactos; reconcile: cuatro
GET sobre bindings persistidos, cero POST. Plan no concede permisos por sí mismo.
Crear requiere escenario sin intento previo: key existente, timeout o crash
impiden otro POST manual, aun si la reserva expiró; se conserva para revisión.
El runner no aprovisiona escenarios ni acepta importes/URLs/subject del cliente.
Un operador local prepara el fixture administrativo antes del plan.

TTY local sin CI/GITHUB_ACTIONS/cloud/production, modo sintético y servicios
127.0.0.1:56321/56322 obligatorios. Extensión #26: cuenta/clave exclusivamente de
`.env.local` privado tras barrera TTY/local, sin exportarlas a process.env. Cuenta
del archivo debe coincidir con escenario/plan bajo RLS al planear y ejecutar.
Confirmación literal del hash antes de componer transporte; JWT/hash sin eco.
Sin fallback a argv ni variables Stripe heredadas;
se rechazan Live, proxies, inspector y configuración TLS insegura. JWT local
también oculto y verificado por Supabase; DB runtime restringida/RLS actual.
Para crear/consultar no se requiere inventar un whsec; observe sí lo exige.
Publishable pk_test opcional, validada pero sin uso. Opcionales ausentes se omiten;
vacíos/Live fallan. Preflight no lee el archivo, incluso en CI. Futuros destinos
Snapshot deben fijar api_version=2026-09-30.endive independientemente de la cuenta;
2022-11-15 y Thin events se rechazan. Permisos, configuración y fuentes oficiales
revisadas 2026-10-20 en el runbook propietario.

Receptor temporal: 127.0.0.1, puerto efímero, POST /stripe-test-events, sin Origin,
cookies ni compresión; raw body <=64 KiB y firma <=4 KiB, TTL <=10 min y máximo
20 solicitudes. HMAC antes del parseo/consulta, binding y dedup durable del #24.
HTTP 200 solo después del evento registrado o replay durable; una observación
unknown/adversa sin recibo de evento no se confirma. Fallos transitorios = 503,
mensajes falsos/inválidos = 400, sin detalles. El puerto observe original mantiene
su DTO; observeRecorded aporta exclusivamente esta señal interna de confirmación.
No se monta en API ni se abre automáticamente. Futura recepción: relay saliente
aprobado de Stripe CLI → loopback privado; secreto del relay en memoria por canal
oculto, sin volcar su banner/logs. Sin configurar CLI, túneles o endpoints ahora.
Su arranque y presupuesto de consultas de reconciliación requieren otro plan.

scope offline-test se conserva como etiqueta histórica de laboratorio, no como
afirmación de que un futuro comando manual no hizo red. El reporte del ensayo
debe distinguir intentos HTTPS reales de fixtures. eligible siempre false.

`pnpm stripe:sandbox:preflight` es inspección offline, siempre
`readyForExternalCalls:false`. Solo clasifica presencia/formato de
STRIPE_SANDBOX_API_KEY, STRIPE_SANDBOX_WEBHOOK_SECRET y STRIPE_SANDBOX_ACCOUNT_ID
sin mostrar valores ni leer archivos de secretos. Ausencia es un bloqueo esperado;
live/production/configuración inválida falla. No crea cuenta, claves, túneles ni listen.

Faltan: autorización separada de llamadas de prueba y presupuesto/casos exactos,
cuenta Test y aceptación comercial, gestor seguro de secretos del entorno,
revisión humana de la persistencia #24, transporte HTTPS limitado y auditado,
estrategia privada de recepción/replay de webhooks, revisión de PII y retención.
La migración aditiva #24 materializa el protocolo de persistencia anterior.
No modifica recibos históricos ni permite conectar fixtures a Delivery o al gate. HTTP remoto y elegibilidad real
requieren contratos y autorización nuevos; aprobar Stripe Test no los autoriza.

Pruebas posteriores controladas: tarjeta de prueba exitosa, rechazo/3DS, async,
expiración, timeout/replay, cuerpo alterado, duplicados/desorden, cuenta/moneda/
importe erróneos y devolución/disputa con consulta. Ninguna prueba de este corte
acredita un pago Stripe real ni ACC-014 comercial. #24 prueba replay PostgreSQL tras
reinicio de proceso; no restaura backups ni demuestra semántica de un PSP real.

Reproducir localmente con fixtures sintéticos: `pnpm local:up`,
`node scripts/local/check-clean-migrations.mjs`, `pnpm check`,
`pnpm test:integration`, `pnpm stripe:sandbox:preflight`.
Las pruebas stripe-persistence/recovery/storage-security verifican Auth local,
20 operaciones concurrentes, SIGKILL tras POST simulado, lease vencido, CAS tardío,
fallos SQL, pérdida de acuse después de commit, replay y revocación. No configurar
STRIPE_SANDBOX_* para estas pruebas; solo utilizan valores artificiales en memoria.

Fuentes oficiales consultadas 2026-10-19: [versión estable](https://github.com/stripe/stripe-node/blob/v23.0.0/src/apiVersion.ts),
[crear Session](https://docs.stripe.com/api/checkout/sessions/create), [firma/replay](https://docs.stripe.com/events/set-up-events),
[idempotencia](https://docs.stripe.com/api/idempotent_requests), [Session](https://docs.stripe.com/api/checkout/sessions/object),
[PaymentIntent](https://docs.stripe.com/api/payment_intents/object), [Charge](https://docs.stripe.com/api/charges/object),
[Dispute](https://docs.stripe.com/api/disputes/object). Retirar el adaptador conserva datos y denegación operativa.


## Instancia manual aislada (#26, ADR-0020)

El runner y la fixture manual aceptan exclusivamente 127.0.0.1:57321/57322,
`manual-stripe-test-v1` y UUID de instancia. Configuración privada explícita desde
`.env.stripe-manual.local`, sin process.env ni credenciales en contenedores.
HTTPS valida metadatos no secretos y comprueba Docker/marcador por solicitud;
el plan sigue fijando HEAD/cuenta/hash/ventana/presupuesto y aprobación independiente.
La configuración histórica 56321/56322 se admite solo para inspección de lectura.

Contrato operativo local fuera de migraciones compartidas: singleton
`local_control.Environment` con `instanceId` UUID único, `purpose` fijo,
`accountId`, `systemIdentifier`, `createdAt`. Lo crea solo el aprovisionador sobre
el volumen manual nuevo y vacío. Sin permisos de escritura runtime; SELECT bajo
FORCE RLS. No es evento financiero ni evidencia PSP. Procedencia privada vincula
ese marcador con recursos Docker y huella del historial previo; discrepancias
bloquean sin remediación automática. No modifica tablas ni RLS de negocio.
Integraciones rechazan configuración manual antes de crear clientes; CI siempre
usa su propio stack desechable sin secretos Stripe. Procedimiento en el runbook.

El ejecutor manual autentica `merchant-a@example.test` mediante password grant
local con credenciales del archivo privado manual. Valida access token con el
autenticador existente y exige el subject provisionado antes de cargar el plan
bajo RLS. Token/refresh token nunca se persisten, exportan ni muestran. Tras la
aprobación humana repite el login, exige el mismo subject y conserva todas las
validaciones de plan/transporte. Errores de Auth sanitizados, sin redirects ni
reintentos. No hay input manual de Bearer ni cambios de permisos o elegibilidad.

## Migración administrativa manual preparada (#26)

`stripe:sandbox:migration --inspect|--prepare` verifica exclusivamente la manual
57322: procedencia Docker, volumen/red/puertos, nonce y system_identifier,
cuenta privada y conexiones administrativas/runtime READ ONLY con RLS vigente.
No autentica contra Auth ni construye transporte Stripe. Solo puede estar pendiente
`20261022034450_stripe_sandbox_audited_recovery`; SQL fijado al blob aprobado y
SHA-256 público, historial Prisma completo y working tree equivalentes salvo CRLF.

Prepare respalda PostgreSQL completo más globals en archivos privados ignorados;
compara huellas de todas las tablas, secuencias, roles/membresías y large objects.
Prueba restauración y aplicación solo en contenedor efímero sin red/puertos/montajes.
Registra HEAD, identidad, schema, huellas/conteos y SHA de archivos en un preflight.
La fuente debe permanecer idéntica. No genera aprobación ni modifica PostgreSQL manual.

El futuro `--apply UUID_PREFLIGHT SHA256_PREFLIGHT` exige autorización privada
independiente, HEAD/SQL/preflight exactos, respaldo probado/intacto, vigencia,
TTY local y confirmación oculta. Revalida instancia y filas después de confirmar.
Una transacción con locks aplica exclusivamente el blob SQL aprobado e incorpora
una fila Prisma. Verifica huellas antes/después dentro de esa transacción; aborta
ante cambios, otra migración o tablas de recuperación no vacías. Marca de intento
privada impide reintento automático incluso ante pérdida de acuse.
Recuperación manual y Stripe siguen bloqueados; no siembra RecoveryLab ni decisiones.
Procedimiento y reversión en el [runbook](../operations/stripe-test-trial.md).

## Recuperación manual local independiente (#26, ADR-0021)

`stripe:sandbox:manual-recovery` conserva la identidad `manual-stripe-test-v1` y
reutiliza Decision/Successor. La migración histórica auditada no cambia. La nueva
`20261022055840_stripe_sandbox_manual_recovery` solo agrega tres funciones privadas
con search_path fijo y EXECUTE a delivery_api: manual_ready, manual_catalog_digest
y manual_prepare. No cambia las funciones de laboratorio, tablas, marcador,
columnas, filas, RLS o permisos históricos. Aplicación manual pendiente de aprobación.

Inspect es READ ONLY, sin login: verifica identidad provisionada en auth.users y
membresías, alcance runtime bajo RLS, procedencia Docker/control/system_identifier,
cuenta/escenario/sucursal/comercio/importe y metadatos/checksum de migraciones.
Devuelve bloqueos sanitizados y requisitos de evidencia/autorización. Expone
operatorAuthenticated=false y no acredita ausencia de sesión por un binding NULL.
El login oficial crea registros Auth; solo se permite en la futura ejecución aprobada.

Propose también es READ ONLY en PostgreSQL; escribe únicamente archivos privados.
Reutiliza los 16 campos de RecoveryEvidence y el extracto HTTP oficial coincidente.
Requiere además revisión independiente de correspondencia del intento y del historial
de POST/sesiones, ventana que cubra startedAt y llegue a la última hora, actor/cuenta/
requestId coincidentes, originalAttemptConfirmed/noSessionConfirmed/noOtherPostConfirmed/
notInferredFromHttp400 explícitos y digest de un segundo documento privado distinto.
La revisión es humana, no una firma ni consulta automatizada a Stripe. Faltantes,
contradicciones, bindings/eventos, leases incluso vencidos o checkpoint distinto bloquean.

La propuesta local v1 fija UUID de operación, instancia/huella Docker/configuración,
escenario/actor/cuenta, HEAD, huellas de expediente/revisión/Submission/catalogo,
payload corregido, creación/caducidad <=1h, conteos 1/1/0/0/0 y efectos 1 Decision,
1 Successor, 0 updates históricos y 0 Stripe. Son privados; solo se imprime SHA de
la propuesta, UUID operativo y resumen. Autorización privada y confirmación oculta
independientes; una aprobación de migración no autoriza esta operación.

Execute valida todo otra vez, marca el intento local antes del login y autentica
el usuario sintético solo contra Auth 57321 con token en memoria y subject esperado.
Revalida perfil/HEAD/plazo después del login. La función SQL bloquea sucursal y
escenario, lee Submission FOR SHARE y comprueba cuenta/actor/rol, marker físico,
ausencia de RecoveryLab y conflictos, hash/key del payload rechazado, revisión y
digest exacto de propuesta. Inserta solo 1 Decision y 1 Successor en la misma
transacción; UNIQUE impide duplicación. Conserva cada campo original y verifica
catálogo/índices/constraints/triggers antes/después. La decisión guarda evidencia
base y manualReview/manualProposal/manualOperationSha256 como auditoría inmutable.
Sin respuesta o fallo: conservar marca/expediente, detener y no reintentar.

Plan usa el cargador común v2 bajo el contexto manual independiente y READ ONLY.
No requiere login, no habilita transporte y conserva maxRequests=2/maxSessions=1,
MXN 4400, <=1h, cuenta/HEAD/decisión/sucesor/payload/SHA y readyForExternalCalls=false.
El ejecutor v1 y el laboratorio continúan rechazando el intento/perfil manual.

El ejecutor administrativo reutilizado admite solo dos manifiestos fijos. El
default conserva el SQL auditado anterior; `--target manual-recovery` selecciona
exclusivamente las funciones nuevas con digest y commit de origen fijados. Cada
preflight/respaldo/autorización queda vinculado a su manifiesto; nombres, rutas,
hashes o perfiles arbitrarios y aprobaciones cruzadas se rechazan. No aplica
migraciones pendientes indiscriminadamente ni habilita la operación financiera.
