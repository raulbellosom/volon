# Despacho, asignación y localización

**Corte #18:** [contrato del laboratorio interno](dispatch-lab.md), aislado de
Delivery y sin endpoints. No habilita el flujo operativo propuesto abajo.

**Estado:** algoritmo inicial por confirmar con operaciones de repartidores. Diseñar primero seguridad y corrección, luego optimización.

## Despacho del piloto
1. En M0, Delivery `requested` con cotización aceptada **y pago del servicio logístico verificado** pasa a `dispatching`. Si el pago es incierto o fallido no se genera ninguna oferta. [Modelo operativo M0](../product/pilot-operating-model.md).
2. Obtener candidaturas elegibles por turno disponible, tipo vehículo, zona, política contractual, situación de entregas activas y frescura GPS.
3. Calcular score **explicable** y configurable: distancia/ETA fiable, disponibilidad, tipo de servicio, carga, capacidad, restricciones. No usar factores discriminatorios ni puntuaciones opacas sin evaluación jurídica/operativa.
4. Ofrecer a un candidato por vez en M0, según estrategia elegida (secuencial con operador manual) con vencimiento de servidor, `offerId` y `expiresAt`.
5. Aceptación: confirmar dentro de transacción, comprobar courier, offer vigente, Delivery apta, que no exista Assignment activa incompatible; asegurar exclusión.
6. Ganador se registra, ofertas restantes se retiran/expiran, eventos del commit van a outbox, UI recupera la versión nueva.
7. Si nadie acepta: reintentar con políticas y límites, escalar a dispatcher, notificar comercio sin ETA inventado.
8. Cambio de courier: revocar y registrar razón, validar custodia del paquete, reasignar bajo un nuevo Assignment.

## Invariantes críticos
- No hay dos Assignments simultáneas activas para la misma unidad logística.
- Los tiempos de expiración los decide el servidor; no el reloj del dispositivo.
- Doble clic, reintento móvil o peticiones concurrentes son idempotentes; solo un resultado ganador.
- La indisponibilidad GPS no equivale automáticamente a abandono ni habilita cancelar una entrega.
- Manual override exige scope de operador, razón, auditable y sin saltarse seguridad/custodia.
- Calcular rutas/ETA con adaptador de proveedor; no confundir distancia en línea recta PostGIS con distancia de manejo real.

## GPS
- Repartidor usa permisos de ubicación para finalidad permitida y se indica tracking activo.
- Ingesta autenticada HTTPS, preferentemente batches cortos (no un request por cada animación).
- Campos conceptuales por muestra: `deviceEventId`, `observedAt`, `lat`, `lng`, `accuracyMeters`, `speedMetersPerSecond?`, `headingDegrees?`, `sequence?`.
- Validar límites geográficos, estructura, precisión, razonabilidad, pertenencia a courier y actividad autorizada. Evitar umbrales rígidos que denieguen datos válidos sin documentar.
- Ordenar y deduplicar por `deviceEventId/observedAt/sequence`. No permitir que una posición vieja reemplace `last-known` más reciente; registrar `receivedAt`.
- Redis con TTL para posición reciente; snapshots limitados y puntos clave en PostGIS según minimización/retención.
- Broadcast transitorio privado a usuarios elegibles; por defecto no conservar cada punto GPS.
- Interfaz muestra `updated X seconds ago`; si queda stale, muestra estado explícito y alternativa de contacto.

## Reglas de privacidad
No seguimiento fuera de turno/entrega salvo propósito justificado y políticas/consentimiento válido; cliente solo su propia entrega con ventana de acceso; soporte acceso limitado y auditado; enlaces públicos jamás enumerables.

## Degradación
- Sin señal: app almacena lo mínimo necesario de forma protegida, envía al reconectar, muestra offline y no falsifica ETA.
- Con GPS impreciso: marcar baja confianza y no usarlo como prueba automática de llegada.
- Sin Supabase Realtime: UI hace polling con backoff y API consistente; la entrega puede seguir.
- Sin mapas/rutas: operador asigna manualmente, mostrar dirección textual; no prometer precio basado en ruta no calculada.
- Sin push: oferta permanece consultable por API; el sistema puede caducar y volver a ofrecer.

## Escalabilidad
- Separar tasa de ingesta de tasa de difusión (coalescing/throttling).
- Sharding lógico futuro por ciudad/zona e índices geoespaciales según resultados de carga.
- Batching, backpressure y límites por dispositivo/actor para evitar escritura y Broadcast excesivo.
- Medir GPS stale, latencia p95 de ingestión, fallos de autorización, consumo de batería y costo por seguimiento activo.
- La extracción a servicio de Tracking separado se decidirá con métricas, sin exigir microservicios desde el piloto.
