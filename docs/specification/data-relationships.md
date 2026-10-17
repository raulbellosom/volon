# Relaciones, claves y propiedad de datos

**Estado:** diseño conceptual; NO es migración SQL ni ERD definitivo.

## Relaciones de entidades prioritarias
- `User` —< `Membership` >— `Merchant` / `Fleet` / `PlatformRole` (ámbito específico).
- `Merchant` 1—N `Branch`; `Branch` 1—N `Delivery` originadas por esa sucursal.
- `Courier` 1—N `CourierShift`; `Courier` 0—N `Vehicle` habilitados según control documental.
- `Fleet` 0—N `FleetMembership` >— `Courier`; membresías con vigencia, no propiedad permanente.
- `Delivery` 1—N `Stop`, modelando mínimo pickup/dropoff en piloto; diseño apto para futuras paradas sin implementar multi-stop.
- `Delivery` 1—N `AssignmentOffer` y 0—N `Assignment` históricos; **a lo sumo una activa** para la unidad de trabajo que corresponda.
- `Delivery` 0—N `ProofOfDelivery`, con control de acceso, autenticidad y política de retención.
- `Delivery` 0—N `LocationSample` persistidos selectivamente; última ubicación operativa en Redis con TTL.
- `Delivery` 0—1 `Order` en piloto; **Order puede originar cero o más Delivery en evolución** (split/rehacer envío). Revisar cardinalidad futura explícitamente antes de migrar.
- `PricingQuote` 1—N `FeeLine`, cada `Delivery` referencia el snapshot de la cotización aceptada.
- `Payment` 0—N `Refund`; `LedgerEntry` registra movimientos de dinero asociados a sujeto/comprobante.
- `OutboxEvent` y `AuditEvent` referencian actor, entidad y causalidad sin guardar PII innecesaria.

## Aislamiento multi-organización
- `Merchant` y `Fleet` son ámbitos de autorización separados; un courier puede relacionarse con varias organizaciones sujetas a reglas operativas.
- `Branch` pertenece exactamente a un Merchant, y consultas deben verificar esa relación.
- Consultas por ID deben comprobar actor + recurso + alcance de acceso; **IDs opacos no son autorización**.
- Índices que incluyan scope (p. ej., merchantId, branchId, createdAt) cuando los patrones de consulta lo justifiquen; evitar una sola tabla repartida por cada negocio sin evidencia.
- Separación de empleados, miembros de flota y administradores de plataforma: no otorgar permisos globales a través de una membresía de comercio.

## Integridad e invariantes de base de datos
- PK opaca; FKs reales; unique para identidad y referencias externas; valores monetarios enteros + `currency`.
- `version` monotónica en aggregates de estado y `createdAt/updatedAt` UTC; protegerse contra cambios concurrentes.
- Única asignación activa por delivery/unidad de trabajo: restricción o mecanismo de bloqueo verificable en PostgreSQL.
- Idempotencia: clave única por actor + operación + ámbito, digest del request y respuesta/finalización asociada.
- Outbox en la **misma transacción** que el cambio de negocio; worker deduplica la entrega.
- No usar cascade-delete en eventos financieros/auditoría; borrar/anonymizar PII según política formal sin romper trazabilidad legítima.
- Datos de ubicación: índices espaciales y política de retención/particionado **por definir tras cargas reales**.
- Storage: guardar metadata y permisos en DB; objetos en Storage con URL temporal y sin buckets públicos para evidencia privada.

## Ejemplo conceptual (no esquema final)
    Merchant ──< Branch ──< Delivery >── PricingQuote
                                │
                                ├──< Stop
                                ├──< AssignmentOffer >── Courier
                                ├──< Assignment >── Courier
                                ├──< ProofOfDelivery
                                └──< LocationSample
    Order (futuro) ──< Delivery
    Delivery ──< Incident
    Payment ──< Refund / LedgerEntry / Settlement

## Migración y expansión
Antes de SQL: definir cardinalidades finales del piloto, eliminación lógica, scopes, objetos PII, índices, constraints y ownership por entidad. No inventar tables/columns al implementar una pantalla sin revisar este contrato.
