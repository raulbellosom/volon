# ADR-0001: Un monorepositorio con despliegues independientes
- **Fecha:** 2026-10-17
- **Estado:** Propuesta avanzada
- **Contexto:** múltiples aplicaciones y librerías compartidas para una sola plataforma.
- **Elección candidata:** GitHub monorepo; pnpm Workspaces + Turborepo cuando empiece implementación.
- **Alternativas:** repos separados para cada aplicación; un proyecto único sin módulos.
- **Motivos:** cambios coordinados, paquetes workspace locales, contratos tipados, menor carga administrativa inicial.
- **Consecuencias:** cuidado con dependencias cruzadas, pipelines por aplicación, caché y límites de imports.
- **Validación:** pequeño scaffold futuro y prueba CI incremental, sin publicar paquetes privados inicialmente.
- **Reversibilidad:** se podrían extraer proyectos a repos individuales posteriormente.
