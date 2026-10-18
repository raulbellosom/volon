# Paquetes compartidos

Existen `pricing` (cálculos puros), `branding` (marca visible: nombre, paleta y logos), `design-tokens` (tokens semánticos claro/oscuro con auditoría de contraste WCAG) y `contracts` (DTO y validación runtime de cotización, con JSON Schema). Los demás paquetes del [mapa del monorepo](../docs/architecture/repository-structure.md) se crearán cuando un corte los necesite.

Cada paquete tendrá responsabilidad clara, imports controlados, contrato y política de versionado. La identidad visual de Volon está en [docs/brand/identity.md](../docs/brand/identity.md); identificadores técnicos permanecerán neutrales.

Ver [estrategia UI y móvil](../docs/architecture/mobile-and-ui.md) y [cambio de marca](../docs/brand/rename-policy.md).
