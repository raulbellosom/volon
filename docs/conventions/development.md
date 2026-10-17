# Convenciones del proyecto

**Estado:** política documental inicial; no hay herramientas instaladas.

- Documentación y UI al usuario en español México, UTF-8 y acentos correctos.
- Nombres técnicos (carpetas, API, campos de tablas, eventos, símbolos) en inglés.
- TypeScript preferente; separar tipos puros de dependencias de UI y backend.
- Preferir nombres técnicos de dominio neutrales respecto de la marca.
- Compromisos de accesibilidad y rendimiento para móviles modestos.
- Secretos, claves de API, tokens de usuarios, datos personales o rutas precisas no se suben a Git.
- Commits claros y coherentes; los cambios de arquitectura requieren ADR.
- API versionada cuando haya clientes móviles publicados.
- Componentes reusables documentados, con contrato, variantes, estados de error y pruebas de gestos/A11y.
- No publicar infraestructura con credenciales de ejemplo funcionales ni asumir que la documentación es configuración segura.
- Usar métricas reproducibles y evidencias para cambiar de arquitectura.
