# Documentación del proyecto

**Corte inicial:** 17 de octubre de 2026. **Fase:** 0 (planeación). **Nombre de trabajo:** Volón.

## Cómo interpretar este repositorio
- **Requisito:** condición expresada para el producto (p. ej., cambio sencillo de marca, tracking en tiempo real).
- **Propuesta:** elección técnica razonable aún no adoptada por pruebas.
- **Hipótesis:** supuesto comercial u operativo pendiente de entrevistas o datos.
- **Decisión candidata:** dirección aceptada conceptualmente, pero no validada en producción.
- **ADR aceptado:** decisión expresamente ratificada, con contexto, alternativas y consecuencias.
- **Validado:** respaldado por una prueba registrada con evidencias y fecha.

No existe aplicación, infraestructura ni servicio desplegado a partir de esta documentación.

## Trabajo de Fase 0 en GitHub

Los pendientes que requieren evidencias y responsables reales están en [Issues abiertos del repositorio](https://github.com/raulbellosom/volon/issues). El [Plan Maestro: próximas acciones](master-plan/12-next-actions.md) enlaza únicamente los tickets de la fase actual; evitar duplicar su estado manualmente.

## Plan Maestro: punto de entrada

**[MASTER_PLAN.md](../MASTER_PLAN.md)** es la orientación central del programa y **[docs/master-plan/](master-plan/README.md)** contiene la estrategia, todo el desglose de trabajo por IDs WBS, fases P0–P7, criterios de salida, presupuesto, operaciones, riesgos y lanzamiento. Mantener los contratos funcionales detallados en [specification](specification/README.md) y las decisiones de tecnología en ADR. **Plan Maestro en borrador:** no reemplaza aprobaciones, entrevistas ni pruebas.

## Diseño operativo M0 elegido

**[Modelo del piloto M0](product/pilot-operating-model.md):** envíos para comercios, cobro de logística al comercio, cobertura inicial solo en una microzona de Puerto Vallarta, ofertas secuenciales y requisitos de seguridad. Son **elecciones de diseño**, no cumplimiento o demanda validados; revisar [DEC](specification/open-decisions.md).

## Requerimientos y casos de uso

- **[Catálogo vivo de requerimientos RF/RNF](product/requirements.md)**: qué debe cumplir cada capacidad y a qué fase pertenece.
- **[Casos de uso UC](product/use-cases.md)**: actores, precondiciones, flujos, excepciones y resultados.
- [Política de documentación viva](conventions/documentation-lifecycle.md): fuente única por tema, disparadores de actualización y cómo evitar duplicación.
- [Pruebas ACC](specification/acceptance-matrix.md): cómo verificaremos lo exigido, sin confundir un plan de pruebas con pruebas realizadas.

## Lectura sugerida
1. [Visión y principios](product/vision.md)
2. [Audiencias y aplicaciones](product/personas-and-apps.md)
3. [Modelos de negocio](product/business-model.md)
4. **[Especificación detallada del producto, módulos, contratos y MVP](specification/README.md)** (lectura principal para comenzar el desarrollo)
5. [Alcance del MVP resumido](product/mvp-scope.md) y [flujos operativos](product/flows.md)
6. [Arquitectura](architecture/overview.md) y [estructura de repositorio](architecture/repository-structure.md)
7. [Modelo de dominios](architecture/domain-model.md), [GPS y Realtime](architecture/realtime-and-gps.md)
8. [Supabase](architecture/supabase-selfhosted.md), [UI y móvil](architecture/mobile-and-ui.md), [notificaciones](architecture/notifications.md)
9. [Seguridad](architecture/security-and-privacy.md), [finanzas](architecture/finance.md), [operación](operations/hosting.md)
10. [Reglas de cambio de marca](brand/rename-policy.md)
11. [Normas de ingeniería para IA y humanos](conventions/development.md), [componentes reutilizables](conventions/ui-components.md) y [pruebas/CI](conventions/testing-and-quality.md)
12. [Decisiones](decisions/README.md), [pruebas de arquitectura](validation/technical-spikes.md), [plan Fase 0](roadmap/phase-0.md)

## Base de especificación de escala
El dossier [docs/specification](specification/README.md) documenta módulos y ownership, modelo lógico, estados, API v1 ilustrativa, contratos de eventos, permisos por tenant, GPS/dispatch, fallos, NFR, aceptación, cortes de implementación y [decisiones pendientes](specification/open-decisions.md). **Son propuestas contract-first, no endpoints, tablas o funcionalidades ya construidas.** Codex y Claude deben consultarlo antes de implementar.

## Resumen de estado
| Tema | Estado | Dirección actual |
| --- | --- | --- |
| Producto multiactor, comercio local y repartos | Requisito | Marketplace + envíos + flotas |
| Repositorio único | Decisión candidata | pnpm Workspaces + Turborepo |
| Aplicaciones web | Decisión candidata | React / Next.js; marketing Astro |
| App de repartidor | Decisión candidata | React Native + Expo, condicionada a pruebas reales |
| Componentes web | Decisión candidata | UI propia con shadcn/ui selectivo + Tailwind CSS 4 |
| Componentes nativos | Decisión candidata | UI nativa propia + tokens compartidos |
| Backend | Decisión candidata | Monolito modular TypeScript |
| Datos y servicios comunes | Decisión candidata | Supabase Self-Hosted, PostgreSQL/PostGIS |
| Cache y jobs | Decisión candidata | Redis + colas persistentes |
| GPS en tiempo real | Requisito | API de ingestión + ubicación reciente + Broadcast |
| Web/mobile push | Requisito | FCM/APNs/Web Push mediante proveedor apropiado |
| Tarifas y pagos | Por diseñar | Simulación antes de comprometer precios |
| Nombre Volón | Provisional | Marca reemplazable, identificadores técnicos neutros |

## Reglas editoriales
- Markdown en español de México (UTF-8); identificadores de código/tablas en inglés cuando se definan.
- No inventar cumplimiento legal, disponibilidad de dominios, capacidades de proveedores ni métricas de carga.
- Indicar supuestos, fecha, responsable, evidencia, dependencias y decisión pendiente.
- Las guías de terceros son referencias; verificar versiones y licencias en el momento de implementarlas.
- Todo cambio arquitectónico sustancial debe registrar una decisión en docs/decisions.

## Instrucciones para agentes de IA
En la raíz existen [AGENTS.md](../AGENTS.md) para Codex y [CLAUDE.md](../CLAUDE.md) para Claude Code. Ambos remiten a las mismas normas canónicas en [docs/conventions/](conventions/development.md). Durante Fase 0 no hay implementación ni pipeline configurado; los límites y checks están documentados para su futura automatización.
