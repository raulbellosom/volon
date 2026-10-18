# API HTTP — contrato candidato de versión 1

**Estado:** superficie general candidata. POST y GET de cotizaciones y Delivery, más GET de identidad y sucursales, tienen handlers Fetch, listener HTTP local y adaptadores PostgreSQL/Auth ejecutables mediante [entorno Docker local](../operations/local-backend.md). Sin operación comercial ni servicios públicos; el resto de las rutas sigue siendo ilustrativo.

## Corte experimental de cotización (RF-001/005/006, UC-03, DEL-003)

Contrato formal: [`delivery-quote.schema.json`](../../packages/contracts/delivery-quote.schema.json); solicitud en la raíz y respuesta en `#/$defs/response`. Validación runtime compartida en `@delivery/contracts`. El handler en `apps/api/src/app.ts` recibe adaptadores explícitos de identidad, autorización vigente por sucursal, cobertura/rutas/tarifa versionada y almacenamiento confirmado. La composición local añade Prisma/PostgreSQL, Supabase Auth y distancia geodésica sintética; no hay bypass de autenticación ni proveedor vial productivo.

- Solicitud cerrada: `branchId` opaco (1–128 caracteres ASCII alfanuméricos, `_` o `-`), `pickup` y `dropoff` con únicamente `lat`/`lng` finitos dentro de rangos geográficos, y `serviceType: local_delivery`. Se rechazan campos extra, incluidos etiquetas/direcciones del ejemplo conceptual, precio, distancia, tarifa e identidad. No se recopilan destinatarios.
- El adaptador de rutas debe verificar recogida contra la sucursal, cobertura de ambos puntos, modalidad y política vigente; la distancia y versión tarifaria proceden del servidor. Coordenadas válidas por sí solas no acreditan cobertura.
- `201` solo después de confirmar almacenamiento del snapshot con sujeto, sucursal, solicitud, versión tarifaria y respuesta. ID generado por dependencia del servidor. TTL obligatorio, positivo y configurable; los fixtures usan 600000 ms conforme a DEC-12. El almacenamiento debe garantizar unicidad del ID.
- Respuesta MXN en enteros seguros, suma de líneas `base_delivery` y `distance_delivery` (incluye cero), `quoteId`, `expiresAt` UTC y `coverage: eligible`. No incluye ETA, productos, impuestos ni cobros. `Cache-Control: no-store` en éxito y error.
- `400 INVALID_JSON`, `401 UNAUTHENTICATED`, `403 ACCESS_DENIED`, `404 NOT_FOUND`, `405 METHOD_NOT_ALLOWED` con `Allow: POST`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 INVALID_QUOTE_REQUEST`/`OUTSIDE_COVERAGE`, `503 ROUTING_UNAVAILABLE`/`SERVICE_UNAVAILABLE`. Errores `application/problem+json` con `type`, `title`, `status`, `code` y texto seguro, sin detalles del proveedor.
- Cotizar no crea Delivery ni cobra. Cada POST de cotización puede crear una quote nueva; no se promete idempotencia para cotizar. El listener limita el cuerpo a 16 KiB (413), headers y tiempos de conexión. Delivery consume la quote vigente de forma idempotente según su contrato más abajo. Auditoría completa, outbox, rate limiting y trazas correlacionadas siguen pendientes antes de exponer el servicio.

Los ejemplos siguientes conservan su carácter conceptual; los esquemas formales gobiernan los cortes locales. ACC-015 se comprueba en las pruebas de snapshot de Delivery; no implica ajustes financieros comerciales implementados.

## Convenciones horizontales

### Contexto de comercio: lectura local v1 (issue #9, RF-001, UC-01, ENG-009, ACC-010)

Primer corte autorizado para desarrollo sintético: `GET /v1/me` y
`GET /v1/merchants/{merchantId}/branches`. El historial de entregas queda fuera.
DTOs cerrados en `packages/contracts/merchant-context.schema.json`, con validación
runtime compartida en `@delivery/contracts`.

- `/v1/me`: `200 { subjectId, memberships: [{ merchant: { merchantId, name }, branch: { branchId, name } }] }`.
  `subjectId` es exclusivamente el UUID verificado por Supabase Auth. Cada elemento
  representa una membresía vigente por sucursal; se omiten membresías revocadas,
  comercios deshabilitados y sucursales deshabilitadas. Sin accesos vigentes:
  `200 { subjectId, memberships: [] }`. Soporta varias sucursales/comercios por sujeto.
- `/v1/merchants/{merchantId}/branches`: `200 { merchant: { merchantId, name }, branches: [{ branchId, name }] }`.
  `merchantId` usa `[A-Za-z0-9_-]{1,128}`. Solo incluye sucursales con membresía propia
  vigente, nunca todas las sucursales del comercio por pertenecer a una de ellas.
  Comercio ajeno, inexistente, deshabilitado o sin sucursales visibles: `404 NOT_FOUND`
  idéntico. Identificador de ruta inválido: el mismo 404.
- Orden ascendente por `merchantId` y después `branchId` en `/me`; por `branchId`
  en sucursales. Una entrada por membresía sujeto+sucursal, conforme a la unicidad
  existente. No se aceptan identidad ni scope desde headers alternativos, body,
  metadata o query; los parámetros query no cambian el resultado.
- No se devuelven correo, nombre personal, teléfono, metadata Auth, coordenadas,
  dirección, IDs internos de membresía, flags de estado, roles ni permisos inventados.
  El modelo actual no persiste roles ni fechas de vigencia: vigente significa
  Membership.enabled, Merchant.enabled y Branch.enabled en la lectura actual.
- Bearer ausente/inválido/vencido: `401 UNAUTHENTICATED`; Auth o PostgreSQL
  indisponible, error de consulta o DTO inválido: `503 SERVICE_UNAVAILABLE` seguro.
  Método distinto: `405 METHOD_NOT_ALLOWED`, `Allow: GET`. No se usa 403 para
  revelar existencia del comercio. Errores con el formato `application/problem+json`
  existente. Éxitos JSON y todos los errores usan `Cache-Control: no-store`.
- Cada lectura usa una consulta contextual Prisma con rol `delivery_api` y RLS
  vigente; el filtro del merchant no sustituye RLS. No hay cambios de esquema,
  privilegios, políticas, endpoints administrativos o llamadas con service role.

### Delivery local: contrato ejecutable (RF-007/008, UC-04, DEL-004)

`POST /v1/deliveries` exige bearer verificado e `Idempotency-Key` de 1–128 caracteres `[A-Za-z0-9_-]` (se recomienda UUID aleatorio). Solicitud cerrada `{ "branchId": "branch_synthetic_a", "quoteId": "..." }`; rechaza campos adicionales, identidad, precios, estados, recipient o flags de pago. Los datos de recogida/destino proceden exclusivamente de la cotización almacenada. El ejemplo con recipient más abajo sigue siendo conceptual y no forma parte de este corte sin datos personales.

Contrato formal compartido: [`delivery.schema.json`](../../packages/contracts/delivery.schema.json), solicitud en raíz y respuesta en `#/$defs/response`; parser runtime en `@delivery/contracts`. El puerto transaccional de aplicación no importa Prisma; el adaptador usa la transacción contextual existente.

Respuesta `201` tanto al crear como al repetir: `{ deliveryId, branchId, quoteId, status: requested, version: 1, createdAt, pricing: { amountMinor, currency, lines, rateVersion } }`. Snapshot persistido; no recalcula ni incorpora cambios posteriores de tarifa/quote. `GET /v1/deliveries/{deliveryId}` devuelve ese mismo DTO con `200`, o `404` uniforme si es ajena/inexistente. No devuelve claves, hashes, destinatarios ni coordenadas. Ambas operaciones requieren membresía habilitada y comercio/sucursal habilitados; se revalida en cada reintento/lectura.

La clave se guarda como SHA-256 por sujeto+sucursal+operación; el hash del comando se calcula a partir del DTO normalizado (orden JSON irrelevante). Misma clave y comando devuelven exactamente el mismo recurso después de commit, aun si la quote ya expiró; misma clave con otro quoteId en la misma sucursal devuelve `409 IDEMPOTENCY_CONFLICT`. Otra sucursal/actor tiene namespace independiente, nunca visibilidad de comandos ajenos. Fallos no reservan la clave ni consumen la quote.

Quote inexistente, ajena o de otra sucursal: `404 QUOTE_NOT_FOUND`; sucursal no autorizada: `403 ACCESS_DENIED`; quote vencida (`expiresAt <= reloj PostgreSQL`): `409 QUOTE_EXPIRED`; quote ya utilizada con otro comando: `409 QUOTE_ALREADY_USED`; cuerpo inválido: `422 INVALID_DELIVERY_REQUEST`; key ausente/inválida: `422 INVALID_IDEMPOTENCY_KEY`. JSON/tipo de contenido conservan `400/415`; fallos DB/commit: `503 SERVICE_UNAVAILABLE`, sin éxito anticipado. Respuestas `no-store`, errores `application/problem+json`.

Una transacción Prisma establece subject, serializa por clave y por quote mediante advisory locks transaccionales, verifica membresía/vigencia y persiste una Delivery con snapshot y metadatos de idempotencia. Índices únicos y FKs compuestas refuerzan unicidad y pertenencia; RLS impide lecturas/escrituras cruzadas. No hay retención/limpieza automática de claves ni escrituras UPDATE/DELETE de Delivery en este corte. Nunca se crea Payment, Assignment, Order ni evento de despacho.

### Extensión backend local (ADR-0007)

El listener Node publica solo en loopback del host a través de Compose. `GET /health` devuelve 200 si PostgreSQL responde con el rol limitado, o 503 seguro. `GET /v1/delivery-quotes/{quoteId}` exige bearer verificado en Supabase Auth y membresía vigente en la sucursal de la quote; devuelve el mismo DTO v1 persistido o 404 uniforme para inexistente/ajena. No divulga solicitud ni coordenadas. Las quotes vencidas se pueden consultar como histórico; esto no autoriza consumirlas para Delivery.

POST mantiene el contrato anterior. La composición PostgreSQL revalida membresía al guardar, incluso si fue revocada después de cotizar. RLS por transacción y FK compuesta impiden scope cruzado. Auth caída, DB caída o almacenamiento rechazado jamás producen 201. No se recibe identidad ni merchantId del JSON. Modo de distancia geodésica limitado a fixtures sintéticos, sin prometer una ruta comercial.
- Prefijo propuesto `/v1`; HTTPS obligatorio fuera de entornos aislados.
- Auth mediante bearer/session apropiado; cada operación valida subject, scope y recurso.
- Tiempos UTC ISO 8601; dinero en enteros de unidad menor y currency (MXN inicialmente); IDs opacos.
- Solicitudes JSON con esquema validado; respuesta sin campos sensibles de otros actores.
- `Idempotency-Key` obligatoria para comandos de creación, aceptación, cancelación, cobro, reembolso y cambios irreversibles. Clave asociada a actor+scope+operación+hash de cuerpo; reutilizarla con contenido distinto devuelve conflicto.
- `X-Request-Id`/correlationId para trazas; `If-Match` o `expectedVersion` en cambios de estado concurrentes. Elegir una convención definitiva.
- Listas paginadas con cursores opacos estables y filtros permitidos por rol. No exponer tablas ni RPCs internas como API comercial accidental.
- Los reintentos de red requieren semántica clara: mismo key y mismo payload → mismo resultado lógico, aun con entrega de respuesta fallida.

## Superficie conceptual del piloto

| Método y ruta propuesta | Acción | Actor/scope | Efecto |
| --- | --- | --- | --- |
| `GET /v1/me` | UUID y membresías habilitadas (corte local definido arriba) | Autenticado | Lectura |
| `GET /v1/merchants/{merchantId}/branches` | Sucursales visibles con membresía vigente | Member autorizado | Lectura |
| `POST /v1/delivery-quotes` | Cotizar transporte sin persistir Delivery | Comercio / actor habilitado | Crea quote temporal |
| `POST /v1/deliveries` | Crear solicitud usando quote vigente | Comercio/sucursal | Comando idempotente |
| `GET /v1/deliveries/{deliveryId}` | Estado, datos según rol | Vinculado a recurso | Lectura |
| `GET /v1/deliveries?branchId=...` | Historial/pedidos activos filtrados | Actor de scope | Lectura paginada |
| `POST /v1/deliveries/{deliveryId}/cancel` | Cancelar conforme a política | Actor permitido | Transición auditada |
| `POST /v1/deliveries/{deliveryId}/milestones` | Declarar recogida/arribo/entrega con payload tipado | Courier asignado | Transición idempotente |
| `GET /v1/deliveries/{deliveryId}/tracking` | Snapshot ubicación autorizada + freshness | Actor/seguimiento válido | Lectura |
| `GET /v1/couriers/me/offers` | Ofertas vigentes para courier | Courier | Lectura |
| `POST /v1/assignment-offers/{offerId}/accept` | Aceptar con exclusión | Courier destinatario | Comando atómico |
| `POST /v1/assignment-offers/{offerId}/decline` | Rechazar oferta | Courier destinatario | Comando |
| `POST /v1/couriers/me/availability` | Turno/estado disponible | Courier | Comando |
| `POST /v1/couriers/me/location-batches` | Enviar muestras GPS | Courier con sesión elegible | Ingestión controlada |
| `POST /v1/dispatch/deliveries/{deliveryId}/assign` | Asignación/reatribución manual | Dispatcher permitido | Comando auditado |
| `POST /v1/incidents` | Reportar incidencia | Actor autorizado | Comando |
| `GET /v1/incidents?deliveryId=...` | Consultar casos permitidos | Scope propio | Lectura |

### Pago de logística en M0 (sin API de comercio electrónico)
En M0 **el comercio paga a la plataforma solamente el servicio logístico**. La API crea `Delivery(requested)` con cotización congelada, pero **no permite iniciar despacho u ofertar a couriers** mientras no exista confirmación verificable del `Payment` propio de esa entrega. La elegibilidad se deriva de un registro financiero autoritativo, nunca de un campo booleano enviado por el cliente.

El flujo de pago debe disponer de una operación separada, idempotente, con webhooks PSP firmados, reconciliación de timeouts, cancelaciones y reembolsos. El endpoint, proveedor, uso de autorización/captura y respuesta final se definirán **después de DEC-03 y el spike PSP**. No incluir cobro de mercancía, wallet ni split de productos en M0. Ver [modelo operativo de piloto](../product/pilot-operating-model.md).

Los endpoints de catálogo, carrito, Orders y checkout se especificarán al aprobar la fase marketplace. Los endpoints de pagos comerciales dependen de PSP y modelo de cobro legalmente aprobado.

## Ejemplo ilustrativo de cotización
```json
{
  "branchId": "br_example",
  "pickup": { "lat": 20.65, "lng": -105.22, "label": "Sucursal" },
  "dropoff": { "lat": 20.63, "lng": -105.23, "address": "Ejemplo sin datos reales" },
  "serviceType": "local_delivery"
}
```
Respuesta conceptual:
```json
{
  "quoteId": "quote_example",
  "expiresAt": "2026-10-17T21:00:00Z",
  "currency": "MXN",
  "amountMinor": 4500,
  "lines": [{"code": "base_delivery", "amountMinor": 4500}],
  "coverage": "eligible"
}
```
No devolver promesas de ETA sin datos/algoritmos fiables. La validación de cobertura no sustituye verificación de dirección.

## Ejemplo de creación
`POST /v1/deliveries` con `Idempotency-Key: <clave-aleatoria>`:
```json
{
  "branchId": "br_example",
  "quoteId": "quote_example",
  "recipient": {"name": "Destinatario de prueba", "phone": "dato-de-prueba"},
  "dropoffInstructions": "Dejar con recepción"
}
```
Respuesta conceptual `201` con `deliveryId`, `status: requested`, `version: 1`, precios congelados, **eligibilidad de despacho derivada de pago real** y URLs de seguimiento **protegidas**, nunca permisos implícitos.

## Errores
Adoptar `application/problem+json` inspirado en RFC 9457, con `type`, `title`, `status`, `detail` segura y `instance` (correlation ID), más `code` estable para clientes. Ejemplos: `QUOTE_EXPIRED` (409/422 según semántica), `DELIVERY_STATE_CONFLICT` (409), `ACCESS_DENIED` (403), `RATE_LIMITED` (429).
- 401 autenticación inválida; 403 sin permiso; 404 no visible/inexistente según política anti-enumeración; 409 versión o estado en conflicto; 422 datos semánticos no aceptables; 429 abuso.
- No revelar PII, estado de un recurso ajeno ni detalles de proveedores en `detail`.

## Seguridad y versionado
- OpenAPI como contrato de API versionado en futuro; esquema compartido generado/controlado con validación runtime.
- Cambios aditivos compatibles como norma; romper compatibilidad requiere nueva versión, migración y soporte para versiones móviles en circulación.
- Listados con límites y rate limiting por actor/organización/dispositivo; límites GPS propios.
- Webhooks PSP en endpoints aislados con firmas verificadas, timestamp, idempotencia y replay protection.
- Ninguna URL concreta de dominio de marca fijada en rutas de negocio.

Referencia de formato de errores: https://www.rfc-editor.org/rfc/rfc9457
