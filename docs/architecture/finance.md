# Modelo financiero y pagos

**Estado:** conceptos de arquitectura, pendiente de asesoría fiscal y selección de procesador.

## Objetos separados
- PricingQuote: cálculo explicable y vigente.
- Payment: autorización/captura/cancelación/estatus externo.
- Refund: devolución parcial o total, estado separado.
- LedgerEntry: registro inmutable de movimientos; no actualizar saldos a mano como única fuente.
- Settlement/Payout: conciliación y pago a comercio, repartidor y plataforma.
- FeeRule: tarifa/comisión por modalidad, zona, tipo de servicio y vigencia.
- Invoice/TaxReceipt: integración definida conforme a las obligaciones mexicanas aplicables.

## Principios
Usar valores monetarios enteros en unidades menores + moneda. Conservar desglose, impuesto, descuentos, propinas, redondeos y fuente de cotización. Toda operación externa debe tener clave idempotente y conciliación ante webhooks repetidos, retrasados o ausentes.

## Riesgos
Un PSP que recibe fondos no necesariamente soporta distribución multiparte; requisitos KYC/AML, retenciones, facturación y obligaciones por actividad requieren validación comercial/legal. No asumir que un pago exitoso significa fondos liquidables.

## Antes de elegir PSP
Comparar soporte de México, checkout web/nativo, marketplace/split, pagos a terceros, comisiones, reembolsos, contracargos, soporte, conciliación y facturación. Probar flujos reales en sandbox y documentar tratamiento legal de fondos.
