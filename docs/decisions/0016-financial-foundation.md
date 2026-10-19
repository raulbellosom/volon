# ADR-0016 — Preparación financiera y evidencias aisladas

Fecha: 2026-10-19. Estado: aceptada únicamente para laboratorio local/sintético
por instrucción del Issue #20; operación financiera pendiente de revisión humana.

Delivery requested/version 1 y sus snapshots son hechos inmutables. Sin PSP no
podemos afirmar captura ni liberar despacho. Separamos una preparación pendiente,
inmutable y derivada del importe persistido, de casos de evidencias sintéticas sin
referencia a Delivery. La elegibilidad operativa siempre deniega y no se integra
al puerto de despacho. [Contrato propietario](../specification/service-payments.md).

Alternativas descartadas: paid enviado por cliente, agregar estado financiero al
snapshot, backfill de pagos inexistentes, fake PSP operativo y webhook sin origen
verificado. Ninguna representa evidencia financiera autoritativa.

Cinco tablas aditivas FORCE RLS; recibos y evidencias append-only, locks y versiones,
rol restringido, reloj de PostgreSQL. No SDK, cuenta, credenciales ni llamadas PSP.
No reemplaza PSP ni libro contable. Retirar el módulo conserva historia; no down
migration destructiva. Pruebas deben demostrar aislamiento, rollback, concurrencia,
origen falso, discrepancias y denegación incluso con captura sintética reconciliada.

Pendientes humanos: selección/contrato PSP, revisión fiscal/jurídica y privacidad,
custodia de credenciales, semántica específica de confirmación/reversos/disputas,
retención, conciliación operativa y aceptación de gates de elegibilidad/despacho.
