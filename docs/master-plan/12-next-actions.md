# 12 — Próximas acciones después de elegir el diseño del piloto

**Fecha:** 2026-10-17. Ya elegimos para **diseño** el servicio B2B de entregas para comercios, área inicial reducida en Puerto Vallarta, motocicleta, cobro de logística al comercio y despacho secuencial/manual. Ver [modelo operativo M0](../product/pilot-operating-model.md). **Esto no representa aprobación legal/comercial ni validación técnica.**

## P0: lo único que resta definir antes de pruebas
| Orden | Actividad y responsable funcional sugerido | Entregable / aceptación | Seguimiento en GitHub |
| --- | --- | --- | --- |
| 1 | Producto/Comercial: entrevistas a comercios y couriers | Muestras anonimizadas, demanda/franjas, disposición a pago y disponibilidad | [#1](https://github.com/raulbellosom/volon/issues/1) |
| 2 | Operaciones: dibujar una microzona de Puerto Vallarta y verificar horarios/capacidad/seguridad | Polígono propuesto, límites por distancia/tamaño, soporte y cobertura real | [#2](https://github.com/raulbellosom/volon/issues/2) |
| 3 | Finanzas: unit economics, tarifa por tramo y presupuesto | Escenarios y margen por entrega; impuestos y promociones separados | [#3](https://github.com/raulbellosom/volon/issues/3) |
| 4 | Legal/Fiscal: revisar contratación, IMSS, seguros, facturación y privacidad GPS | Requisitos de operación y conclusión de viabilidad con profesional responsable | [#4](https://github.com/raulbellosom/volon/issues/4) |
| 5 | Producto+Operación: revisar excepciones desde quote hasta entrega | Aceptación o modificaciones a estados/UC, cambios de custodia y cancelación | [#5](https://github.com/raulbellosom/volon/issues/5) |
| 6 | Producto+Ingeniería: acordar requisitos funcionales priorizados y contratos v1 | RF/UC/ACC y contratos seleccionados ratificados para P1/P2 | [#5](https://github.com/raulbellosom/volon/issues/5) |

**El estado vivo está en los Issues enlazados**; esta tabla describe objetivos y dependencias, no duplica su progreso. Los ítems anteriores dependen de **evidencia externa o de responsables reales**, no de escribir más documentación. No inventar que se completaron por haber seleccionado una hipótesis.

## P1: secuencia técnica después del gate
1. Spike React Native/Expo GPS background y batería con teléfonos Android e iPhone reales; gestos/touch targets/A11y.
2. Spike Supabase Self-Hosted, Auth/RLS, Realtime privado, reconexión, PostGIS y restore.
3. Prueba de aceptación concurrente, idempotencia, versionado y transactional outbox.
4. Proveedor de mapas/rutas y PSP México: sandbox, contrato, costos, reembolsos y estados inciertos.
5. Calibración de carga, privacidad, backup y capacidad de soporte; ratificar ADR y presupuesto.

## Habilitación de desarrollo P2
Exigir: objetivos y límites del MVP definidos, decisiones de negocio y seguridad aprobadas, proveedores seleccionados mediante pruebas, versión de contratos documentada, responsables asignados y presupuesto estimado. No requerir éxito comercial del piloto para crear prototipos de P1; sí requerir revisión de seguridad y de datos si se hacen pruebas con personas.

## No hacer todavía
No inventar tarifas MXN ni zonas; no activar servicio comercial remunerado, no implementar wallet, catálogo, customer-mobile o fleet-web; no generar apps productivas a partir de ejemplos. No cerrar DEC-02/03/05/06 por inferencia. Seguir [open-decisions](../specification/open-decisions.md) en lugar de mantener varias listas rivales.
