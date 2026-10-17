# Dominios, módulos y dependencias

**Estado:** propuesta de bounded contexts para un **monolito modular**; cada módulo tiene dueño de escritura y contrato público. Los módulos NO equivalen automáticamente a microservicios, paquetes npm ni contenedores.

## Matriz de responsabilidad

| Módulo / contexto | Posee y escribe | Consume (interfaces / eventos) |
| --- | --- | --- |
| Identity & Access | identidad y memberships/permisos de plataforma | identidades Supabase Auth candidatas |
| Merchants | Merchant, Branch, horarios, zonas operativas de comercio | identidad, zonas geográficas |
| Couriers & Fleets | Courier, Vehicle, Fleet, Shift, elegibilidad | identidad, reglas regulatorias |
| Pricing | FeeRule, PricingQuote, cotización y desglose inmutable | cobertura, rutas, parámetros de comercio |
| Deliveries | Delivery, Stop, prueba de entrega, transiciones | PricingQuote, identidades y asignaciones |
| Dispatch | AssignmentOffer, Assignment, historial de intentos | Delivery, Courier, Tracking reciente |
| Tracking | posición reciente, LocationSample seleccionada, frescura | identidades, entrega/asignación |
| Notifications | DeviceRegistration, Notification, intentos de envío | eventos relevantes, push/correo |
| Payments & Ledger | Payment, Refund, LedgerEntry, Settlement | cotización, proveedor PSP y evento de entrega |
| Support | Incident, SupportTicket, decisiones humanas auditadas | entregas, pagos y organizaciones |
| Audit & Outbox | AuditEvent, OutboxEvent / publicación | transacciones y comandos autorizados |
| Catalog & Orders (futuro) | Product, Cart, Order, OrderItem | Merchants, Pricing, Deliveries y Payments |

## Políticas de dependencia
- Cada módulo expone servicios de aplicación y esquemas de contrato; **ningún módulo escribe tablas ajenas** desde código de negocio.
- Dentro del mismo monolito, interfaces explícitas/llamadas de servicio para consultas y comandos síncronos necesarios.
- Eventos de dominio para reacciones asíncronas (avisos, proyecciones, conciliación), con outbox.
- Evitar encadenar eventos para cumplir invariantes que requieran una sola transacción; modelar consistencia fuerte donde sea indispensable.
- Shared packages solo tipos puros, utilities probadamente comunes, tokens y contratos; no introducir un paquete `common` indiscriminado.
- Read models pueden combinar tablas/proyecciones optimizadas para admin, con autorización y sin crear múltiples fuentes de verdad.

## Quién manda ante conflictos
- Deliveries es fuente autoritativa del estado de entrega.
- Dispatch decide el único Assignment aceptado/activo dentro de transacción y coordina cambio de Delivery usando servicio interno transaccional; la propiedad y consistencia entre ambos se modelan como una unidad de trabajo explícita.
- Payments decide el estado financiero a partir de hechos PSP verificados, nunca del frontend.
- Tracking acepta muestras pero **no altera** estados comerciales ni declara entregas completadas.
- Redis/Realtime son proyecciones temporales; se regeneran desde datos de autoridad o reconcilian desde API.

## Cross-cutting
Autenticación, autorización, auditoría, idempotencia, rate limiting, logging, tracing, configuraciones, moneda, reloj UTC y multi-tenant se implementan como infraestructura compartida con interfaces estables, **no** como reglas escondidas en controladores.

## Crecimiento
Extraer Tracking/Dispatch/Notifications a procesos separados solo si pruebas demuestran necesidades independientes de capacidad, latencia, aislamiento o evolución. Definir primero interfaces y contratos para que sea posible sin rediseñar el dominio. Ver [NFR](nonfunctional-requirements.md).
