# API HTTP — contrato candidato de versión 1

**Estado:** superficie general candidata. Existe un primer contrato JSON Schema y handler Fetch experimental de `POST /v1/delivery-quotes`, sin servidor expuesto ni integraciones reales. El resto de las rutas sigue siendo ilustrativo. El backend es la autoridad de negocio.

## Corte experimental de cotización (RF-001/005/006, UC-03, DEL-003)

Contrato formal: [`delivery-quote.schema.json`](../../packages/contracts/delivery-quote.schema.json); solicitud en la raíz y respuesta en `#/$defs/response`. Validación runtime compartida en `@delivery/contracts`. El handler en `apps/api/src/app.ts` recibe adaptadores explícitos de identidad, autorización vigente por sucursal, cobertura/rutas/tarifa versionada y almacenamiento confirmado. No hay adaptadores productivos, fallback de autenticación, base de datos ni listener HTTP.

- Solicitud cerrada: `branchId` opaco (1–128 caracteres ASCII alfanuméricos, `_` o `-`), `pickup` y `dropoff` con únicamente `lat`/`lng` finitos dentro de rangos geográficos, y `serviceType: local_delivery`. Se rechazan campos extra, incluidos etiquetas/direcciones del ejemplo conceptual, precio, distancia, tarifa e identidad. No se recopilan destinatarios.
- El adaptador de rutas debe verificar recogida contra la sucursal, cobertura de ambos puntos, modalidad y política vigente; la distancia y versión tarifaria proceden del servidor. Coordenadas válidas por sí solas no acreditan cobertura.
- `201` solo después de confirmar almacenamiento del snapshot con sujeto, sucursal, solicitud, versión tarifaria y respuesta. ID generado por dependencia del servidor. TTL obligatorio, positivo y configurable; los fixtures usan 600000 ms conforme a DEC-12. El almacenamiento debe garantizar unicidad del ID.
- Respuesta MXN en enteros seguros, suma de líneas `base_delivery` y `distance_delivery` (incluye cero), `quoteId`, `expiresAt` UTC y `coverage: eligible`. No incluye ETA, productos, impuestos ni cobros. `Cache-Control: no-store` en éxito y error.
- `400 INVALID_JSON`, `401 UNAUTHENTICATED`, `403 ACCESS_DENIED`, `404 NOT_FOUND`, `405 METHOD_NOT_ALLOWED` con `Allow: POST`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 INVALID_QUOTE_REQUEST`/`OUTSIDE_COVERAGE`, `503 ROUTING_UNAVAILABLE`/`SERVICE_UNAVAILABLE`. Errores `application/problem+json` con `type`, `title`, `status`, `code` y texto seguro, sin detalles del proveedor.
- Cotizar no crea Delivery ni cobra. Cada POST puede crear una quote nueva; no se promete idempotencia en este corte. Confirmar entregas, rechazar quotes vencidas al consumo, auditoría durable, rate limiting, límites de payload y trazas correlacionadas quedan para los siguientes cortes antes de exponer el servicio.

Los ejemplos siguientes conservan su carácter conceptual; el esquema formal gobierna exclusivamente este corte experimental. No se declara completado ACC-015 (congelación al crear Delivery).

## Convenciones horizontales
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
| `GET /v1/me` | Identidad, memberships y permisos efectivos | Autenticado | Lectura |
| `GET /v1/merchants/{merchantId}/branches` | Consultar sucursales propias | Member autorizado | Lectura |
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
