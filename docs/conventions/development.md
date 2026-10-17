# Convenciones de desarrollo

**Estado:** índice de políticas para futuras implementaciones. **Fase 0 documental**.

La normativa obligatoria está dividida por alcance para que Codex y Claude sigan las **mismas reglas**:

- [Estándares de ingeniería](engineering-standards.md): modularidad, DRY, responsabilidad única, archivos pequeños, TypeScript, seguridad.
- [Componentes UI reutilizables](ui-components.md): design system propio, web/shadcn selectivo, mobile/gestos nativos.
- [Pruebas y calidad](testing-and-quality.md): unitarias, integración, contrato, E2E, dispositivos reales, gates de CI.
- [Flujo de trabajo de agentes](ai-agent-workflow.md): lectura, cambios mínimos, verificaciones, commits y reportes.

## Reglas fundamentales
- UI/documentación en español México UTF-8; código, carpetas, tablas y eventos en inglés.
- Nombre de marca «Volón» provisional, sin acoplarlo a contratos.
- Código modular y DRY con criterio; refactorizar antes de exceder: componente 250, hook/controlador 200, servicio/módulo 300, **máximo absoluto 400 líneas** de fuente manual salvo excepción humana.
- Reusar diseño mediante tokens y contratos entre web/mobile; no compartir renderizadores incompatibles.
- Pruebas del comportamiento que cambia; no declarar éxito si no se ejecutaron.
- Datos personales/GPS, credenciales, tarjetas y permisos requieren cuidado especial.
- Decisiones arquitectónicas se registran en ADR; no imponer como hecho un candidato pendiente.
