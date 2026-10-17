# Modelo de dominios y datos preliminar

**Estado:** mapa conceptual, NO esquema SQL aprobado.

> Profundización: [relaciones, claves y ownership](../specification/data-relationships.md), [bounded contexts](../specification/domain-boundaries.md) y [máquinas de estados](../specification/state-machines.md).

## Entidades candidatas (identificadores en inglés)
- Identity: User, OrganizationMembership, Role, Permission, Session.
- Comercio: Merchant, Branch, OperatingHours, ServiceArea.
- Catálogo: Category, Product, Modifier, ProductAvailability.
- Comercial: Cart, Order, OrderItem, OrderAdjustment.
- Logística: Delivery, Stop, AssignmentOffer, Assignment, Courier, Vehicle, Fleet, CourierShift, LocationSample.
- Finanzas: Payment, Refund, Payout, Settlement, LedgerEntry, FeeRule, PricingQuote.
- Comunicación: DeviceRegistration, Notification, OutboxEvent.
- Operación: Incident, SupportTicket, AuditEvent, ProofOfDelivery.

## Invariantes
- Delivery puede existir sin Order (servicio de mensajería de un comercio).
- No inferir estado de Payment a partir de Delivery.
- Un Delivery puede acumular intentos/ofertas y reasignaciones; solo una asignación activa válida para un tramo a la vez.
- Ubicación precisa es dato personal sensible en su contexto operativo; acceso minimizado por entrega/rol.
- Cada comercio puede operar varias sucursales; no confundir tenant lógico con una base independiente.
- Precio cotizado se versiona y persiste con desglose; no recalcular retroactivamente importes pactados sin ajuste registrado.
- Eventos de negocio deben incluir aggregateId, occurredAt, eventId, schemaVersion y causalidad/correlación.
- IDs opacos, timestamps en UTC, moneda con montos enteros en unidades menores y código ISO.

## Despacho y consistencia
Bloqueo o actualización condicional en base de datos para asignación exclusiva, idempotency keys en operaciones externas, outbox para publicación al confirmar transacción, y procesos de reconciliación.

## Pendiente
Cardinalidad definitiva, políticas de cascada/eliminación, índices geoespaciales, segregación de tenants, política de datos históricos, particionado por volumen, elección de ORM y migraciones.
