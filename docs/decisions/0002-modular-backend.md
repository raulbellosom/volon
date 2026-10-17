# ADR-0002: Monolito modular para lógica comercial
- **Fecha:** 2026-10-17
- **Estado:** Propuesta avanzada
- **Contexto:** pedidos, flotas, asignaciones, dinero y soporte tienen reglas transaccionales.
- **Elección candidata:** API TypeScript modular + worker separado para outbox, colas y notificaciones.
- **Alternativas:** microservicios desde día uno; toda lógica en cliente o triggers.
- **Motivos:** consistencia transaccional, control de autorizaciones, costo operativo inicial y facilidad de evolución.
- **Consecuencias:** disciplina para separar dominios y garantizar modularidad real; no bloquear la API con tareas largas.
- **Validación:** pruebas de doble aceptación, idempotencia, caída de worker y reconexión.
- **Pendiente:** framework específico, ORM, estrategia de pruebas y umbrales de separación.
