# Hoja de ruta — Fase 0 y puertas de decisión

**Estado:** el usuario autorizó **comenzar desarrollo técnico desde el 17-10-2026**; el checklist aquí guarda pendientes de descubrimiento sin bloquear código con datos sintéticos. No hay apps productivas ni cobros reales.

> **El estado de ejecución y responsables reales se consulta en [GitHub Issues](https://github.com/raulbellosom/volon/issues)**. El checklist aquí es un hito de planeación y no debe duplicar cada tarea viva.
>
> Este documento conserva el checklist **solo para la Fase 0**. Para todas las etapas del programa, entregables, riesgos y gates consultar el [Plan Maestro](../../MASTER_PLAN.md), sus [fases P0–P7](../master-plan/04-phases-and-gates.md) y [WBS](../master-plan/05-work-breakdown.md).

## Etapa 0A — Fundamentos (documentación inicial)
- [x] Repositorio GitHub iniciado con README de propósito.
- [x] Documentación base de actores, flujos, servicios y módulos.
- [x] Propuestas ADR con estados correctos.
- [x] Plan de validaciones técnicas.
- [x] Reglas base compartidas para Codex y Claude (documentación, código mantenible, componentes, pruebas y límites de líneas).
- [x] Borrador integral de [especificación del MVP y contratos](../specification/README.md) con módulos, estados, permisos, API, eventos, fallos y aceptación.
- [x] [Plan Maestro](../../MASTER_PLAN.md) integral redactado en **estado borrador**, con fases, WBS, producto completo, riesgos, economía y gates.
- [x] Catálogos **borrador** de [requisitos RF/RNF](../product/requirements.md) y [casos de uso UC](../product/use-cases.md), enlazados a WBS y ACC.
- [x] Política de [documentación viva](../conventions/documentation-lifecycle.md) y eliminación de flujos duplicados.
- [ ] Ratificar RF/UC de M0 con comercios, repartidores y operación; definir prioridades y excepciones reales.
- [ ] Revisión y aprobación expresa del alcance/orden del Plan Maestro con responsables.
- [ ] Ratificar con operación y negocio las [decisiones abiertas](../specification/open-decisions.md) y ejemplos de contratos.
- [x] Iniciar monorepo, código puro de `pricing`, pruebas ejecutadas, branding configurable y CI inicial de tests/longitud.
- [ ] Completar lockfile, instalación reproducible, lint, typecheck y builds integrados a CI (aún pendientes).
- [x] Elegir **dirección de diseño** del primer servicio B2B y límites M0: [modelo operativo](../product/pilot-operating-model.md).
- [ ] Validar con negocios/couriers y presupuesto la modalidad elegida, antes de ratificarla comercialmente.
- [x] Definir actor pagador y problema inicial **como hipótesis de negocio**: el comercio contrata logística externa.
- [ ] Confirmar comercialmente la disposición a pagar y condiciones legales/operativas.

## Etapa 0B — Investigación y definiciones
- [ ] Entrevistas con comercios y repartidores piloto.
- [ ] Matriz de modelos de negocio con economía por entrega.
- [ ] Evaluación laboral, fiscal, privacidad y condiciones de servicio en México.
- [ ] Revisión legal/marcaria de denominación final.
- [ ] Selección comparada de mapas y proveedor de pagos.
- [x] Redactar catálogo **propuesto** de eventos, estados de Delivery/Assignment/Payment y permisos por rol.
- [ ] Ratificar catálogo, casos límite y estados de Order antes de generar contratos ejecutables.
- [ ] Cerrar objetivos medibles, presupuesto y alcance del MVP.

## Etapa 0C — Spikes técnicos (código descartable y aislado)
- [ ] GPS Android/iPhone en background y batería.
- [ ] Realtime Broadcast privado y reconexión.
- [ ] Concurrencia del despacho y pruebas de asignación atómica.
- [ ] Push y UX móvil/gestos accesibles.
- [ ] Supabase Self-Hosted: licencias/versiones, RLS y restauración.
- [ ] Capacidad, costos y protocolos operativos.

## Puerta para pasar a Fase 1
Las decisiones críticas están explícitamente aceptadas en ADR, el MVP comercial tiene propietario, la conformidad legal ha sido revisada, las pruebas de GPS/Realtime funcionan según criterios definidos y existe estimación de costos. Hasta entonces, evitar scaffolding masivo.

## Etapas posteriores candidatas
Fase 1: monorepo implementado y diseño/identidad; Fase 2: piloto de envíos y despacho; Fase 3: marketplace; Fase 4: flotas e integraciones. El orden depende del descubrimiento comercial.

## Criterios de progreso
Cada entregable enlaza evidencia, decisión y responsable. El checklist no sustituye ejecución real ni aprobación.
