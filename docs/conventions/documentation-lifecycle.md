# Política de documentación viva y mínimo mantenimiento

**Estado:** convención del repositorio, aplicable a colaboradores humanos y agentes (Codex/Claude) durante planificación y desarrollo.

## Principio rector
**Documentar decisiones, contratos, invariantes y comportamientos que una persona nueva no pueda deducir con seguridad del código.** No mantener documentos paralelos que digan lo mismo. La documentación debe evolucionar en el mismo PR que el comportamiento correspondiente, no en una campaña de corrección meses después.

## Fuente de verdad por tipo de información

| Pregunta | Documento propietario | Evitar duplicar en |
| --- | --- | --- |
| ¿Por qué hacemos el producto, qué fases y quién lo prioriza? | [Plan Maestro](../../MASTER_PLAN.md) + capítulos | Casos de uso/ADR |
| ¿Cómo opera comercialmente el primer piloto, quién paga y dónde? | [Modelo operativo M0](../product/pilot-operating-model.md) y [registro DEC](../specification/open-decisions.md) | Copias en cada capítulo del Plan Maestro |
| ¿Qué debe lograr el sistema y en qué release? | [Requerimientos RF/RNF](../product/requirements.md) | WBS/README |
| ¿Cómo interactúan actores y qué excepciones hay? | [Casos UC](../product/use-cases.md) | Flujos/resúmenes paralelos |
| ¿Qué tablas/estados/APIs/eventos rigen? | [Especificación](../specification/README.md) | Casos de uso/Plan Maestro |
| ¿Qué elección de tecnología se aceptó y por qué? | [ADR](../decisions/README.md) | README o chat |
| ¿Qué estamos implementando ahora, quién lo hace y cómo va? | GitHub Issues/PR y, si se habilita, Projects | Checklists manuales estáticos |
| ¿Cómo se comprueba que funciona? | [Casos ACC](../specification/acceptance-matrix.md), tests e informes de ejecución | Reescribir tests en Markdown |
| ¿Qué estándares siguen agentes y devs? | [docs/conventions](development.md) | AGENTS/CLAUDE extensos |
| ¿Cómo configurar/operar algo ya desplegado? | Runbooks/versionados junto a infraestructura real | Roadmap o descripciones aspiracionales |

## Cambios obligatorios en el mismo PR
| Tipo de cambio | Actualizar |
| --- | --- |
| Cambio del pagador, zona, reglas comerciales o despacho M0 | modelo operativo M0 + DEC afectada + RF/UC y API si cambian |
| Nuevo requisito, alcance, prioridad o fase | RF/RNF + UC si afecta interacción + WBS/issue |
| Cambio en flujo de usuario o manejo de error | UC correspondiente + RF impactados + ACC/tests |
| Cambio de estados, validaciones o invariantes | `docs/specification/state-machines.md` + contratos/test asociados; ADR si es arquitectónico |
| Endpoint o evento compatible/incompatible | contrato API/eventos + pruebas de contrato/versionado |
| Permisos o datos personales | matriz access-control + amenaza/privacidad + pruebas adversarias |
| Cambio GPS, Push, Realtime o proveedor | ADR pertinente y documentación técnica + validación real |
| Librería UI, gesto o patrón reusable | normas UI/README del paquete y pruebas de A11y |
| Marca/dominio | brand rename-policy, configuración y pruebas de compatibilidad |
| Operación, backup, despliegue, SLO | runbook correspondiente y evidencia |
| Corrección de bug relevante | test de regresión; documento solo si cambia la regla del producto |

Cambiar código sin modificar documentos es válido cuando no cambia comportamiento público, contrato, decisión o criterio operativo; en el PR explicar `Docs: sin cambios — motivo`.

## Reglas anti-saturación
1. Antes de crear Markdown, **buscar un documento propietario existente**. Preferir editarlo y enlazarlo.
2. Un requisito tiene **un ID**; un caso de uso, **un UC**; una prueba de aceptación, **un ACC**; un entregable, **un WBS**. Se enlazan; no copiar los párrafos entre catálogos.
3. No crear README redundantes por cada carpeta o feature trivial. Cada documento debe aportar decisión, aprendizaje, contrato o procedimiento reutilizable.
4. Los detalles derivados automáticamente de TypeScript/OpenAPI/DB se generan al implementar; no mantener copias manuales de listados de métodos.
5. Evitar documentos con `todo` permanentes: asociar pendientes a Issue/DEC con dueño, evidencia y fase.
6. Cada documento comienza con **propósito y estado** cuando eso es necesario para evitar confusiones entre plan y realidad.
7. Los ADR guardan historia; al cambiar decisión, marcar `Superseded` y enlazar reemplazo, no borrar contexto.
8. No actualizar una fecha por rutina si nada cambió. **Revisar por disparador**, no por calendario artificial.
9. Un documento retirado se reduce a aviso/enlace al propietario vigente; no mantener dos versiones editables.
10. Evitar PII, rutas GPS reales, credenciales y cifras comerciales privadas en documentación pública.

## Trazabilidad mínima: ejemplo
`RF-010 → UC-05 → DEL-005 (WBS) → ACC-004/005 → tests (al implementar) → PR/Issue`.
No hay necesidad de un «traceability.csv» manual adicional. La evidencia real reside en PR/CI; enlaces se agregan cuando existan.

## Responsabilidad de actualización
- **Producto/operación:** RF, UC, alcance, flujos, excepciones, aceptación de negocio.
- **Ingeniería:** API, estados, eventos, seguridad técnica, implementación y runbooks.
- **QA/seguridad:** pruebas, amenazas, evidencias y riesgos.
- **Responsable de cambio:** prepara actualización documental en **su mismo PR**; reviewer valida coherencia.
- **IA:** propone modificaciones y señala conflictos; no ratifica por sí sola requisitos de negocio, acuerdos legales ni pruebas no realizadas.

## Revisión y caducidad
- **En cada PR relevante:** checklist `Docs impactados`, `RF/UC/ACC`, `ADR` y evidencia.
- **Al terminar una fase:** revisar solo documentos afectados por esa fase, enlaces rotos y decisiones abiertas; archivar o marcar reemplazados.
- **Cuando cambie normativa externa/proveedor:** registrar fecha, fuente, versiones e impacto; validar antes de adoptar.
- **Tras un incidente importante:** actualizar runbook/regla y test de regresión necesario.

## Política de estados
`Borrador` → `En revisión` → `Aprobado para fase X` → `Implementado` → `Validado`, o `Sustituido/Descartado`. Aprobación requiere responsable humano identificado y evidencia; **crear un documento no significa haber implementado su contenido**. Requisitos de M1/M2 no se marcan implementados mientras M0 está en curso.

## Comprobaciones automáticas futuras
Cuando se inicialice el monorepo, usar herramientas ligeras de markdown/link checking y consistencia de IDs cuando sea práctico; evitar construir un complejo sistema documental propio. CI podrá comprobar links internos/IDs y archivos críticos, pero no reemplaza revisión semántica humana.

## Mantenimiento esperado
Se actualiza **lo que el cambio toca**, con una justificación y un enlace. No se reescribe entero el Plan Maestro por cada componente. Si surge contradicción, priorizar el dueño de cada tipo de dato, abrir decisión y corregir referencias cruzadas.
