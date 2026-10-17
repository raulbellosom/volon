# Secuencia de implementación por cortes verticales

**Estado:** desarrollo incremental autorizado por el usuario desde el 17-10-2026. Los límites comerciales y legales condicionan **el despliegue real**, no componentes simulados y pruebas locales. Pricing/branding + checks ya comenzaron.

## Investigación paralela al desarrollo
- Revisar [open-decisions.md](open-decisions.md) con negocio/operaciones.
- Aprobar alcance del piloto, modo de cobro, responsables y criterios de cumplimiento.
- Realizar spikes de GPS/gestos, Supabase Realtime, auth y mapas/pagos según riesgos.
- Ratificar ADR y publicar versión inicial del contrato OpenAPI/eventos/estados.
- Decidir política de mantenimiento y versionado de aplicaciones móviles.

## Fase 1 — Plataforma mínima
- Monorepo pnpm/Turbo, paquetes `contracts`, `domain`, `design-tokens`, UI web y native base.
- App shells con rutas/roles limitados, autenticación probada, autorización transversal.
- BD/migraciones y módulos Identity/Merchants/Couriers con datos sintéticos.
- CI con lint, strict typecheck, límites de líneas, tests, builds, secret scanning y licencias.
- Observabilidad, API error contract, entornos separados y restore ensayado.

## Fase 2 — Vertical 1: solicitud y cotización
- Crear Branch, cobertura, quote; registrar Delivery con Idempotency-Key.
- Formularios comercio, interfaz operador, audit log, casos ACC-001/2/3/10/15.
- Validación de precio y disponibilidad servidor, sin requerir GPS aún.

## Fase 3 — Vertical 2: despacho y app courier
- Registro/revisión courier y disponibilidad; offer y aceptación atómica.
- App courier nativa con lista de ofertas y estados de recogida/entrega.
- Reasignación manual, escalamiento y máquina de estados.
- Pruebas ACC-004/5/6/7/16/20.

## Fase 4 — Vertical 3: tiempo real y seguimiento
- GPS background según resultados de spike; ingesta/TTL/visibilidad segura.
- Broadcast privado, UI web de tracking, event outbox, push con fallbacks.
- Pruebas ACC-008/9/11/12/13/17/18/22.

## Fase 5 — Operación, dinero y piloto
- Cobros/conciliación según PSP y modelo jurídico aprobados, incidentes, evidencia, métricas y runbooks.
- Staging, load test, seguridad cross-tenant, dispositivos, disaster drill; pilotos controlados por autorización comercial.
- Casos ACC-014/21 y demás criterios; tableros de costos, errores y tiempos.

## Fases posteriores
- Marketplace completo (catálogo, Order, carrito, checkout).
- UI nativa clientes si se justifica por retención/funciones.
- Flotas avanzadas, multi-sucursal, integración API terceros, expansión y optimización de rutas.

## Trabajo de múltiples agentes
Cada corte admite sub-tareas pequeñas por módulo y contrato. No trabajar en paralelo dos agentes que cambien la misma máquina de estados o el mismo contrato sin coordinar interfaces. PR con cambio acotado, tests y ADR cuando corresponda.

## Gates de salida
Nunca pasar a siguiente corte solo por «la pantalla se ve bien». Debe haber pruebas, errores controlados, permisos, tracking de observabilidad y posibilidad de soporte.
