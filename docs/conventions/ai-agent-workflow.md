# Flujo obligatorio para Codex, Claude y colaboradores con IA

**Objetivo:** usar agentes como desarrolladores disciplinados y auditables, no como generadores de grandes parches opacos.

## Antes de editar
1. Leer [Plan Maestro](../../MASTER_PLAN.md), README, AGENTS.md/CLAUDE.md según herramienta, normativa común, especificación y ADR relacionados. Identificar fase, WBS ID y dependencias.
2. Confirmar fase del proyecto: **durante Fase 0 únicamente documentación**, salvo solicitud explícita de spike.
3. Inspeccionar árbol real, APIs y componentes existentes antes de agregar archivos nuevos.
4. Expresar objetivo, contrato esperado, archivos previstos, riesgos, pruebas y posible ADR.
5. Preferir cambios pequeños y cohesivos, evitando reescrituras masivas o reestructuraciones oportunistas.

## Durante la implementación futura
- Modificar solo lo necesario; mantener límites de dominio, DRY, S.O.L.I.D. cuando sirva a claridad y módulos legibles.
- Si un archivo llega al límite, refactorizarlo **antes** de agregar más responsabilidades.
- Evitar copiar un componente existente; extender o componer con criterio y mantener compatibilidad.
- Si aparece un cambio de arquitectura, detener la expansión del alcance y registrar ADR/alternativas.
- Mantener localizaciones técnicas neutras para cambio de marca, secrets fuera de Git y actualizaciones de dependencias justificadas.
- Escribir pruebas de cambios funcionales y de fallos críticos, no solo snapshots.
- No deshabilitar verificaciones o tests para obtener verde artificial.

## Después
- Ejecutar solamente comandos disponibles (lint, typecheck, test, build) pertinentes; anotar exactamente cuáles, resultados, y los omitidos.
- Verificar diff, dependencias, documentación y seguridad antes de commit.
- Entregar resumen conciso: objetivo cumplido; archivos; decisiones; pruebas con evidencia; pendientes; riesgos; enlaces a commit/PR.
- No inventar resultados ni afirmar que código escrito está desplegado.
- Para cambios de alto impacto (migraciones, despliegue, pagos, llaves, privacidad o eliminación), solicitar aprobación humana y registrar plan de reversión.

## Regla de coexistencia
AGENTS.md y CLAUDE.md solo orientan al mismo conjunto de políticas. **No crear reglas incompatibles por herramienta**. Si una instrucción del usuario cambia un estándar de largo plazo, actualizar la normativa compartida y ambos puntos de entrada si resulta necesario.

## Gobierno de decisiones
Usar ADR para decisiones técnicas significativas y actualizar documentos vinculados; marcar explícitamente Propuesta vs Aceptada vs Validada. No presentar una hipótesis como hecho.
