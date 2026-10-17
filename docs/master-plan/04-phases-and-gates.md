# 04 — Fases, dependencias y puertas de aprobación

**Estado:** mapa de ejecución por evidencia, sin calendario inventado. Una fase puede durar lo que requieran sus riesgos, presupuesto y equipo. No declarar «lista» por tener documentos o pantallas.

## P0 — Descubrimiento, definición y gobierno (Fase actual)
**Objetivo:** elegir el primer producto vendible, asegurar viabilidad y cerrar contradicciones de contratos.
**Trabajo:** entrevistas; segmentación; flujos comerciales; zonas; modo de cobro, tarifario, impuestos, contratos y laborales; política de datos y términos; MVP ratificado; ADR; modelo de datos, estados y API candidata; matriz de riesgos; estimaciones iniciales.
**Salida:** product brief aprobado, [open decisions](../specification/open-decisions.md) con dueños, riesgos bloqueantes resueltos, presupuesto preliminar y go/no-go para spikes y plataforma. **Hoy la documentación es borrador; P0 NO está terminada.**

## P1 — Spikes de arquitectura críticos
**Objetivo:** demostrar viabilidad móvil/infra/finanzas antes de comprometer stack.
**Trabajo:** GPS background Android/iOS reales y batería; gestos/A11y; Supabase self-hosted Auth/RLS/Realtime privado/restore; oferta concurrente; push en foreground/background; mapas/ETA/costos; PSP sandbox; capacity baseline.
**Salida:** evidencia reproducible, riesgos conocidos, ADR ratificados, criterios SLO propuestos y decisión de stack. No reutilizar prototipos descartables como producción sin revisión.

## P2 — Plataforma base y design system
**Objetivo:** un monorepo instalable, seguro y observable.
**Trabajo:** proyectos mínimos con rutas, paquetes compartidos; branding neutral, tokens UI, UI web/native; Auth + scopes, configuración validada, entornos local/staging, base de datos/migraciones; CI/CD, checks de líneas, lint, strict TS, unit/contract tests, tracing/logs/backups.
**Salida:** pipeline verde, restore practicado, autorización por tenant probada, apps shells funcionales con datos sintéticos, catálogo de componentes base accesibles.

## P3 — Repartos E2E (sin marketplace)
**Objetivo:** cerrar una entrega de principio a fin sin inventar dinero.
**Trabajo:** alta Merchant/Branch/Courier/Vehicle; cobertura/quote; Delivery + Stops; AssignmentOffer/Assignment; despacho asistido; estados pickup/traslado/entrega; app nativa; evidencia; tracking GPS y Broadcast; push/soporte; cancelación y conciliación según modalidad.
**Salida:** pruebas ACC críticas automatizadas, ciclo E2E en staging y teléfonos reales, sin doble asignación, sin fuga de GPS, operación degradada demostrada.

## P4 — Piloto comercial controlado
**Objetivo:** operar con un conjunto pequeño de negocios/repartidores autorizados, observar fallos y economía real.
**Trabajo:** contratos/privacidad/trámites según asesoría, onboarding y capacitación, soporte humano, cobertura acotada, reglas de pausas/incident response, tarifas aprobadas, facturación/cobros, dashboards operativos, monitoreo, encuestas, experimentos.
**Salida:** KPIs medidos, costos unitarios aceptables, revisiones de seguridad, política de reembolsos y cobertura, decisión documentada de continuar/modificar/pausar.

## P5 — Marketplace y adquisición de consumidores
**Objetivo:** pedidos comerciales dentro de la plataforma.
**Trabajo:** catálogo/productos/opciones/stock; búsqueda y filtros; horarios, cart/checkout; PS P split/capture/reembolso según reglas; Order y relación con Delivery; preparación del negocio; customer-web/PWA; promociones controladas, reseñas y soporte; marketing local/SEO.
**Salida:** reconciliación del dinero, pruebas de checkout y órdenes concurrentes, producto entregado, métricas de conversión, cumplimiento y capacidad.

## P6 — Flotas avanzadas y escala local
**Objetivo:** productividad y nuevas modalidades sin perder controles.
**Trabajo:** FleetMembership/Vehicle/Shift, panel empresa, compatibilidad multicomercio, reglas de elegibilidad y reparto, payout y conciliación multiparte si permitido, integración POS/API, performance/routing, antifraude y analítica.
**Salida:** reglas de acceso cross-tenant probadas, contratos y conciliaciones correctas, latencia y costo sostenibles.

## P7 — Expansión geográfica y madurez
**Objetivo:** operar ciudades/zonas adicionales y mayores volúmenes.
**Trabajo:** rollout por zona, autoservicio comercial, protección de proveedores, observabilidad/SLO, recuperación multi-host, optimizaciones y eventual extracción de módulos, soporte local, estandarización de calidad y reportes.
**Salida:** nuevos mercados pasan el mismo playbook de viabilidad, legalidad y preparación; infraestructura validada con cargas.

## Camino crítico general
`Modelo comercial y legal → Estados/contratos → GPS/Realtime/PSP spikes → Plataforma segura → Asignación exclusiva y entrega E2E → Piloto con soporte → Datos de economía → Marketplace → Flotas → Expansión`.

## Puertas transversales
Cada fase exige: propietario responsable, criterios de aceptación, threat/privacy review proporcional, pruebas ejecutadas, métricas, plan de reversión, documentación actualizada y consentimiento humano para desplegar/operar.

## No avanzar si
Existen dudas sin resolver sobre custodia de fondos, legalidad de repartidores, permisos GPS, asignación simultánea, acceso cruzado a datos, backup/restore o capacidad de responder incidencias. No usar «se probará luego» para estos puntos.

## Dependencia del alcance
El orden P3/P5 puede revisarse **solo** si entrevistas y modelo de negocio justifican iniciar marketplace; registrar cambio explícito, impacto en costos y riesgos.
