# ADR-0006: Contratos primero y autoridad transaccional

- **Fecha:** 2026-10-17
- **Estado:** Propuesta; ratificar antes de implementación.
- **Contexto:** coexistirán web, aplicaciones Android/iOS de varias versiones, backend, proveedores externos, GPS y eventos en tiempo real.
- **Elección candidata:** especificar estados de negocio y límites modulares, versiones API, errores, idempotencia, permisos, eventos y compatibilidad antes de crear controladores o publicar clientes.
- **Alternativas:** endpoints improvisados por pantalla; acceso CRUD directo a tablas como API universal; lógica crítica distribuida por clientes y sockets.
- **Motivos:** contratos verificables, integridad del estado, evolución controlada y menor riesgo de roturas en móvil.
- **Consecuencias:** coste documental inicial y discipline de versionar/especificar cambios; API puede evolucionar de manera aditiva.
- **Protecciones:** PostgreSQL conserva estado autoritativo; outbox transaccional para efectos secundarios; Redis y Supabase Realtime son proyecciones y comunicación efímera.
- **Seguridad:** control por actor/recurso/tenant, mínimo privilegio, autorización de campos y canales, revocación de tokens.
- **Validación:** OpenAPI/versionado y tests de contrato; simultaneidad e idempotencia; reconexión; seguridad entre comercios; ejecución de ACC definidos.
- **Reversibilidad:** migración del backend o transporte de eventos sin cambiar semántica contractual.
- **Enlaces:** [dossier de especificación](../specification/README.md), [errores API](../specification/api-contracts.md), [eventos](../specification/event-contracts.md), [aceptación](../specification/acceptance-matrix.md).
