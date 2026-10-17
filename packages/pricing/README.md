# Pricing domain (primera implementación)

Cálculos puros y deterministas en centavos MXN. No contiene precios comerciales reales ni llamadas a proveedores.

- `calculateMarketplaceCommission`: comisión comercial configurable, limitada a 1000 bps (10%). **No incluye reparto, impuestos, procesador de pago, descuentos o propinas**.
- `calculateDeliveryQuote`: tarifa de reparto independiente, basada en distancia calculada por un proveedor confiable y una política que aún requiere aprobación.
- Nunca permitir que un cliente envíe directamente `commissionBps`, `baseFeeMinor` o `routeDistanceMeters` a un checkout/quote de producción; la API debe resolver y validar la política en servidor.

La única finalidad del código actual es establecer invariantes, tests y una separación de dominios. No es un cotizador ni un API expuesto comercialmente.

## Comprobar
Desde la raíz, con Node >= 22.16: `npm test` y `npm run check:lines` **sin instalar dependencias**. `npm run typecheck` requiere TypeScript 5.8.3 (o `pnpm install` con acceso al registro).

Los valores de tests no representan tarifas de Volón. La marca es reemplazable.
