# 10 — Riesgos, decisiones y gobierno del programa

**Estado:** registro de riesgos inicial; asignar dueños y probabilidades tras investigación. Clasificación `bloqueante` indica que no se inicia piloto sin tratamiento, no es puntuación actuarial.

## Registro inicial de riesgos
| ID | Riesgo | Importancia | Prevención / respuesta | Dueño funcional |
| --- | --- | --- | --- | --- |
| R01 | Modelo económico no rentable por entrega | Bloqueante | escenario unit economics por zona, piloto limitado | Producto/Finanzas |
| R02 | Régimen laboral de plataformas no atendido | Bloqueante | dictamen legal, contratos, procesos y presupuesto | Legal/Operaciones |
| R03 | Retenciones/CFDI/custodia de dinero incorrectas | Bloqueante | asesoría y PSP probado; ledger/reconciliación | Fiscal/Finanzas |
| R04 | GPS background no cumple en Android/iOS | Bloqueante | spike dispositivos y fallback operativo | Mobile/Operaciones |
| R05 | Acceso indebido a ubicaciones/PII | Bloqueante | threat model, authz, canales privados, retención | Seguridad |
| R06 | Doble aceptación de oferta | Bloqueante | transacción, constraints, idempotencia, test concurrente | Backend |
| R07 | Cargos/reembolsos duplicados | Bloqueante | PSP callbacks firmados, dedupe, conciliación | Backend/Finanzas |
| R08 | Caída DB sin backup restaurable | Bloqueante | backup externo, restore drill, runbook | Plataforma |
| R09 | Sin suficientes couriers por zona/hora | Alto | dimensionar y limitar servicio, dispatcher | Operaciones |
| R10 | Costo excesivo de rutas, GPS y Realtime | Alto | batching, monitorización, presupuesto y limites | Plataforma/Finanzas |
| R11 | Realtime caído o push perdido | Alto | API snapshot, polling acotado, outbox y support | Backend/Mobile |
| R12 | Datos de negocio filtrados entre tenants | Bloqueante | matriz de permisos y tests negativos | Seguridad/Backend |
| R13 | Dependencia excesiva de proveedor externo | Alto | adaptadores y plan de contingencia | Arquitectura |
| R14 | Falta de soporte operativo e incident response | Bloqueante | operador humano, horarios y escalamiento | Operaciones |
| R15 | Sin demanda por la modalidad priorizada | Alto | entrevistas/experimentos y criterio pivot | Producto |
| R16 | Cambio de nombre comercial costoso | Medio | branding central y package IDs neutrales | Producto/Ingeniería |
| R17 | Incompatibilidad de versión móvil publicada | Alto | contratos compatibles y soporte transitorio | Mobile/API |
| R18 | Picos por temporada/lluvia | Alto | zone throttling, simulaciones y manejo de capacidad | Operaciones/Plataforma |
| R19 | Incidentes de custodia/seguridad física | Bloqueante | procedimientos, responsabilidad y seguros según ley | Operaciones/Legal |
| R20 | «AI spaghetti code» / deuda creciente | Alto | AGENTS/CLAUDE, PRs revisables, tests y límites CI | Tech Lead |
| R21 | Fraude, cuentas falsas o abuso de promociones | Alto | verificación, límites, revisiones y monitoreo | Seguridad/Operación |
| R22 | Problemas de marca o dominio | Alto | revisión marcaria y cambio de identidad planificado | Producto/Legal |

## Registro y seguimiento
Cada riesgo debe tener: owner real, probabilidad, impacto, indicador precursor, respuesta, fecha de próxima revisión, evidencia y relación con WBS/ADR. **No marcar control aplicado si solo existe documento**.

## Gobierno de decisiones
- Usar [ADR](../decisions/README.md) para tecnología/arquitectura; registrar alternativas, reversibilidad y condición de aceptación.
- Usar [DEC-01..18](../specification/open-decisions.md) para decisiones de producto, infraestructura y cumplimiento.
- `approved` requiere persona autorizada y evidencia; la IA no se autoaprueba una decisión.
- El Plan Maestro dirige alcance/fases; [specification](../specification/README.md) describe comportamiento y contratos; [conventions](../conventions/development.md) rige ingeniería.

## Trabajo colaborativo en GitHub
**Etiquetas propuestas:** `phase:P0`...`phase:P7`, `area:product`, `area:backend`, `area:mobile`, `area:platform`, `area:design`, `area:finance`, `area:legal`, `area:ops`, `risk:critical`, `blocked`, `needs-validation`, `documentation`. Crear etiquetas/proyecto solo cuando decidas operarlo.

**Estados sugeridos:** Backlog → Ready → In Progress → In Review → Validating → Done (o Blocked). Un Issue debe tener WBS ID, fase, owner real, criterios, dependencias, riesgo, pruebas y enlace a PR/ADR.

**Ritmo sugerido:** revisión semanal de bloqueadores y demostraciones, quincenal de alcance, por hito de seguridad/legal/costos, mensual de estrategia y unit economics; ajustar a disponibilidad de equipo.

## Protocolo Codex/Claude
Leen `MASTER_PLAN.md`, especificación, normas y ADR; trabajan por issues acotados y contrato acordado; no crean nuevas rutas/estados sin revisión. Verificar diff y tests, no afirmar resultados no ejecutados. No refactor masivo o cambios no relacionados. Una IA puede redactar propuesta, pero no autorizar por sí misma cambios financieros, legales, destructivos o de infraestructura real.

## Gestión del cambio
Un cambio de producto debe registrar: motivo, actor afectado, costo/beneficio, fase, contratos y migraciones impactados, riesgos, plan de pruebas, owner y aprobación. Marcar elementos `superseded` y mantener enlaces; evitar duplicar documentos rivales.

## Privacidad del repositorio
El repo es **público al 17-10-2026**, según inspección actual. Recomendado privatizarlo cuando se añadan números comerciales, contratos, mapas sensibles o datos internos. No incluir secretos, datos personales o registros GPS en Git independientemente de visibilidad.
