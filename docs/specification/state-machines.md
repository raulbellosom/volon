# Estados, transiciones e invariantes

**Estado:** catálogo conceptual versionable. Los nombres precisos deben ratificarse antes de escribir esquemas, API y móvil.

## Delivery (unidad logística)

**Corte local implementado por solicitud del usuario:** solo se crea `requested` con `version: 1`, desde una quote almacenada y vigente, de uso único, mediante comando idempotente. Snapshot y comando son inmutables en PostgreSQL; todas las demás transiciones listadas siguen siendo propuestas y requieren otra migración/contrato. No hay elegibilidad financiera simulada ni transición a `dispatching`. Ver [API](api-contracts.md).
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

**Gating M0 del despacho (decisión de diseño):** la Delivery puede estar `requested` mientras el PSP procesa `Payment` del servicio logístico pagado por el comercio. Solo puede avanzar a `dispatching` cuando el backend verifique la elegibilidad financiera; `Payment` sigue siendo entidad/estado independiente, no un simple booleano enviado por el cliente. Si pago es incierto, denegado o reembolsado antes de asignar, no ofertar. Expiración/limpieza y reembolsos siguen política contractual pendiente; nunca asumir pago confirmado por un timeout. [Modelo M0](../product/pilot-operating-model.md).

Propuesta de transiciones principales:
`requested → dispatching → assigned → en_route_pickup → at_pickup → picked_up → in_transit → delivered`.

Ramas:
- `dispatching → cancelled` por actor autorizado; `dispatching → failed` tras resolución sin repartidor.
- Antes de recogida, cancelación según política y obligaciones contractuales, no automática.
- `assigned/en_route_pickup/at_pickup → dispatching` solo mediante comando de **reasignación** que registra el Assignment previo revocado/terminado e historial; nunca reemplazo silencioso.
- Después de recogida, falla/cancelación exige resolución de custodia del paquete, evidencia, auditoría y posible compensación; **no** permitir transición libre arbitraria.
- `delivered/cancelled/failed` terminales para flujo normal. Correcciones administrativas deben ser movimientos auditados y compensatorios, no edición directa.

## AssignmentOffer

El [laboratorio #18](dispatch-lab.md) implementa un agregado aislado con entrada
offered y terminales accepted/declined/expired/withdrawn. No cambia Delivery.
`created → offered → accepted | declined | expired | withdrawn`. Solo `offered` puede convertirse en `accepted`; validación por expiración de servidor y pertenencia del courier; aceptar no asigna si la Delivery ya fue tomada.

## Assignment

Solo el laboratorio aislado implementa active→revoked. Completed/released,
custodia y reasignación operativa siguen pendientes.
`active → completed | released | revoked`. Nunca reactivar una Assignment terminada; reintentos generan registro nuevo. Se requiere unicidad de actividad para evitar doble courier.

## CourierShift
**Corte local #16:** solo `offline ↔ available`, con versión y reloj PostgreSQL.
Estado inicial offline; cada comando nuevo aceptado incrementa versión. Replay
no modifica estado. Deshabilitación del perfil invalida acceso y fuerza offline;
reactivación mantiene offline. `busy` está reservado y es rechazado por API/DB.
Disponible no prueba contratación, vehículo ni elegibilidad financiera de Delivery.

`offline → available → busy → available/offline`. **Presence WebSocket no define este estado**. Disponibilidad autoritativa y reglas de seguridad pueden negar cambio mientras haya servicio activo.

## Order (fase marketplace)
Separado: `pending_confirmation`, `confirmed`, `preparing`, `ready`, `fulfilled`, `cancelled`, etc., por diseñar con operaciones comerciales. No forzar equiparación con Delivery.

## Payment (según PSP)

El [adaptador Stripe offline #23](stripe-checkout-test.md) devuelve observaciones
captured_test/refunded/disputed de sandbox, todas eligible:false; no transiciones
de Payment/Delivery operativos ni conversión de fixtures en evidencia real.

El corte #20 implementa únicamente ServicePaymentIntent pending/version 1 e
intento not_submitted inmutables. Los estados de evidencias pertenecen a casos
aislados del [laboratorio financiero](service-payments.md); confirmed allí no
acredita una Delivery. Elegibilidad operativa siempre false, sin transición a
dispatching. La siguiente lista sigue siendo diseño futuro dependiente de PSP.
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
