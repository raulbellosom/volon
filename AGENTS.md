# Instrucciones para Codex y otros agentes compatibles con AGENTS.md

**Desarrollo incremental autorizado por el usuario a partir del 17-10-2026**: dejar de tratar entrevistas, tarifas finales o contrataciones como prerequisitos del código. Se permiten scaffolding, pruebas, paquetes y apps aisladas con **datos sintéticos**. **No** habilitar repartos reales, dinero real, tracking de personas, producción o tratamientos personales sin controles y revisión aplicable.

**Leer antes de actuar**, en este orden:
0. [MASTER_PLAN.md](MASTER_PLAN.md) y [docs/master-plan/README.md](docs/master-plan/README.md) — plan rector de programa, fases y WBS (borrador, no aprobación de ejecución).
1. [docs/README.md](docs/README.md) — alcance, estados y fuentes de verdad.
2. [docs/conventions/engineering-standards.md](docs/conventions/engineering-standards.md) — reglas obligatorias de calidad y límites.
3. [docs/conventions/ui-components.md](docs/conventions/ui-components.md) — reutilización, web, móvil y gestos.
4. [docs/conventions/testing-and-quality.md](docs/conventions/testing-and-quality.md) — pruebas y puertas de calidad.
5. [docs/conventions/ai-agent-workflow.md](docs/conventions/ai-agent-workflow.md) — proceso para toda IA.
6. [docs/product/requirements.md](docs/product/requirements.md) y [docs/product/use-cases.md](docs/product/use-cases.md) — requisitos RF/RNF, actores UC y escenarios propuestos.
7. [docs/specification/README.md](docs/specification/README.md) — **contratos candidatos** de módulos, API, eventos, estados, permisos y aceptación.
8. [docs/decisions/README.md](docs/decisions/README.md) — ADR, decisiones aún candidatas.

## Mandatos operativos
- Priorizar arquitectura mantenible, módulos pequeños, DRY con criterio, separación de responsabilidades y tipos estrictos. No copiar/pegar lógica entre apps.
- **No crear archivos gigantes ni código espagueti.** Componentes UI ≤250 líneas; hooks/controladores/use cases ≤200; servicios o módulos ≤300; **máximo absoluto de 400 líneas para código fuente manual de producción**. Excepciones justificadas en la política común; no burlarlo con compactación artificial.
- Componer componentes, hooks, servicios y paquetes solo cuando exista una responsabilidad clara. No crear abstracciones prematuras.
- Reutilización web/móvil = tokens, contratos y lógica pura; no forzar componentes web en React Native.
- Escribir o actualizar pruebas de comportamiento y casos límite con cada cambio funcional. No afirmar que una prueba pasó sin ejecutarla.
- Priorizar permisos, privacidad GPS, idempotencia, transacciones y consistencia de pedidos/pagos.
- Nombres técnicos en inglés; documentación e interfaces en español de México UTF-8.
- **Volón es nombre provisional:** no acoplar identifiers internos, contratos, tablas o paquetes a la marca.
- No subir claves, tokens, datos reales ni rutas GPS de personas.
- Respetar convenciones y ADR; documentar conflicto, no cambiar arquitectura silenciosamente.
- **Trabajo incremental:** priorizar cortes verticales funcionales y pruebas, sin convertir entrevistas/Issues de negocio en condiciones para escribir código. Mantener WBS como referencia de alcance y no desarrollar todos los productos a la vez.
- **Documentación viva:** aplicar [docs/conventions/documentation-lifecycle.md](docs/conventions/documentation-lifecycle.md); cada comportamiento nuevo/modificado actualiza solo los documentos propietarios vinculados, sin duplicación.
- **Economía comercial:** marketplace máximo 1000 bps (10%) del subtotal de productos; delivery fee independiente y configurable, nunca asumir que comisión paga al courier. Toda liquidación/cobro requiere PSP y reglas jurídicas confirmadas.
- **Contrato primero:** no crear endpoints, tablas, enums de estado o eventos nuevos sin revisar y actualizar docs/specification y su decisión pendiente; no interpretar ejemplos como implementación aprobada.
- No ejecutar acciones destructivas ni publicar/desplegar sin aprobación explícita.

## Forma de entrega
Indicar objetivo, archivos modificados, decisiones tomadas, pruebas **realmente ejecutadas** con resultados y riesgos pendientes. Si algo no se probó, decirlo. Mantener commits enfocados y evitar cambios ajenos a la tarea.

Las reglas detalladas en docs/conventions son la **fuente normativa**. Si otras instrucciones de IA difieren, proponer su reconciliación, no mantener dos estándares divergentes.
