# Eventos de dominio, outbox y Realtime

**Estado:** contrato propuesto. Diferenciar hechos durables de notificaciones efímeras.

## Tres clases de comunicación
1. **Comandos HTTP**: solicitan cambio, backend valida/autoriza, usa transacción y devuelve resultado.
2. **Domain events durables**: hechos después del commit; se insertan en OutboxEvent en la misma transacción que cambio persistente. Worker procesa al menos una vez, con reintentos y consumidores idempotentes.
3. **Realtime Broadcast/Presence**: actualización de UI de baja latencia; no es autoridad ni garantía de entrega. Snapshot/re-sync por API ante reconexión.

No usar sockets para pagos, aceptación definitiva, finalización, mutación de estados ni autorizaciones.

## Catálogo candidato (tipo estable y versionado)

| Evento v1 | Dueño | Suscriptores lógicos |
| --- | --- | --- |
| `delivery.requested.v1` | Deliveries | Dispatch, Notifications, Metrics |
| `delivery.status_changed.v1` | Deliveries | Realtime, soporte, proyecciones |
| `delivery.delivered.v1` | Deliveries | Notifications, Payments/Settlement según política |
| `delivery.cancelled.v1` | Deliveries | Dispatch, soporte, finanzas |
| `assignment.offer_created.v1` | Dispatch | Courier push/Realtime |
| `assignment.accepted.v1` | Dispatch | Deliveries, Realtime, operador |
| `assignment.offer_expired.v1` | Dispatch | Dispatch/operador |
| `assignment.revoked.v1` | Dispatch | Realtime, operador |
| `courier.availability_changed.v1` | Couriers | Dispatch/read models |
| `incident.opened.v1` | Support | Soporte y notificaciones |
| `payment.status_changed.v1` | Payments | Conciliación, soporte |
| `notification.delivery_failed.v1` | Notifications | Alertas operativas |

`courier.location_updated` generalmente es **telemetría efímera**, no un evento durable por cada punto. Guardar hitos/posiciones seleccionadas según retención, no llenar outbox con GPS a alta frecuencia.

## Sobre de evento interno (inspirado en CloudEvents)
```json
{
  "eventId": "evt_example",
  "type": "delivery.status_changed.v1",
  "schemaVersion": 1,
  "source": "deliveries",
  "aggregateType": "Delivery",
  "aggregateId": "dlv_example",
  "aggregateVersion": 7,
  "occurredAt": "2026-10-17T21:00:00Z",
  "correlationId": "req_example",
  "causationId": "cmd_example",
  "data": {
    "from": "picked_up",
    "to": "in_transit"
  }
}
```
No afirmar compatibilidad CloudEvents sin implementar/validar formato exacto; es un sobre interno inspirado en sus atributos.

## Publicación duradera
1. Comando produce cambio + OutboxEvent en una transacción ACID.
2. Worker reclama eventos pendientes con exclusión de workers (lease/lock), intenta publicar en canal/cola.
3. Guarda intento, error, `publishedAt` o estado y programa retry exponencial con jitter.
4. Consumidor procesa por `eventId` de manera idempotente; duplicados no generan nuevo cargo ni push ilimitado.
5. Eventos imposibles/poison van a DLQ o estado de intervención supervisada; métricas y alertas.
6. **Ordering**: no suponer orden global; por aggregate comparar `aggregateVersion` y recuperar snapshot si falta una versión.

## Broadcast UI
Canales conceptuales:
- `merchant:{merchantId}:orders`
- `delivery:{deliveryId}:tracking`
- `courier:{courierId}:assignments`
- `dispatch:{zoneId}:overview`

El servidor filtra campos y hace publish a canales privados con autorización y revocación. Mensaje típico incluye `eventId`, `entityId`, `version`, `occurredAt`, cambio mínimo, y la UI consulta API si la versión no es consecutiva.

GPS: `location:updated` con `deliveryId`, coordenada redondeada/precision adecuada, `observedAt`, `publishedAt` y `freshness`; solo a audiencia elegible. **No** publicar GPS cuando termina permiso de rastreo.

## Reglas de evolución
- Consumidores toleran campos adicionales desconocidos; nunca reinterpretar un campo ya publicado.
- Cambios incompatibles: nuevo `type` o `schemaVersion`, convivencia temporal y prueba de contratos.
- No exponer direcciones/PII ni detalles de pago en payloads generales.
- Medir outbox lag, reprocesamientos, eventos DLQ, conexiones, latencia de Broadcast y desconexiones.

Referencia de normalización interoperable: https://github.com/cloudevents/spec (evaluar adopción literal en etapa de implementación).
