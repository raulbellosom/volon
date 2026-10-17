# Instrucciones de proyecto para Claude Code

Volón es una **marca provisional** de una plataforma de entregas locales. El repositorio se encuentra en Fase 0 (solo documentación). **No implementar código ni desplegar nada** sin instrucción explícita.

Este archivo es un punto de entrada, NO una segunda normativa independiente. Antes de editar leer [MASTER_PLAN.md](MASTER_PLAN.md) y [docs/master-plan/README.md](docs/master-plan/README.md) (programa, fases, WBS y bloqueadores, aún borrador). Aplicar además en orden:
1. [docs/README.md](docs/README.md): situación y alcance.
2. [docs/conventions/engineering-standards.md](docs/conventions/engineering-standards.md): arquitectura limpia, DRY, tamaños máximos y tipos.
3. [docs/conventions/ui-components.md](docs/conventions/ui-components.md): componentes reutilizables web y React Native.
4. [docs/conventions/testing-and-quality.md](docs/conventions/testing-and-quality.md): estrategia y evidencias de calidad.
5. [docs/conventions/ai-agent-workflow.md](docs/conventions/ai-agent-workflow.md): disciplina de cambios y reportes.
6. [docs/product/requirements.md](docs/product/requirements.md) y [docs/product/use-cases.md](docs/product/use-cases.md): RF/RNF, UC y trazabilidad.
7. [docs/specification/README.md](docs/specification/README.md): contratos **propuestos** de módulos, entidades, API, eventos, permisos y validación.
8. [docs/decisions/README.md](docs/decisions/README.md): estado real de elecciones técnicas.

## Reglas rápidas
- Componentes UI ≤250 líneas; hooks/controladores/casos de uso ≤200; servicios/módulos ≤300; ningún archivo fuente manual de producción >400 líneas, salvo excepción explícita documentada.
- No código espagueti, no duplicación significativa, no componentes monstruosos, no abstracciones gratuitas, no supresión de errores de tipo.
- Modularidad por dominio, responsabilidades pequeñas, contratos tipados, pruebas de comportamiento y refactor antes de crecer.
- Web: biblioteca propia con shadcn selectivo y Tailwind 4 **como propuesta**. Mobile: React Native + Expo **condicionado a pruebas**; UI nativa y gestos propios; compartir tokens, no DOM.
- Estado financiero, asignaciones y permisos se validan en backend; no fiarse de clientes ni eventos.
- No asumir tests ejecutados ni servicios existentes. No datos reales, contraseñas, claves ni credenciales en Git.
- Código y nombres técnicos en inglés; contenido visible/documentación en español México.
- Mantener neutralidad frente a cambios de marca.
- **Alcance controlado:** toda propuesta de trabajo identifica WBS/fase del Plan Maestro; no implementar fases futuras sin instrucción explícita.
- **Documentación viva:** seguir [docs/conventions/documentation-lifecycle.md](docs/conventions/documentation-lifecycle.md), modificar la fuente propietaria del cambio y evitar duplicados.
- **Contract-first:** antes de agregar endpoints, estados, tablas o eventos, revisar el dossier docs/specification, resolver decisiones abiertas y actualizar contratos/propuestas pertinentes.
- Antes de editar: inspeccionar los archivos pertinentes, diseñar cambio mínimo, identificar pruebas y riesgos. Después: verificar, explicar lo comprobado y lo pendiente.
- No hacer push de cambios no relacionados, reescribir historial, borrar datos ni desplegar sin indicación.

**Única fuente de reglas detalladas:** docs/conventions/. Evitar duplicar allí y aquí el procedimiento completo; ante contradicción avisar y ajustar archivos de entrada.
