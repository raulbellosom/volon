# Especificación de producto y plataforma

**Versión documental:** 0.1 · **Fecha:** 2026-10-17 · **Estado:** borrador de arquitectura, no contrato aprobado ni software implementado.

Este conjunto de documentos define **cómo debería funcionar** un MVP de última milla y cómo conservar capacidad de evolución hacia marketplace, flotas y nuevas ciudades. No confirma aún viabilidad comercial, jurídica ni operativa. El nombre comercial «Volón» es provisional y reemplazable.

## Recorrido recomendado
1. [Alcance, releases y decisiones de producto](release-scope.md)
2. [Módulos y dependencias](domain-boundaries.md)
3. [Relaciones y propiedad de datos](data-relationships.md)
4. [Máquinas de estados y reglas](state-machines.md)
5. [API HTTP propuesta](api-contracts.md)
6. [Eventos y Realtime](event-contracts.md)
7. [Despacho y GPS](dispatch-and-tracking.md)
8. [Permisos multi-organización](access-control.md)
9. [Requisitos no funcionales y escalabilidad](nonfunctional-requirements.md)
10. [Fallos y recuperación](failure-and-recovery.md)
11. [Escenarios de aceptación](acceptance-matrix.md)
12. [Secuencia de implementación](implementation-roadmap.md)
13. [Preguntas que debemos cerrar](open-decisions.md)

## Cómo leer los contratos
- **MUST / Debe:** garantía deseada del producto si se aprueba la especificación; no significa que ya existe.
- **SHOULD / Preferible:** recomendación justificada con margen de adaptación.
- **Ejemplo ilustrativo:** JSON, IDs y rutas que orientan implementación, todavía sin OpenAPI compilado.
- **Pendiente:** decisión con dueño y evidencia solicitada en [open-decisions.md](open-decisions.md).

## Compatibilidad con documentación previa
- [Visión](../product/vision.md), [alcance MVP previo](../product/mvp-scope.md), [flujos](../product/flows.md).
- [Arquitectura candidata](../architecture/overview.md), [modelo conceptual](../architecture/domain-model.md).
- [ADR](../decisions/README.md), [reglas de IA](../conventions/development.md), [validaciones](../validation/technical-spikes.md).

Este dossier **profundiza** la documentación previa, no anula los ADR. Los elementos que parezcan en conflicto deben llevarse a una propuesta de decisión, no resolverse silenciosamente en código.

## Principios de diseño
- Separar **Order (compra)**, **Delivery (traslado)**, **Assignment (responsable operativo)** y **Payment/Ledger (dinero)**.
- Un monolito modular con límites explícitos; no asumir microservicios prematuros.
- PostgreSQL como fuente de verdad, eventos publicados después de confirmar transacción, sockets como proyección reemplazable.
- Requerir autorización por recurso, organización y propósito en cada operación.
- Guardar contratos versionados y cambios compatibles con clientes móviles anteriores.
- Lo crítico sigue operando durante degradación parcial; existen colas, reconexión y operador humano.
- Los targets de capacidad y precios no se inventan: se establecen, prueban y revisan con datos del piloto.

## Gate de salida de esta especificación
Falta revisión de negocio y operaciones, revisión laboral/privacidad/fiscal pertinente, pruebas de GPS y Realtime, proveedor de pagos/mapas y aceptación explícita de contratos antes de construir un sistema comercial real.
