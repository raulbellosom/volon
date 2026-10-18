# 06 — Experiencia y sistema de diseño

**Estado:** plan UI, no diseño final ni biblioteca implementada.

## Objetivo
Ofrecer un lenguaje visual propio, consistente entre apps, con patrones **adaptados a cada plataforma**. Las pantallas serán eficientes para negocios y operadores, comprensibles para clientes y utilizables con una mano por repartidores.

## Trabajo de diseño secuencial
1. Investigación: jobs-to-be-done y situaciones reales; campos requeridos por cada actor, low-connectivity y horas de alta demanda.
2. Arquitectura de información: navegación por cliente, comercio, courier, admin y flota; sitemap y journey.
3. Wireframes de los flujos críticos con errores y excepciones, no solo caso feliz.
4. Tokens de diseño (semánticos, no nombre de marca): `color.surface`, `text.primary`, spacing, typography, radius, elevation, motion.
5. Biblioteca `ui-web` de primitivas propias incorporando solo los componentes shadcn que agreguen valor y respeten Tailwind CSS 4.
6. Biblioteca `ui-native` propia para React Native. Elegir librerías de gestos y navegación compatibles y probadas, sin compartir DOM/CSS web.
7. Componentes de dominio: `DeliveryCard`, `OrderStatus`, `CourierOffer`, `RouteSummary`, `PriceBreakdown`, `IncidentBanner`, `ProofCapture`.
8. Documentación de props, estados, accesibilidad, screenshots y ejemplos; pruebas visuales y táctiles.
9. Revisiones de es-MX UTF-8, copy comprensible, cantidades y moneda, timezones, formatos fecha/hora.
10. Auditoría en dispositivos reales y navegador responsive antes de aprobar componentes estables.

## Catálogo UI inicial por superficie
| Plataforma | Elementos clave |
| --- | --- |
| Comercio web | Panel de pedidos, formulario de envío, quote, estados, sucursales, disponibilidad, error de red |
| Courier native | Inicio de turno, ofertas urgentes, aceptar/rechazar por botón, ruta, mapas, evidencia, reconexión |
| Admin web | Tabla de entregas, filtros, mapa/cola, reatribución con causa, incidentes, auditoría, permisos |
| Cliente web | Tarjeta de comercio/producto, carrito, checkout, mapa de seguimiento, cancelación/ayuda |
| Flotas | Gestión de miembros, elegibilidad, turnos, incidencias y estados múltiples |

## Reutilización sana
Reusar **tokens, contratos, validación, lógica de dominio y principios de UX**. No compartir un componente React web con React Native si compromete gestos, rendimiento, semántica o accesibilidad. DRY no significa forzar abstracciones universales. Implementar un componente para patrón semántico que se repite, mantener piezas específicas de una pantalla en su feature.

## Reglas móviles obligatorias
- Integración segura con `Gesture Handler` y `Reanimated` si superan pruebas, respetando navegación/back, scrolling y mapas.
- Alternativa accesible a deslizamientos para aceptar/declinar; no gesto único para acciones con efectos irreversibles.
- Safe areas, teclado, fuentes grandes, TalkBack, VoiceOver, haptic feedback configurable, reduce motion, botones de tamaño adecuado.
- Manejo de estado pending/unknown al aceptar para evitar doble toque o confirmaciones falsas.
- Tracking location background probado por separado: gestos correctos no garantizan GPS correcto.

## Brand swap
Marca «Volón» es provisional. `branding` administra logotipos, nombre, assets, slogans y valores de tema; dominios/env/deep links/store listing se migran con checklist. No usar «volon» en paquetes, DB o eventos técnicos.

## Puertas de aprobación
Prototipo revisado por actor de negocio, componentes documentados/ejemplificados, errores/offline, A11y y pruebas reales en teléfonos. Identidad visual aprobada para desarrollo en [identity](../brand/identity.md); registro legal/comercial pendiente (DEC-15).
