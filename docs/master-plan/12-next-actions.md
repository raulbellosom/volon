# Próximo desarrollo: cortes verticales verificables

**Cambio de enfoque (17-10-2026):** el usuario autorizó iniciar desarrollo técnico. La investigación comercial y legal continúa **en paralelo**; no convierte tareas de negocio en una barrera para implementar software con datos sintéticos.

## Ya iniciado
- Monorepo `delivery-platform`: pnpm/Turborepo proyectados, TS estricto en código puro, branding central.
- `packages/pricing`: comisión marketplace configurable, tope de 10% (1000 bps); cálculo logística **separado**, sin tarifas reales.
- Pruebas unitarias, límite automático de líneas y workflow CI inicial de Node sin dependencias.
- Comparación oficial: [Uber Eats 25/27/29% y Uber Direct por entrega](../product/business-model.md).

## Próximos cortes de desarrollo (no requieren entrevistas previas)
1. **API modular** con health checks, validación de entorno, DTOs runtime y contratos v1 para cotizaciones. Backend calcula políticas, nunca cliente.
2. **Persistencia y autorización multi-tenant** en entorno local/sintético; Merchant, Branch, Courier, Delivery, Quote, idempotency y auditoría.
3. **Portal del comercio** con design system web propio, Tailwind 4 y shadcn selectivo: cotización/simulación/solicitud con estados.
4. **App courier React Native+Expo** en dev-build: ofertas y flujo de entrega sintético; spike GPS en teléfonos reales previo a usar tracking de personas.
5. **Dispatch + Realtime** con aceptación atómica, Broadcast privado y API snapshot.
6. **Pagos/CFDI/contratos reales** solo tras integración sandbox, seguridad y validación legal; no usar el dinero en producción antes.

## En paralelo (no bloquea el código con datos sintéticos)
- Validar con comercios, repartidores, distancias/rutas y precio real, y definir cobertura local.
- Revisar IMSS/STPS, legalidad laboral, SAT/CFDI/IVA/ISR, privacidad GPS, PROFECO y responsabilidad por bienes.
- Elegir proveedores de rutas y PSP México, costear margen/entrega.
- Ratificar parámetros operativos (horario, quote validity, número de comercios).

## Bloqueantes de *lanzamiento*, no de *programación*
Contratación/seguros/seguridad social; uso de datos personales y GPS real; reglas fiscales/cobros; pruebas GPS, privacidad cross-tenant, restauración DB y soporte operativo. Estos controles se deben implementar o probar antes de admitir usuarios reales.

## Alcance
No abrir decenas de Issues para entrevistas si no se requiere; construir cada corte con tests, documentación actualizada y revisión de seguridad. [Master Plan](../../MASTER_PLAN.md) guía horizonte general, [requisitos](../product/requirements.md) definen comportamiento, [política de documentos vivos](../conventions/documentation-lifecycle.md) evita duplicados.
