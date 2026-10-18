# Relaciones, claves y propiedad de datos

**Estado:** diseño general candidato; el subconjunto local Merchant/Branch/Membership/PricingQuote/Delivery tiene esquema y migraciones Prisma ejecutables. El resto no está implementado.

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

### Delivery local e idempotencia (DEL-004)

`app.Delivery` pertenece a una Branch/Merchant mediante FK compuesta y a una PricingQuote de la misma sucursal/comercio mediante FK compuesta. `quoteId` es único: una quote crea como máximo una Delivery, independientemente de actor o key. Columnas de snapshot: importes total/base/distancia, moneda, versión tarifaria y solicitud de ruta original; sin Order/Payment ni recipient nuevo.

En la misma fila se guardan subject creador, `idempotencyKeyHash` y `requestHash` (SHA-256). Unicidad `(subjectId, branchId, idempotencyKeyHash)` representa la operación fija de creación; no se necesita otra tabla ni persistencia fuera de la transacción. `createdAt` UTC, `version = 1` y `status = requested` tienen restricciones SQL. RLS comprueba subject, Branch habilitada y coincidencia/vigencia del snapshot respecto a la quote al insertar. Runtime solo puede SELECT/INSERT; un trigger rechaza UPDATE/DELETE incluso por otros escritores. Cambios futuros de estados deberán conservar campos inmutables mediante una migración explícita, nunca editando la ya aplicada.

### Primer esquema ejecutable local (ADR-0007)

Prisma es dueño único del esquema privado `app`. `Merchant(id, name, enabled)` es la organización de este corte; no se inventa otra tabla Organization. `Branch(id, merchantId, name, enabled, latitude, longitude)` tiene FK al comercio y unicidad `(id, merchantId)`. `Membership(id, subjectId UUID, merchantId, branchId, enabled)` concede solo cotizar/leer en una sucursal concreta; FK compuesta impide mezclar sucursal y comercio. No concede administración. `subjectId` es identidad Supabase verificada; no se migra ni modifica `auth.users`.

`PricingQuote(id, subjectId, merchantId, branchId, request JSON, amountMinor, baseAmountMinor, distanceAmountMinor, currency, expiresAt, rateVersion, createdAt)` persiste snapshot inmutable. FK compuesta a Branch, importes no negativos con suma consistente y moneda MXN. Membership y cotización se indexan por scope. Todos los accesos runtime usan RLS; el esquema no se expone por PostgREST. No hay eliminación en cascada ni tablas Delivery/Order/Payment en este corte.

PostGIS se habilita mediante la misma historia Prisma, en `extensions`. Sus tipos no se modelan como columnas Prisma: las consultas parametrizadas convierten coordenadas a geography para comprobar recogida/cobertura/distancia sintéticas. Seed y credenciales solo locales.
Antes de SQL: definir cardinalidades finales del piloto, eliminación lógica, scopes, objetos PII, índices, constraints y ownership por entidad. No inventar tables/columns al implementar una pantalla sin revisar este contrato.
