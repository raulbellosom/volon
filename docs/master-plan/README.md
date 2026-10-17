# Plan Maestro integral — Volón

**Versión:** 0.1 (2026-10-17) · **Estado:** BORRADOR / pendiente de aprobación del alcance y evidencia. **Horizonte:** piloto local → marketplace → flotas → expansión. **Sin fechas/costos/SLAs comprometidos.**

## 1. Propósito
Definir una **fuente de dirección y ejecución** que conecte visión, experiencia, arquitectura, decisiones, entregables, dependencias, riesgos, medición y operación. El plan mantiene intención de largo plazo sin fingir que todos los módulos se desarrollan el primer día.

La plataforma deberá poder brindar envíos solicitados por negocios, pedidos realizados dentro del marketplace y gestión de repartidores/flotas. Sus contratos diferencian compra (`Order`), entrega (`Delivery`), asignación (`Assignment`) y dinero (`Payment/Ledger`). Nunca suponer que una entrega requiere venta de marketplace.

## 2. Inventario de capítulos

| Capítulo | Objetivo |
| --- | --- |
| [01 — Estrategia y descubrimiento](01-strategy-and-discovery.md) | Audiencias, problema, propuesta de valor, hipótesis, entrevistas y validación |
| [02 — Producto y aplicaciones](02-product-and-applications.md) | Todas las experiencias, catálogo de capacidades y prioridades |
| [03 — Arquitectura y plataforma](03-architecture-and-platform.md) | Infraestructura, servicios, paquetes, límites, integraciones, movilidad, GPS |
| [04 — Fases y puertas de salida](04-phases-and-gates.md) | Camino completo, dependencias, resultados, restricciones de entrada/salida |
| [05 — Desglose de trabajo (WBS)](05-work-breakdown.md) | IDs de tareas, entregables verificables y secuencia |
| [06 — Experiencia y design system](06-design-and-experience.md) | Marca reemplazable, sistema de diseño, accesibilidad y patrones móviles |
| [07 — Calidad, seguridad y confiabilidad](07-quality-and-safety.md) | Tests, autorización, cumplimiento, privacidad, SLO, backup y control de cambios |
| [08 — Operación, soporte y comercialización](08-operations-and-growth.md) | Negocios, repartidores, servicio, onboarding, marketing y métricas |
| [09 — Costos, tarifas y economía](09-finance-and-capacity.md) | Viabilidad, unit economics, infraestructura, GPS, mapas y pasarelas |
| [10 — Riesgos, decisiones y gobierno](10-risks-decisions-governance.md) | Riesgos, ADR, dueños, GitHub, IA, cambios y cadencias de revisión |
| [11 — Lanzamiento y expansión](11-launch-and-expansion.md) | Checklist go/no-go, despliegue, contingencias y crecimiento |
| [12 — Próximas acciones](12-next-actions.md) | Orden concreto antes de cualquier scaffolding y estado conocido |

## 3. Jerarquía de fuentes (evita contradicciones)
1. **Objetivo, fases, priorización y dueños del programa:** este Plan Maestro.
2. **Requerimientos y experiencia de actor:** [RF/RNF](../product/requirements.md) y [UC](../product/use-cases.md). 
3. **Comportamiento técnico detallado, máquinas de estados, módulos, API/eventos/aceptación:** [docs/specification](../specification/README.md).
4. **Decisiones arquitectónicas oficialmente adoptadas:** [ADR aceptados](../decisions/README.md), no los borradores.
5. **Reglas obligatorias de código y agentes:** [docs/conventions](../conventions/development.md), [AGENTS.md](../../AGENTS.md) y [CLAUDE.md](../../CLAUDE.md).
6. **Investigaciones y pruebas de stack:** [spikes](../validation/technical-spikes.md).
7. **Riesgos jurídicos/fiscales:** [inventario legal](../legal/risks.md); se resolverán mediante revisión profesional competente.

La [política de documentación viva](../conventions/documentation-lifecycle.md) asigna un documento propietario por tipo de cambio. Ante conflicto: **registrar y resolver**, no elegir tácitamente la versión más conveniente. El plan puede priorizar, pero **no reemplaza** evidencia ni firma legal.

## Dirección de producto M0 (decisión de diseño)
El [modelo operativo del piloto](../product/pilot-operating-model.md) fija para planificación un reparto B2B pagado por el comercio (solo logística, no valor de productos), en microzona de Puerto Vallarta con despacho secuencial y motocicletas. En [DEC](../specification/open-decisions.md) se indican validaciones externas y técnicas que siguen bloqueando su operación comercial. **No confundir dirección elegida con viabilidad confirmada.**

## 4. Gobierno del alcance
- **Requisito decidido conceptualmente:** operar comercio local, repartos, GPS y eventos; marca provisional y arquitectura evolutiva.
- **Dirección preferida pendiente de validación:** monorepo, React Native+Expo, Supabase self-hosted, shadcn selectivo, backend modular.
- **Decisiones abiertas:** tarifas, actores que cobran, estructura legal/laboral, coberturas y números económicos, mapas, PSP, seguridad de datos, términos, nombre final.
- **Hecho verificado:** existen documentos en GitHub. **No se ha implementado ningún servicio ni ejecutado pruebas técnicas.**

## 5. Regla de fases
No construir todas las aplicaciones a la vez. Cada fase produce un **incremento vertical demostrable**, con API, UI, permisos, pruebas, observabilidad y solución de excepciones, antes de ampliar alcance. Un feature «futuro» puede estar contemplado en el modelo sin tener código.

## 6. Indicadores programáticos
- **Negocio:** contribución por entrega, costo variable, captación/retención, satisfacción y adopción de comercios.
- **Operación:** tiempo a asignación, aceptación, entregas finalizadas, incidencias, puntualidad, cancelaciones.
- **Tecnología:** tasa de comandos correctamente confirmados, doble asignación (debe prevenirse), GPS fresco, reconexión, latencia p95, fallas de PSP/push, costo del realtime.
- **Calidad:** pruebas automáticas de contratos y concurrencia, vulnerabilidades, tiempos de restauración reales, defectos en piloto y accesibilidad.

Los umbrales y fórmulas definitivos se definirán con datos y responsables; el plan no inventa SLA.

## 7. Aprobaciones pendientes
No es un plan de ejecución aprobado hasta que se ratifiquen el mercado piloto y modelo comercial, su tratamiento fiscal/laboral, presupuesto, criterios de éxito, organización responsable, fases de producto y tecnología crítica mediante pruebas. Ver [decisiones abiertas](../specification/open-decisions.md).
