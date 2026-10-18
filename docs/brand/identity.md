# Identidad visual de Volon

**Estado:** aprobada por el fundador para desarrollo, 17-10-2026. Las revisiones de registro de marca, dominios y disponibilidad siguen pendientes en [DEC-15](../specification/open-decisions.md). **No sustituye la [política de cambio de marca](rename-policy.md):** los nombres técnicos se mantienen neutros.

## Nombre, lema y valores
- **Nombre comercial:** **Volon**, sin acento. Así se escribe en logo, interfaz, tiendas y comunicación. Los documentos que todavía dicen «Volón» se corrigen cuando se editen por otro motivo; no hace falta una campaña de reemplazo.
- **Lema:** «Pídelo de Volon». En el logo va en mayúsculas espaciadas («PÍDELO DE VOLON»); en textos corridos, en tipo oración.
- **Valores:** rápido, local, confiable y en crecimiento. Guían copy, fotografía e ilustración, pero no se usan como promesas: **no prometer tiempos de entrega que la operación no controla**.

## Logotipo
El símbolo es una cinta en zigzag. La cara lima va arriba y la cara azul se ve en el pliegue: dibuja la «v» y la «n» del nombre y sugiere un trayecto. Los archivos fuente son **PNG generados externamente**. Por ahora **no hay SVG**; se encargarán a diseño cuando la marca se use en impresos o tiendas.

| Pieza | Archivo | Uso |
| --- | --- | --- |
| Logo principal | `logo-primary.png` | Encabezados web y documentos en fondo claro |
| Logo con lema | `logo-tagline.png` | Marketing y portadas en fondo claro |
| Horizontal compacto | `logo-horizontal-light.png` | Barras de navegación y correos (incluye fondo blanco) |
| Una tinta, fondo oscuro | `logo-mono-dark.png` | Fondos azul profundo, app del repartidor |
| Con lema, fondo oscuro | `logo-tagline-dark.png` | Marketing en fondo oscuro |
| Horizontal, fondo oscuro | `logo-horizontal-dark.png` | Navegación en modo oscuro |
| Símbolo | `symbol.png` | Avatares, marcas de agua, cargas |
| Ícono de app | `app-icon.png` | Base para íconos de Android/iOS y favicon |

Los archivos viven en `packages/branding/assets/logo/` y se consumen mediante las rutas que exporta `packages/branding`, nunca copiados a cada app.

**Reglas de uso**
- Zona de protección: alrededor del logo, un espacio libre igual a la altura de la «o».
- Tamaños mínimos: logo horizontal de 120 px de ancho en pantalla; símbolo de 24 px. Por debajo, usar solo el símbolo o el ícono.
- No deformar, rotar, recolorear, añadir sombras ni contornos. No colocar el logo sobre fotografías sin una capa de color que garantice el contraste.
- **El lima nunca va sobre blanco o gris claro** sin estar acompañado del azul del logo; por sí solo es invisible (contraste 1.18:1).

**Limitaciones conocidas de los PNG (resolver antes de imprimir o publicar en tiendas)**
- Las versiones blancas para fondo oscuro tienen ruido en la transparencia: manchas alrededor de las letras y dentro de las «o». Usarlas solo en tamaños pequeños o medianos sobre azul profundo hasta limpiarlas.
- `app-icon.png` tiene márgenes transparentes y esquinas redondeadas. iOS exige un ícono cuadrado de 1024 px **sin transparencia** y Android un ícono adaptativo con capas. Hay que derivarlos del símbolo antes de publicar.
- `logo-horizontal-light.png` no es transparente: solo sirve sobre fondo blanco.

## Paleta
| Nombre | Hex | Rol |
| --- | --- | --- |
| Azul eléctrico | `#0A3DFF` | Acción principal, enlaces, marca |
| Lima | `#C6FF3B` | Acento de marca, destacados sobre azul, acción principal en modo oscuro |
| Azul profundo | `#001863` | Texto principal, encabezados, superficies oscuras |
| Gris claro | `#F4F6F8` | Fondo principal claro |

**Colores funcionales** (no son de marca; existen para estados y deben acompañarse de ícono y texto, nunca comunicar solo con color):

| Estado | Fondo | Texto | Contraste |
| --- | --- | --- | --- |
| Solicitada | `#E5E9F2` | `#001863` | 13.17 |
| Buscando repartidor | `#0A3DFF` | `#FFFFFF` | 6.72 |
| En camino | `#001863` | `#C6FF3B` | 13.56 |
| Entregada | `#15803D` | `#FFFFFF` | 5.02 |
| Incidencia | `#FFB020` | `#001863` | 8.76 |
| Cancelada o error | `#B42318` | `#FFFFFF` | 6.57 |

El verde de «entregada» es oscuro a propósito para que no se confunda con el lima de marca.

**Pares de texto verificados (WCAG 2.x, mínimo AA 4.5:1 para texto normal)**

| Modo | Texto / fondo | Contraste |
| --- | --- | --- |
| Claro | Azul profundo `#001863` / gris claro `#F4F6F8` | 14.79 |
| Claro | Texto secundario `#5B6478` / gris claro `#F4F6F8` | 5.48 |
| Claro | Blanco / azul eléctrico `#0A3DFF` (botón) | 6.72 |
| Claro | Azul eléctrico `#0A3DFF` / gris claro `#F4F6F8` (enlace) | 6.20 |
| Oscuro | Blanco / fondo `#0B1230` | 18.37 |
| Oscuro | Texto secundario `#B8C2E0` / fondo `#0B1230` | 10.35 |
| Oscuro | Azul profundo `#0B1230` / lima `#C6FF3B` (botón) | 15.54 |
| Oscuro | Enlace `#8FA6FF` / superficie `#001863` | 6.92 |

## Tipografía
- **Interfaz y comunicación:** Plus Jakarta Sans (licencia SIL OFL), con pesos 400 para cuerpo, 600 para subtítulos y botones, y 800 para titulares. Cifras tabulares (`font-variant-numeric: tabular-nums`) para precios, horas y distancias.
- **El logotipo es una imagen**, no texto escrito con una fuente. No recrearlo con tipografía.
- Respaldo: la fuente del sistema (`system-ui`) si la web no puede cargar la familia; en React Native, registrar la fuente en la app.

## Voz y tono
Cercana, de tú, en español de México, con frases cortas. Orgullo local sin caer en el folclor. Ante un problema se dice qué pasó y qué sigue, sin culpar ni dar tecnicismos. Ejemplos: «Tu envío ya va en camino», «No encontramos repartidor todavía; seguimos buscando y te avisamos», «Esta dirección está fuera de la zona de servicio».

## Implementación en código
- **`packages/branding`**: lo que cambia si cambia la marca, como nombre comercial, lema, paleta de marca y rutas de los logos. Es el único lugar donde aparece «Volon».
- **`packages/design-tokens`**: traduce la paleta a **tokens semánticos** (`color.action.primary`, `color.text.secondary`, `color.status.delivered`…) para modo claro y oscuro. Exporta variables CSS (consumibles por Tailwind 4 vía `@theme`) y un objeto plano para React Native. No contiene nombres de marca.
- **Pruebas:** cada par de texto y fondo declarado en los tokens se verifica automáticamente: ≥4.5:1 para texto y ≥3:1 para bordes o íconos de interfaz. Si alguien cambia un color y rompe el contraste, CI falla.
- Las apps importan tokens, nunca valores hexadecimales directos.

## Pendientes con responsable
- SVG y limpieza de transparencias de los PNG (diseño).
- Íconos de tiendas iOS/Android y favicon derivados del símbolo (diseño + ingeniería al crear las apps).
- Registro de marca y dominios para «Volon» ([DEC-15](../specification/open-decisions.md)).
- Fotografía e ilustración: sin definir. Las piezas de casco, mochila y chamarra de la presentación son referencias de intención, no uniformes aprobados.
