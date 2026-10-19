# ADR-0014 — Asignación exclusiva en laboratorio aislado

Fecha: 2026-10-19. Aceptada exclusivamente para el corte sintético solicitado en
#18. No aprueba despacho comercial, pagos, permisos operativos ni datos personales.

Delivery tiene trigger de inmutabilidad y solo requested/version 1. Alterarlo
para probar asignación rompería un contrato existente sin PSP ni política de
custodia. Se elige un agregado DispatchLab independiente con referencias UUID a
escenarios aprovisionados solo por fixtures; sin FK a Delivery ni main/app wiring.
Se evita duplicar o copiar snapshots y no se implementa Payment ficticio.

PostgreSQL impone doble exclusión parcial, transiciones/versiones y reloj; locks
ordenados cooperan con la revocación Courier existente. Outbox y recibos quedan
en la transacción del agregado. FORCE RLS y grants mínimos, sin rol elevado.
El puerto financiero deniega por defecto; adaptador positivo únicamente en tests.
Contrato propietario: [dispatch-lab](../specification/dispatch-lab.md).

No se eligen operador global, flotas, política secuencial, busy, custodia,
retención o PSP. Deshabilitar Courier preserva reservas/historia: no demuestra
resolución de un paquete. El siguiente diseño deberá separar el estado logístico
mutable del hecho/snapshot comercial inmutable, validar finanzas y acceso temporal
a destino, con revisión humana antes de operar. Reversión: retirar composición
interna; conservar tablas/filas. No actualizar ni eliminar datos anteriores.
