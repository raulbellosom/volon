# Catálogo vivo de requerimientos

**Versión:** borrador inicial · **Fecha:** 2026-10-17 · **Estado:** definición por revisar con negocio y operación. **No hay implementación ni pruebas ejecutadas.**

## Propósito y límites

Este documento es **la fuente de verdad para requisitos de comportamiento**, no un listado de tareas. No repite estados técnicos, rutas API, tablas ni flujos completos. Cada requisito debe poder enlazarse con un caso de uso (`UC`), un entregable del [WBS](../master-plan/05-work-breakdown.md) y una comprobación del [catálogo ACC](../specification/acceptance-matrix.md).

**M0** = piloto de entregas externas (modalidad **candidata**); **M1** = marketplace; **M2** = flotas avanzadas y escala. `Must` significa indispensable **si esa fase y modalidad se aprueban**, no desarrollo inmediato. `Should` se puede diferir justificadamente. El requisito de GPS y realtime es explícito; la selección exacta del proveedor sigue en evaluación.

## Requisitos funcionales — M0

| ID | Requisito observable | Prioridad | Caso | Trabajo / comprobación |
| --- | --- | --- | --- | --- |
| RF-001 | Un usuario autenticado podrá operar únicamente dentro de organizaciones/sucursales para las que esté autorizado. | Must | UC-01 | ENG-009 / ACC-010 |
| RF-002 | Un responsable autorizado podrá registrar y administrar comercios, sucursales y horarios válidos. | Must | UC-01 | DEL-001 |
| RF-003 | Un repartidor elegible podrá registrarse y tener documentación/vehículo/estado operacional verificados según reglas aplicables. | Must | UC-02 | DEL-002 |
| RF-004 | Un repartidor podrá activar/desactivar disponibilidad; conexión WebSocket no sustituye disponibilidad de turno. | Must | UC-02 | DEL-002 |
| RF-005 | El comercio podrá solicitar una cotización por origen, destino, zona, tipo de servicio y reglas vigentes. | Must | UC-03 | DEL-003 |
| RF-006 | La cotización presentada deberá desglosar cargos y vigencia; el sistema rechazará cotizaciones vencidas o inválidas. | Must | UC-03 | DEL-003 / ACC-015 |
| RF-007 | El comercio autorizado podrá confirmar una solicitud de entrega **sin crear un pedido marketplace**. | Must | UC-04 | DEL-004 / ACC-001 |
| RF-008 | Repetir el mismo comando con una clave de idempotencia válida no duplicará la solicitud. | Must | UC-04 | ENG-010 / ACC-002, ACC-003 |
| RF-009 | La plataforma ofrecerá entregas a repartidores elegibles con plazo de respuesta determinado por el servidor. | Must | UC-05 | DEL-005 / ACC-005 |
| RF-010 | Solo una asignación compatible podrá quedar activa para una entrega/unidad de trabajo; rechazos, expiraciones y conflictos serán explícitos. | Must | UC-05 | DEL-005 / ACC-004 |
| RF-011 | Un operador autorizado podrá reasignar con historial y motivo, sin ocultar el estado de custodia del envío. | Must | UC-06 | DEL-006 / ACC-006, ACC-007 |
| RF-012 | El repartidor asignado podrá reportar llegada, recogida, traslado y entrega, sujetos a transiciones autorizadas. | Must | UC-07 | DEL-004, DEL-008 |
| RF-013 | La entrega exigirá la evidencia definida para su modalidad sin hacer pública información personal. | Must | UC-07 | DEL-009 |
| RF-014 | Comercio, operador y destinatario autorizado podrán consultar estado de entrega; cada actor verá solo datos permitidos. | Must | UC-08 | DEL-007, DEL-014 / ACC-010 |
| RF-015 | La app de repartidores obtendrá y transmitirá ubicación GPS durante periodos autorizados; su funcionamiento real se validará en Android/iOS. | Must | UC-08 | DEL-011 / ACC-017 |
| RF-016 | El seguimiento mostrará frescura y precisión; ubicaciones desactualizadas no se presentarán como actuales. | Must | UC-08 | DEL-012 / ACC-008, ACC-009 |
| RF-017 | Cambios relevantes de asignación/entrega llegarán en tiempo real a clientes conectados y podrán recuperarse vía API tras desconexión. | Must | UC-08 | DEL-012 / ACC-012 |
| RF-018 | La plataforma enviará avisos push/web cuando corresponda, sin considerar el push prueba de aceptación de una oferta. | Should | UC-05, UC-08 | DEL-013 / ACC-013 |
| RF-019 | Las personas autorizadas podrán cancelar/reportar incidencias según etapa, política aprobada, motivos y trazabilidad. | Must | UC-09 | DEL-010 / ACC-016 |
| RF-020 | El operador podrá intervenir ante falta de repartidor, señal, mapa, push o conectividad sin inventar operaciones exitosas. | Must | UC-06, UC-10 | DEL-006, DEL-010 / ACC-020 |
| RF-021 | Toda acción crítica dejará historial de actor, fecha, estado y correlación sin exponer PII innecesaria. | Must | UC-04..UC-10 | ENG-006, DEL-010 / ACC-022 |
| RF-022 | Los registros de cobro, devolución y liquidación corresponderán al **modelo legal y PSP aprobado**, con conciliación e idempotencia. | Must condicionado | UC-11 | DEL-015 / ACC-014 |
| RF-023 | Personal autorizado podrá consultar un tablero operativo de entregas, pendientes e incidencias por su zona/scope. | Must | UC-06, UC-10 | DEL-014 |
| RF-024 | Un destinatario recibirá seguimiento protegido sin obtener acceso a pedidos o coordenadas de terceros. | Must | UC-08 | DEL-012 / ACC-011 |

`Must condicionado` en RF-022 significa que no se acepta operación remunerada sin modelo de cobro legal y técnicamente válido, pero no se presupone que exista wallet, split automático o checkout marketplace en M0.

## Requisitos funcionales — crecimiento planificado (no comprometido para M0)

| ID | Capacidad candidata | Fase | Caso | Trabajo |
| --- | --- | --- | --- | --- |
| RF-025 | Comercio configura catálogo, variantes, imágenes y disponibilidad por sucursal. | M1 | UC-12 | MKT-001, MKT-002 |
| RF-026 | Comprador descubre negocios/productos según zona y horarios. | M1 | UC-12 | MKT-003 |
| RF-027 | Comprador gestiona carrito y checkout con montos recalculados y condiciones visibles. | M1 | UC-13 | MKT-005 |
| RF-028 | Un Order confirmado se relaciona con una o varias Delivery sin mezclar estados de pedido y traslado. | M1 | UC-13 | MKT-006, MKT-008 |
| RF-029 | Pagos del marketplace contemplan capturas, reembolsos, disputas y liquidaciones conciliadas. | M1 | UC-13 | MKT-007 |
| RF-030 | Gestor de flota autorizado administra integrantes/vehículos, turnos y asignaciones de su ámbito. | M2 | UC-14 | FLT-001, FLT-002 |
| RF-031 | La plataforma admite expansión por zonas/ciudades con tarifas, cobertura y operación diferenciadas, sin romper seguridad entre organizaciones. | M2/P7 | UC-15 | EXP-001, EXP-002 |
| RF-032 | Nombre comercial, logos, dominios y recursos visuales pueden cambiar sin renombrar contratos técnicos permanentes. | Transversal | UC-16 | UX-007 / ACC-019 |

## Requisitos no funcionales — marco aplicable a todos los releases

| ID | Garantía o restricción | Evidencia mínima |
| --- | --- | --- |
| RNF-001 | Protección cross-tenant por recurso, acción y campo; ningún ID o nombre de canal concede acceso por sí mismo. | ACC-010, ACC-011, tests de permisos |
| RNF-002 | Estados de entrega, asignación y dinero conservan invariantes bajo reintentos, concurrencia y fallos parciales. | ACC-002..007, ACC-014, ACC-020 |
| RNF-003 | El sistema permite recuperar estado confiable tras fallos de socket/push/red sin perder comandos confirmados. | ACC-012, ACC-013, ACC-022 |
| RNF-004 | Ubicación GPS se minimiza, restringe y conserva según política y fundamento legal aprobado. | revisión legal, threat model, ACC-008/011 |
| RNF-005 | UI web y móvil es accesible, tolera errores, ofrece alternativa a gestos críticos y mantiene estados loading/offline. | ACC-018 y pruebas A11y |
| RNF-006 | Apps móviles mantienen compatibilidad contractual durante ventana de actualización y manejan app en segundo plano según límites SO. | ACC-017, tests de contrato |
| RNF-007 | Producción tiene respaldos externos restaurables, observabilidad y procedimientos de incidente/rollback. | ACC-021, runbooks y simulacros |
| RNF-008 | El producto soportará crecimiento medido de usuarios, repartidores, eventos y zonas sin acoplamientos irreversibles. | benchmark y decisiones de capacidad |
| RNF-009 | Secretos nunca residen en código cliente o repositorio; accesos privilegiados tienen auditoría y mecanismos adecuados de protección. | revisión de seguridad/CI |
| RNF-010 | Integraciones con mapas, PSP, push y proveedores críticos se pueden sustituir mediante interfaces y contratos razonables. | pruebas de adaptadores |
| RNF-011 | Cambiar marca comercial no obliga a cambiar IDs de datos, contratos ni identificadores móviles estables. | ACC-019 |
| RNF-012 | Mantenimiento: módulos cohesivos, límites de archivos, tests y actualizaciones de documentación por cambio. | CI futuro y checklist de PR |

**Los objetivos cuantitativos** (p95, latencia GPS, disponibilidad, RPO/RTO, capacidad, retención y presupuestos) se determinarán mediante la evaluación correspondiente, nunca por un valor inventado. Véase [NFR técnicos](../specification/nonfunctional-requirements.md).

## Fuentes y cambios

- Flujo humano: [casos de uso](use-cases.md).
- Estados: [state-machines](../specification/state-machines.md); permisos: [access-control](../specification/access-control.md).
- Contratos: [API](../specification/api-contracts.md) y [eventos](../specification/event-contracts.md).
- Calidad: [ACC-001..022](../specification/acceptance-matrix.md).
- Cambios de alcance: [Plan Maestro](../../MASTER_PLAN.md) y [decisiones abiertas](../specification/open-decisions.md).
- Regla de mantenimiento: [documentación viva](../conventions/documentation-lifecycle.md).

**Convención de ID:** RF/RNF no se reutilizan si un requisito se retira. Registrar su sustitución, impacto y pruebas. Una fila `M1` no se convierte en `M0` silenciosamente. Todo lo de este catálogo es candidato hasta que se apruebe la modalidad MVP y sus criterios.
