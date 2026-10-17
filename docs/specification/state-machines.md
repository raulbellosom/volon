# Estados, transiciones e invariantes

**Estado:** catálogo conceptual versionable. Los nombres precisos deben ratificarse antes de escribir esquemas, API y móvil.

## Delivery (unidad logística)
Estados propuestos:
- `requested`: solicitud persistida y validada, pendiente de iniciar despacho.
- `dispatching`: buscando/intentando asignar repartidor.
- `assigned`: repartidor aceptado y confirmado.
- `en_route_pickup`: desplazamiento hacia punto de recogida.
- `at_pickup`: presencia declarada y verificada según política.
- `picked_up`: paquete recogido, evidencia opcional.
- `in_transit`: traslado al destino.
- `delivered`: entrega confirmada con prueba requerida.
- `cancelled`: terminación por cancelación con causa y actor autorizado.
- `failed`: intento sin resolución/entrega, sujeto a soporte y reglas comerciales.

Propuesta de transiciones principales:
`requested → dispatching → assigned → en_route_pickup → at_pickup → picked_up → in_transit → delivered`.

Ramas:
- `dispatching → cancelled` por actor autorizado; `dispatching → failed` tras resolución sin repartidor.
- Antes de recogida, cancelación según política y obligaciones contractuales, no automática.
- `assigned/en_route_pickup/at_pickup → dispatching` solo mediante comando de **reasignación** que registra el Assignment previo revocado/terminado e historial; nunca reemplazo silencioso.
- Después de recogida, falla/cancelación exige resolución de custodia del paquete, evidencia, auditoría y posible compensación; **no** permitir transición libre arbitraria.
- `delivered/cancelled/failed` terminales para flujo normal. Correcciones administrativas deben ser movimientos auditados y compensatorios, no edición directa.

## AssignmentOffer
`created → offered → accepted | declined | expired | withdrawn`. Solo `offered` puede convertirse en `accepted`; validación por expiración de servidor y pertenencia del courier; aceptar no asigna si la Delivery ya fue tomada.

## Assignment
`active → completed | released | revoked`. Nunca reactivar una Assignment terminada; reintentos generan registro nuevo. Se requiere unicidad de actividad para evitar doble courier.

## CourierShift
`offline → available → busy → available/offline`. **Presence WebSocket no define este estado**. Disponibilidad autoritativa y reglas de seguridad pueden negar cambio mientras haya servicio activo.

## Order (fase marketplace)
Separado: `pending_confirmation`, `confirmed`, `preparing`, `ready`, `fulfilled`, `cancelled`, etc., por diseñar con operaciones comerciales. No forzar equiparación con Delivery.

## Payment (según PSP)
`pending`, `authorized`, `captured`, `failed`, `cancelled`; reembolsos parciales/totales como recursos separados. No convertir `delivered` en `paid` por regla implícita.

## Reglas comunes
1. Cada comando valida actor, permisos, estado previo, version y invariantes de dominio.
2. Usar actualización atómica/lock, idempotency key y transición persistida con marca UTC.
3. Respuestas a estados incompatibles: conflicto de estado; reintentos idénticos resuelven al mismo resultado.
4. Emitir evento mediante outbox con `aggregateVersion`; clientes descartan versiones anteriores.
5. No basar cambios críticos en GPS estimado ni mensajes push.
6. Registrar `reasonCode`, `actorId`, `correlationId` y autorización sin filtrar PII.

## Casos negativos obligatorios
- Dos ofertas aceptadas a la vez; llega un rechazo tras aceptación; expira mientras se confirma.
- Entrega marcada doble; llega GPS tardío tras entrega; repartidor deshabilitado con entrega activa.
- Cancelación posterior a recogida; reversión de pagos independientes; transición desde estado terminal.
