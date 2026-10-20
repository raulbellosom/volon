# Base financiera del servicio logístico — #20

Estado: contrato v1 exclusivamente local/sintético. No habilita cobros ni despacho.

Trazabilidad: [Issue #20](https://github.com/raulbellosom/volon/issues/20),
RF-022 → UC-11 → DEL-015 / ACC-014. Este corte no acredita ACC-014 comercial.
[ADR-0016](../decisions/0016-financial-foundation.md). M0 cobra únicamente logística;
no recibe el valor de productos. Delivery y su snapshot permanecen inmutables.

## Preparación interna

No hay endpoints nuevos ni composición en app/main. El harness utiliza Supabase
Auth verificada, nunca claims de metadata, para obtener subjectId. Los servicios
rechazan conexiones administrativas; el rol delivery_api mantiene FORCE RLS.

`prepare(actor, {deliveryId}, idempotencyKey)` acepta exactamente ese objeto,
UUID canónico y clave ASCII alfanumérica/guion/guion bajo de 1–128 caracteres.
No acepta importe, moneda, proveedor, paid ni elegibilidad. Toma importe entero
en unidades menores y MXN exclusivamente del Delivery persistido visible por RLS.
Devuelve exactamente `{intentId, deliveryId, amountMinor, currency, status:
'pending', version: 1, createdAt, attempt: {attemptId, status: 'not_submitted'}}`.
IDs UUID; createdAt ISO UTC del servidor. No devuelve subject, hashes, claves,
direcciones, columnas internas ni credenciales. No se ha enviado nada a un PSP.

ServicePaymentIntent es único por Delivery; ServicePaymentAttempt es único por
intención, preparado pero no enviado, con proveedor e ID externo necesariamente
nulos. ServicePaymentCommand conserva hashes de clave/payload y referencia a la
intención. Las tres tablas son inmutables. Un constraint diferido requiere intento
en la misma transacción. El importe debe coincidir también en PostgreSQL.
No se crean intenciones retroactivamente para entregas existentes.

Locks: subject/clave y después Delivery. Dos claves o actores autorizados sobre
una entrega obtienen la misma intención, sin crear otro intento. Replay requiere
autorización vigente; reutilizar clave para otra entrega es IDEMPOTENCY_CONFLICT.
RLS deriva visibilidad de Delivery → Branch → membresía/comercio habilitados.
No hay permisos financieros para un Courier por ser Courier.

`eligibility(actor, {deliveryId})` reautoriza y devuelve exactamente
`{deliveryId, eligible: false, reason: 'PSP_NOT_CONFIGURED'}` para TODA entrega
visible. No existe configuración, evidencia de laboratorio ni adaptador positivo.
No se conecta con FinancialEligibilityPort de dispatch-lab.

Errores internos: INVALID_COMMAND, NOT_FOUND (ajeno, revocado, deshabilitado o
inexistente indistinguibles), IDEMPOTENCY_CONFLICT, VERSION_CONFLICT,
INFRASTRUCTURE_UNAVAILABLE. No SQL ni secretos. No son nuevos códigos HTTP.

## Evidencias aisladas y reconciliación sintética

PaymentEvidenceLabCase solo se crea como fixture administrativo; tiene sucursal,
importe esperado sintético copiado de una entrega de prueba, moneda y referencia
externa `fixture_*`. **No tiene FK ni referencia a Delivery/intención**. Es
inmutable. PaymentEvidenceLabEvent es historial append-only con identificador
externo único, digest canónico, resultado de verificación de origen, fuente,
fecha reportada, fecha recibida por PostgreSQL, disposición, estado resultante y
versión. No se guardan cuerpos libres, tarjetas ni PII. La proyección se deriva
del último evento: no hay saldo mutable ni tabla contable ficticia.

`observe(actor, event, proof)` valida campos exactos: caseId, eventId,
providerPaymentId, source (`synthetic_webhook`/`synthetic_reconciliation`), kind,
amountMinor, currency, occurredAt y expectedVersion (0 al inicio). Versión CAS;
un eventId repetido idéntico retorna el recibo original aun con versión antigua;
contenido diferente falla. Lock por caso, versión secuencial única y recibo/evento
en una transacción. RLS exige sucursal visible y contexto synthetic-v1; este
contexto no es una credencial frente al robo del rol backend.

Verificador por defecto deniega; el único verificador positivo está en fixtures
de pruebas, usa HMAC en memoria y se denomina synthetic-fixture, nunca PSP.
Origen falso y discrepancias de importe/moneda/ID se registran sin aplicar estado.
Una captura reportada por webhook solo produce capture_pending; únicamente una
reconciliación sintética verificada puede producir confirmed **de laboratorio**.
Autorización no equivale a captura. Reversed/disputed bloquean y no se reactivan;
confirmed no retrocede por pending/authorized/rejected tardíos. Fechas reportadas
no deciden autoridad ni se confían como reloj del servidor. Eventos ambiguos
requieren reconciliación: ninguna política genérica sustituye al contrato del PSP.
Todo estado salvo confirmed requiere reconciliación en esta simulación.

Recibo exacto: `{caseId, eventId, state, version, disposition, needsReconciliation,
receivedAt}`; estados pending/unknown/rejected/authorized/capture_pending/confirmed/
reversed/disputed; disposiciones applied/ignored_stale/mismatch/rejected_origin.
Sin HTTP, publisher, reembolsos automáticos ni conexión al flujo comercial.

## Puerto futuro PSP: contrato, sin implementación

El corte [#23](stripe-checkout-test.md) implementa un adaptador de sandbox offline
mediante un puerto distinto; nunca produce VerifiedProviderEvidence operativa.

El puerto tipado separa creación idempotente, verificación criptográfica del
mensaje crudo y consulta autenticada de reconciliación. Evidencia debe identificar
proveedor/cuenta, pago y evento únicos dentro de ese ámbito; digest del mensaje,
método/keyRef y fecha verificada, importe/moneda y estado. Un webhook sin firma,
una respuesta cliente o un timeout jamás acreditan pago. Timeout = unknown;
consultar estado antes de repetir una operación monetaria. Autorización de tarjeta,
captura pendiente y captura confirmada son estados distintos. Reversos,
reembolsos y disputas son hechos separados, no cambios del estado logístico.
El adaptador deberá demostrar deduplicación, orden específico del proveedor,
rotación/replay, coincidencia de cuenta/importe/moneda y consulta autenticada;
no existe endpoint público de webhook ni selector de proveedor en este incremento.

Un resultado unknown puede no tener ID externo; el contrato admite null en ese
caso. No se inventa un identificador ni se reenvía automáticamente el cobro.

El binding intentId/deliveryId es servidor → PSP y se persiste antes del envío;
metadata devuelta por proveedor no acredita por sí sola esa asociación. La fuente
webhook/provider_query/reconciliation y recepción del servidor quedan explícitas.
Reglas de vigencia, parcialidad y liquidabilidad se definirán con el PSP: captura
no garantiza que fondos sean liquidables ni autoriza payout.

## Criterios de selección y puertas pendientes

Evaluar con evidencia oficial fechada: elegibilidad comercial en México y MXN;
cobro de logística propia M0; captura vs autorización; idempotencia; consulta
autenticada; firmas y rotación; eventos tardíos/duplicados; conciliación y reportes;
reembolsos y contracargos; disponibilidad/soporte; precios, impuestos y CFDI;
contratos, privacidad y responsabilidades jurídicas. Marketplace/split/payout no
son requisitos habilitados por este corte. No se seleccionó PSP ni se cotizaron
precios. Comparación comercial requiere revisión humana y fuentes vigentes.

Antes de sandbox: PSP/cuenta y responsable aprobados, credenciales de prueba en
gestor de secretos, contrato de firma/captura/consulta verificado, fixtures del
proveedor, política de anomalías y reversos, revisión fiscal/privacidad y runbook.
Antes de conectar elegibilidad/despacho: autoridad de captura real reconciliada,
revocación consistente, reglas de vigencia, asignación exclusiva y política de
datos temporales del Courier aprobadas. Ninguna puerta se salta con flags.

## Reproducir

`pnpm local:up`, `node scripts/local/check-clean-migrations.mjs`, `pnpm check`,
`pnpm test:integration`, `pnpm db:status`. Fixtures solo loopback y modo sintético;
Supabase verifica identidad real local. El laboratorio no es un PSP ni prueba de
liquidación, restauración financiera, cumplimiento legal o fondos disponibles.
