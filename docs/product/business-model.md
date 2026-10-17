# Modelos comerciales y decisión inicial

**Estado:** decisión de producto elegida para **diseño del piloto M0**, no tarifa, contrato ni viabilidad económica comprobada.

La única fuente detallada del flujo comercial del primer servicio es el [modelo operativo del piloto](pilot-operating-model.md). No duplicar en este archivo políticas de pagos, horarios, ofertas o restricciones.

## Primera modalidad seleccionada (M0)
- **Business-to-business / Delivery-as-a-Service:** comercio vende por sus canales propios y solicita reparto; comprador final no necesita checkout del marketplace.
- **Pagador:** comercio; **contraprestación a la plataforma: solo por logística**, sin recaudar aquí el valor de los productos.
- **Cobro propuesto:** una operación propia por entrega a través de un PSP externo, antes de habilitar despacho. El `Payment` se mantiene separado del estado `Delivery`; no suponer API final ni PSP aprobado.
- **Tarifario:** base más tramo de distancia/ruta y zona; sin precios dinámicos M0; montos requieren costos reales, seguros, impuestos y aprobación.
- **Courier:** remuneración y obligaciones sociales y fiscales separadas y revisadas legalmente; no asumir estatus independiente automáticamente.

Esta modalidad simplifica el arranque al **no** manejar fondos de mercancía, pero **no elimina** obligaciones laborales, fiscales, de consumo, seguros ni privacidad.

## Modelos futuros, no incluidos en M0
1. Marketplace: comisión comercial, delivery fee y pago de compra conforme a PSP/ley aplicable.
2. Flotas de terceros / comercio con flota: suscripción o uso, con reglas de autorización y liquidación según contratos.
3. Integraciones POS y venta multicanal: interfaces y modelos económicos por diseñar con evidencia.

## Economía unitaria
`Ingreso logístico propio - pago/remuneración aplicable courier - procesamiento - mapas/soporte/reembolsos/seguros/impuestos según su tratamiento contable` proporciona contribución parcial antes de costos fijos. No fijar tasas/ganancias ni confundir GMV con ingreso propio. Ver [finanzas del Plan Maestro](../master-plan/09-finance-and-capacity.md).

## Pendientes de validación
- Régimen de contratación/IMSS/seguros, IVA/ISR/CFDI/retenciones y facturación.
- PSP apto en México, estados uncertain/capture/refund y conciliación financiera.
- Costos reales, aceptación comercial, presupuesto y capacidad de entrega.
- Política contractual de cancelaciones, daños, entregas tardías, custodia y pago a couriers.

Consultar [DEC-02/03/04/09](../specification/open-decisions.md) antes de comercializar o definir un monto.
