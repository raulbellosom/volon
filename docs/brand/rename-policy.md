# Política de marca provisional y cambio de nombre

**Requisito aprobado:** «Volón» es una denominación **provisional**; puede cambiar en cualquier momento.

## Separación de capas
- Marca visible: nombre, eslogan, colores, logos, íconos y material comercial en un único paquete de branding/configuración.
- Identidad visual vigente (logo, paleta, tipografía y voz): [identity.md](identity.md).
- Identidad técnica: nombres neutros de paquetes, tablas, clases, contratos, eventos y servicios.
- Configuración de entorno: URLs, dominio API, callback OAuth, email corporativo, deep links, assets y recursos de terceros.
- Nombre remoto GitHub volon: aceptable de manera provisional, no una razón para acoplar el código.

## Inventario de puntos a migrar
Sitios y DNS, certificados, correos y SMTP, dominios permitidos CORS, OAuth redirects, links de rastreo, push metadata, nombres visibles de apps y assets, store listing, contratos, avisos, SEO, redes sociales, soporte, analítica y branding en comprobantes.

## App stores
Elegir package name Android y bundle identifier iOS técnicos y estables antes de publicar. Cambiar el nombre visible de una aplicación no suele requerir cambiar dichos identificadores; cambiar los identificadores de apps ya publicadas puede requerir nuevas aplicaciones y migración.

## Checklist de cambio
1. Definir marca legal/comercial y comprobaciones de conflicto marcario.
2. Actualizar branding central; comprobar contraste, iconos, textos legales y localización.
3. Configurar dominios, correo, OAuth, deep links y proveedores.
4. Actualizar assets y metadatos de apps con pruebas de enlace y notificaciones.
5. Mantener redirecciones y compatibilidad de URLs antiguas cuando corresponda.
6. Confirmar contratos, privacidad, facturas y comunicaciones.
7. Registrar ADR del cambio y plan reversible donde sea viable.

## Regla
No incluir el nombre Volón en nombres de tabla ni eventos de negocio, ni codificar volon.mx como constante. Este documento podrá renombrarse sin alterar contratos del backend.
