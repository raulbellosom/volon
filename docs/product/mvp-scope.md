# Alcance candidato del MVP

**Estado:** hipótesis de secuencia. El piloto podría comenzar con envíos para comercios; validar con entrevistas antes de fijar prioridades.

> Especificación más detallada y vigente para futuro desarrollo: [alcance y releases](../specification/release-scope.md), [módulos](../specification/domain-boundaries.md), [estados](../specification/state-machines.md) y [aceptación](../specification/acceptance-matrix.md). Este documento es el resumen de negocio.

## MVP orientado a entregas locales
- Alta básica de comercio y sucursal; horarios, zonas y contacto.
- Registro y revisión de repartidores de acuerdo con los requisitos aplicables.
- Solicitud de entrega con origen, destino, referencias, instrucciones y costo desglosado.
- Disponibilidad y ofertas de asignación, con aceptación segura y vencimiento.
- Consola de despacho con asignación y reasignación manual.
- Ciclo de entrega: solicitada, asignada, en recogida, recogida, en trayecto, entregada; cancelación e incidencia.
- Tracking GPS durante servicio; visibilidad de ubicación y último dato recibido.
- Notificaciones de hechos relevantes y reconciliación tras reconexión.
- Evidencia de entrega proporcional (p. ej., PIN/foto según casos y política de datos).
- Registro de cargos, pagos y conciliación según alcance comercial que se apruebe.
- Auditoría de cambios y soporte inicial.

## Diferido por defecto
Marketplace abierto con búsqueda y catálogo extensivo; programa complejo de fidelidad; optimización multi-parada; algorítmica sofisticada de precios; suscripciones; customer-mobile; panel de flotas empresarial avanzado; múltiples ciudades simultáneas.

## Criterios de entrada para desarrollar MVP
Definir primer segmento comercial, flujo de cobro, reglas de autorización, cobertura piloto, respuesta ante falta de repartidor, criterios legales y resultados de experimentos GPS/Realtime.

## Criterios de éxito del piloto (definir umbrales con datos)
Ninguna entrega con doble asignación válida; trazabilidad de estados; recuperación sin pérdida irreversible de operaciones; seguimiento con estado de frescura; costos de uso observables; solución manual ante incidencia; cumplimiento documentado.
