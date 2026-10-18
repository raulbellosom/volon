# Estándares de ingeniería — normativa del proyecto

**Estado:** reglas de equipo adoptadas para el desarrollo futuro; no significan que ya exista código. Aplica a personas, Codex, Claude y demás agentes.

## 1. Calidad y estructura
- Diseño modular por **dominio y responsabilidad**, no un único archivo por pantalla/servicio con toda la lógica.
- DRY: extraer código cuando una regla o comportamiento se repite de manera significativa. Preferir claridad a una abstracción prematura; no compartir código solo porque se parezca visualmente.
- KISS y separación de responsabilidades: UI presenta, hooks coordinan interacción, servicios encapsulan casos de uso y repositorios/adaptadores manejan infraestructura.
- Evitar dependencias circulares, archivos utilitarios genéricos gigantes, singletons con estado escondido y cascadas de condicionales por tipo de usuario.
- Composición y APIs explícitas por encima de herencia compleja. No inventar microservicios ni capas vacías.
- Cohesión alta y acoplamiento bajo: compartir tipos/contratos sin filtrar dependencias de plataforma entre aplicaciones.
- Legibilidad antes que trucos: evitar abreviar variables sin contexto y no comprimir el código para caber en un límite.

## 2. Límites de líneas para archivos fuente escritos manualmente

| Tipo de archivo | Objetivo obligatorio | Umbral de intervención |
| --- | ---: | --- |
| Componente visual React/React Native (.tsx) | ≤250 | A partir de 251 dividir componentes, lógica o variantes |
| Hook, controlador, caso de uso, handler | ≤200 | A partir de 201 separar responsabilidades |
| Servicio, módulo de dominio, adaptador, repositorio | ≤300 | A partir de 301 revisar y refactorizar |
| Cualquier fuente manual de producción | **≤400 máximo absoluto** | >400 bloquea aceptación salvo excepción aprobada |

- El conteo incluye comentarios y líneas en blanco, para desalentar archivos sobredimensionados; **no se permite minificar ni unir instrucciones para evadirlo**.
- Para pruebas: objetivo ≤400 líneas por archivo; dividir por comportamiento/escenario si excede. No sacrificar una prueba legible para pasar el conteo.
- **Excluidos del límite general:** código generado (con cabecera/origen verificable), lockfiles, artefactos compilados, snapshots verificados, documentación Markdown, migraciones SQL que deban ser atómicas y archivos de configuración declarativa justificados. No aprovechar las exclusiones para esconder lógica de producto.
- Excepciones a código de producción **solo** mediante revisión humana registrada en PR/issue con motivación, imposibilidad razonada de división y plan de seguimiento. La IA no se autoautoriza excepciones.
- Ya existe un chequeo automático de límites en CI; cubre fuente manual bajo `apps/`, `packages/` y `scripts/` y cuenta con pruebas de regresión. El lint de estilo sigue pendiente.

## 3. Separación por capas
- Vista: estado visual, navegación y render.
- Hooks o controllers de UI: interacción, lifecycle, adaptación de datos; no SQL ni cobros.
- Aplicación/use cases: validación de flujos, permisos y comandos.
- Dominio: entidades, políticas e invariantes independientes de framework.
- Infraestructura: base de datos, HTTP, pagos, push, mapas y proveedores intercambiables.
- Contratos y DTO: tipos versionados/validados en límites; nunca confiar en datos solo por estar tipados.
- **Order, Delivery, Assignment y Payment** mantienen estados y reglas independientes.

## 4. TypeScript y contratos
- TypeScript estricto cuando haya código; preferir `unknown` + validación explícita frente a `any`.
- Evitar `// @ts-ignore`, `as any`, non-null assertions y `eslint-disable` sin comentario, razón y aprobación puntual.
- No mezclar errores esperados de negocio con excepciones de infraestructura; estados de carga/error explícitos.
- Configuración validada al arranque y secretos fuera del frontend.
- Contratos de eventos versionados, idempotentes cuando aplique; compatibilidad con apps móviles no actualizadas.
- Inglés para código, rutas, claves y esquema; español México UTF-8 para UI, copy y documentación.
- Nombres internos neutros con respecto a la marca provisional Volón.

## 5. Estado, concurrencia y rendimiento
- Nunca depender de caché o WebSocket como fuente autoritativa de pedidos/pagos/asignaciones.
- Validar cambios críticos en servidor con transacciones, autorización por recurso, idempotencia y logs sin datos sensibles.
- Evitar fetch duplicado, renders innecesarios, N+1 queries, temporizadores descontrolados y listeners sin liberar.
- Manejar abort, unsubscribe, timeout, backpressure, paginación y reconexión según el caso.
- No optimizar prematuramente; definir métricas y medir antes de introducir complejidad.

## 6. Seguridad y cambios
- Nunca hacer commit de secretos, tokens, fotos privadas, información de clientes ni coordenadas reales.
- No migraciones destructivas, cambios de permisos globales, rotación de secretos, despliegues, publicación o reescritura de historia sin aprobación expresa.
- Introducir dependencias solo tras comprobar mantenimiento, licencia, compatibilidad y costo operativo; evitar añadir una biblioteca por un helper trivial.
- Modificaciones enfocadas: no refactorizar código no relacionado; migraciones grandes se dividen en PR revisables.
- Documentar cambios de arquitectura en ADR y cambios de comportamiento en pruebas relevantes.

## 7. Definición de terminado
Un cambio funcional se considera listo cuando satisface criterios de aceptación, conserva límites de capas, tiene pruebas apropiadas, pasa chequeos disponibles, incorpora manejo de fallos/seguridad, está documentado cuando afecta contratos y el agente informa honestamente lo no ejecutado.

Ver también [componentes](ui-components.md), [pruebas](testing-and-quality.md) y [flujo de agentes](ai-agent-workflow.md).
