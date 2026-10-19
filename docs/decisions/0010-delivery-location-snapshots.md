# ADR-0010 — Direcciones sintéticas y snapshots compatibles

- Fecha: 18-10-2026. Estado: aceptado exclusivamente para el incremento sintético
  solicitado por el usuario en #11; proveedor, datos reales y producción pendientes.
- Decisión: extender de forma opcional el JSON de solicitud ya persistido, sin
  nuevas tablas ni migraciones. Conservar destino, instrucciones y fuente explícita
  dentro del mismo snapshot que las coordenadas y la tarifa de la quote.
- Pickup se deriva de Branch en servidor y se coteja con el cliente por compatibilidad.
  Un sello privado pickupOrigin identifica los nuevos snapshots autoritativos;
  los anteriores se leen con procedencia desconocida (legacy_input), sin falsificarla.
- Exponer lecturas explícitas de pickup y snapshot. No ampliar los DTOs estrictos
  de cotización/Delivery/historial ni cargar direcciones automáticamente en listas.
  Reutilizar bearer, transacciones de sujeto, RLS y trigger de inmutabilidad.
- Alternativas: duplicar tablas de direcciones ahora (rechazado sin agenda de
  direcciones ni permisos propios); añadir direcciones a todos los listados
  (rechazado por minimización/compatibilidad); copiar el pickup cliente sin
  normalización (rechazado por autoridad); geocodificación automática (diferida).
- Consecuencias: el JSON sirve para datos sintéticos, pero la inmutabilidad actual
  no implementa borrado selectivo/retención de domicilios reales. No habilitar su
  uso antes de resolver política y mecanismos de privacidad, licencia y proveedor.
- Reversión: deshabilitar nuevas lecturas/escrituras enriquecidas manteniendo
  lectura de snapshots existentes con el parser compatible. No borrar datos ni
  retirar campos ya persistidos. No cambiar silenciosamente procedencia/verificación.
- Validación: parsers cerrados, snapshot/price/idempotencia, RLS, fallos y registros
  legacy en unitarias e integración. Contratos propietarios en [API](../specification/api-contracts.md).
- Proveedor: [evaluación documental](../validation/address-provider-evaluation.md).
  DEC-04/07/09 conservan pendientes de operación real; ningún servicio fue activado.
