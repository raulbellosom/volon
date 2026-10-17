# 03 — Arquitectura y plataforma

**Estado:** arquitectura de referencia candidata; no implica que los frameworks o servicios estén instalados o definitivamente aprobados.

## Monorepo y artefactos
- **Un repositorio independiente** con pnpm Workspaces/Turborepo como candidatos.
- `apps/marketing`: Astro; `apps/customer-web`, `apps/merchant-web`, `apps/admin-web`: React/Next.js candidato; `apps/courier-mobile`: React Native+Expo candidato; `apps/api`, `apps/worker`: TypeScript.
- `apps/customer-mobile` y panel empresarial `fleet-web`: planeados **sin scaffolding** al principio.
- `packages/branding`, `design-tokens`, `ui-web`, `ui-native`, `ui-commerce`, `ui-logistics`, `api-client`, `contracts`, `domain`, `config`.
- Cada app puede tener ciclo y pipeline de despliegue autónomos; packages con dependencias unidireccionales; contratos tipados sin importaciones DOM/móviles.

## Backend y límites
**Monolito modular** con módulos Identity/Access, Merchants, Couriers/Fleets, Pricing, Deliveries, Dispatch, Tracking, Notifications, Payments/Ledger, Support, Audit/Outbox y Catalog/Orders futuro. Responsables claros de escritura, consistencia transaccional y adaptadores externos.

No usar CRUD genérico sin reglas de dominio para operaciones de dinero y entrega. DB autoritativa con FK, constraints, optimistic concurrency, idempotencia y outbox. Worker realiza tareas asíncronas con reintentos, alertas y deduplicación.

## Infraestructura de datos
- **Supabase Self-Hosted** como propuesta para PostgreSQL, Auth, Storage, Realtime y extensiones; validar licencias exactas, RLS, recuperación y características self-hosted.
- PostgreSQL + PostGIS para rutas consultables espacialmente, cobertura e historial selectivo.
- Redis para posiciones actuales, TTL, rate limiting y colas; nunca autoridad final de Order/Delivery/Payment.
- Storage protegido con acceso temporal a fotos/documentos, no URLs públicas de PII.
- Migraciones versionadas y plan de restore probado antes de servicio remunerado.

## Tiempo real y GPS
- App courier obtiene ubicación con permisos y requisitos del sistema operativo; HTTPS/batches hacia Tracking API autenticada.
- La API verifica legitimidad, calidad, secuencia y etapa activa; Redis conserva `last known`, PostGIS hitos permitidos.
- Realtime Broadcast con canales privados por entrega/comercio/repartidor/operación y autorización revocable. WebSocket no garantiza entrega; snapshot por API tras reconectar.
- Eventos críticos en outbox transaccional; mensajes efímeros de GPS **no** crean un outbox por muestra.
- FCM/APNs/Web Push para avisos, separados de Broadcast; los push no sustituyen confirmaciones de negocio.

## Pagos, mapas y proveedores
Interfaces de proveedor para cartografía, geocoding, routing/ETA, procesador de pago, mensajería, observabilidad y almacenamiento. Seleccionar tras comparar cumplimiento de México, precios, límites, latencia, disponibilidad y condiciones de licencia. No mezclar balance de negocio con estado del PSP.

## Diseño de UI
Web: biblioteca propia basada **selectivamente** en código de shadcn y Tailwind CSS 4. Mobile: biblioteca React Native propia con tokens compartidos, gestos nativos y pruebas en dispositivos. NativeWind/estilo mobile permanece decisión abierta. No importar componentes web directamente a native.

## Cambiar marca
El nombre Volón es provisional. Branding central, dominio y apps visibles por configuración, nombres técnicos estables, identificadores de paquete móvil independientes de marca, cambios de dominio/OAuth/deep links controlados. [Política](../brand/rename-policy.md).

## Evolución y separación futura
Primero medir. Si Tracking necesita aislamiento por volumen, extraer el módulo mediante contrato de ingesta/publicación ya definido; si Dispatch requiere afinidad/transacciones diferentes, diseñar separación con consistencia explicitada. No introducir Kafka/Kubernetes/microservicios antes de demostrar necesidad. Definir compatibility windows para móviles.

## Dependencias críticas y documentación ejecutable futura
- [Especificación dominios](../specification/domain-boundaries.md)
- [Relaciones de datos](../specification/data-relationships.md)
- [Máquinas de estados](../specification/state-machines.md)
- [API v1 conceptual](../specification/api-contracts.md)
- [Eventos](../specification/event-contracts.md)
- [Despacho/GPS](../specification/dispatch-and-tracking.md)
- [Security/access](../specification/access-control.md)
- [Spikes](../validation/technical-spikes.md)

**Sin código aún:** no existe contrato OpenAPI publicado, migraciones, diagramas de ejecución ni CI.
