# Matriz de fallos y recuperación

**Estado:** procedimientos esperados. No existe runbook operativo ni infraestructura desplegada.

| Falla | Riesgo | Respuesta funcional obligatoria | Recuperación/verificación |
| --- | --- | --- | --- |
| Cliente pierde socket | UI desactualizada | mostrar conexión degradada, consultar snapshot por API | reconciliar `aggregateVersion` y notificar si faltan eventos |
| GPS no llega | mapa parece real pero no lo es | marcar última coordenada con edad/precisión; no deducir abandono | retomar ingesta idempotente y descartar posiciones antiguas |
| Push fallido | pedido/oferta no vista | pedido/oferta persiste con vencimiento y consulta por API | reintentar dentro de ventana y escalar a despacho |
| Dos couriers aceptan | doble servicio y conflicto legal | transacción con exclusión y un resultado ganador | devolver 409 a perdedor y sincronizar estado |
| Worker detenido | outbox backlog | API confirma negocio y cola persiste; alertar lag | reanudar y procesar idempotentemente |
| Redis caído | ubicación/presencia/cache no disponible | no corromper DB; operaciones críticas siguen controladas o fallan de forma explícita | reconstruir cache desde fuente/posición nueva |
| Realtime caído | sin actualizaciones instantáneas | polling prudente con backoff; estado de servicio visible | reconectar y fetch snapshot |
| DB inaccesible | no se puede aceptar órdenes de forma segura | rechazar comandos; no aceptar asignación/pagos como éxito ficticio | restaurar DB y reconciliar solicitudes idempotentes |
| PSP lento/fallido | cobro incierto | `pending/unknown`, no reintentar con nueva transacción sin conciliación | consultar PSP con idempotency key/webhook firmado |
| Webhook duplicado | duplicación de efectos | inbox/dedupe por event ID + estado transaccional | reconciliar con estado PSP |
| Proveedor de mapas caído | cotización/ETA incierta | no inventar ruta; operación manual si política permite | recalcular cotización/suspender zona |
| Courier cierra la app | pérdida de tracking | no prometer GPS continuo; estado stale y escalamiento | restaurar sesión cuando SO permita |
| Falla en una zona | múltiples entregas en riesgo | coordinar asistencia, suspender nuevas solicitudes según capacidad | incident log y plan de comunicación |
| Robo de token / exmiembro | acceso no autorizado | revocación, tokens cortos y autorización por recurso | cerrar canales y auditar accesos |
| Borrado accidental / desastre | pérdida de datos | backups fuera de servidor + plan seguro de parada | restore drill con RPO/RTO medidos |

## Principios de reconciliación
- **Nunca** convertir timeout en confirmación de un cargo o asignación.
- Operación repetida con la misma clave debe recuperar el mismo resultado lógico.
- Consumidor de eventos at-least-once siempre idempotente.
- Identificar estado `unknown` como incertidumbre real, no éxito ni fracaso automático.
- Operadores deben disponer de cola de casos pendientes de investigación con historial y actor.
- Auditoría/ledger no se edita para «arreglar» inconsistencia: correcciones mediante acciones compensatorias.

## Manuales por escribir antes de producción
Runbook de base de datos, restorations, PSP, caída GPS/Realtime, emergencia de despacho, fallos de push, pérdida/robo de dispositivos, brecha de datos, revocación de acceso, seguridad y comunicaciones.
