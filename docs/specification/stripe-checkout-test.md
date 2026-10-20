# Stripe Checkout — contrato offline #23

Estado: código de sandbox aislado autorizado por el fundador el 2026-10-19;
**cero llamadas externas**, sin credenciales ni cobros en este incremento.
RF-022 / DEC-03 / [Issue #23](https://github.com/raulbellosom/volon/issues/23).
[ADR-0017](../decisions/0017-stripe-checkout-offline.md), base [#20](service-payments.md).

## Frontera

StripeCheckoutTestAdapter implementa SandboxCheckoutPort, separado del futuro
PaymentProviderPort: devuelve observaciones marcadas `scope: 'offline-test'` y
`eligible: false`, nunca VerifiedProviderEvidence. Sin wiring en app/main, HTTP,
portal, courier, dispatcher o tablas ServicePayment*. El transporte predeterminado
deniega; no hay implementación fetch ni SDK con red. Solo test doubles lo ejercitan.
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
ServicePaymentAttempt.not_submitted para representar envío. Solo existen almacenes
transaccionales en memoria dentro de tests, con rollback y serialización por fixture.
Sin almacén durable no se autoriza sandbox remoto. Sus mutex no son locks SQL;
una futura implementación no debe sostener transacciones DB durante llamadas PSP.

POST `/v1/checkout/sessions`: mode=payment, tarjeta, captura automática, MXN y una
línea de logística de cantidad 1. Importe sale del fixture autorizado. Correlación
client_reference_id/metadata informativa; nunca se localiza binding mediante metadata.
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
`/v1/account` verifica el scope antes de solicitudes de sesión/pago. Rechazar sk_live,
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

`pnpm stripe:sandbox:preflight` es inspección offline, siempre
`readyForExternalCalls:false`. Solo clasifica presencia/formato de
STRIPE_SANDBOX_API_KEY, STRIPE_SANDBOX_WEBHOOK_SECRET y STRIPE_SANDBOX_ACCOUNT_ID
sin mostrar valores ni leer archivos de secretos. Ausencia es un bloqueo esperado;
live/production/configuración inválida falla. No crea cuenta, claves, túneles ni listen.

Faltan: autorización separada de llamadas de prueba y presupuesto/casos exactos,
cuenta Test y aceptación comercial, gestor seguro de secretos del entorno,
almacén durable para reserva/IDs/eventos, transporte HTTPS limitado y auditado,
estrategia privada de recepción/replay de webhooks, revisión de PII y retención.
Diseño de siguiente migración **sin aplicarla**: agregado sandbox separado con
scope cuenta/ambiente, importe/origen servidor, clave/hash/fecha antes de POST,
lease con recuperación y binding session/PI/charge únicos; eventos append-only por
cuenta/event.id/digest con transacción CAS. No modificar recibos históricos ni
permitir conectar fixtures a Delivery o al gate. HTTP remoto y elegibilidad real
requieren contratos y autorización nuevos; aprobar Stripe Test no los autoriza.

Pruebas posteriores controladas: tarjeta de prueba exitosa, rechazo/3DS, async,
expiración, timeout/replay, cuerpo alterado, duplicados/desorden, cuenta/moneda/
importe erróneos y devolución/disputa con consulta. Ninguna prueba de este corte
acredita un pago Stripe real, persistencia de replay tras reinicio ni ACC-014 comercial.

Fuentes oficiales consultadas 2026-10-19: [versión estable](https://github.com/stripe/stripe-node/blob/v23.0.0/src/apiVersion.ts),
[crear Session](https://docs.stripe.com/api/checkout/sessions/create), [firma/replay](https://docs.stripe.com/events/set-up-events),
[idempotencia](https://docs.stripe.com/api/idempotent_requests), [Session](https://docs.stripe.com/api/checkout/sessions/object),
[PaymentIntent](https://docs.stripe.com/api/payment_intents/object), [Charge](https://docs.stripe.com/api/charges/object),
[Dispute](https://docs.stripe.com/api/disputes/object). Retirar el adaptador conserva datos y denegación operativa.
