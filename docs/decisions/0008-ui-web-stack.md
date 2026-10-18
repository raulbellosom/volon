# ADR-0008: Stack de Volon UI web (React Aria Components, Tailwind 4 y Storybook)
- **Fecha:** 2026-10-18
- **Estado:** Aceptada para desarrollo (ajusta la elección candidata de [ADR-0005](0005-ui-strategy.md))
- **Contexto:** la issue #8 pide una biblioteca web propia, accesible y completa (incluye combobox, fechas, números con moneda y toasts) antes de construir pantallas, más una galería local para revisarla.

## Decisión
| Necesidad | Elección | Versión fijada |
| --- | --- | --- |
| Comportamiento accesible (foco, teclado, ARIA, overlays) | `react-aria-components` | 1.21.1 |
| Estilos | Tailwind CSS 4 con `@theme` generado desde `@delivery/design-tokens` | 4.3.3 |
| Galería | Storybook (`@storybook/react-vite`, addons docs, a11y y themes) | 10.6.1 |
| Pruebas de componentes | Vitest + Testing Library + jsdom + axe-core | 5.0.3 / 16.3.3 / 30.1.1 / 4.13.0 |
| Íconos | `lucide-react` (ISC; trazo redondeado afín a la cinta del logo) | 1.51.0 |
| Fuente | `@fontsource-variable/plus-jakarta-sans` (OFL, servida localmente) | 5.3.0 |

## Alternativas
- **shadcn/ui sobre Radix (ADR-0005):** Radix no ofrece combobox, selector de fechas ni campo numérico con formato de moneda; habría que sumar otras librerías con APIs distintas. React Aria cubre todo el inventario con una sola API, i18n `es-MX` y estados expuestos como atributos `data-*`, ideales para Tailwind. La apariencia y las APIs públicas siguen siendo de Volon.
- **Ladle:** más ligero, pero con menos soporte para temas, viewports y auditoría a11y integrada; Storybook es el estándar mantenido.
- **CSS Modules / vanilla-extract:** obligan a mapear tokens a mano; Tailwind 4 consume las variables generadas y permite restablecer la paleta para que solo existan colores semánticos.

## Consecuencias
- `packages/ui-web` depende de React 19 como *peer*; las apps futuras importan `@delivery/ui-web` y `@delivery/ui-web/styles.css`.
- `--color-*` de Tailwind se reinicia: no hay colores arbitrarios fuera de los tokens.
- El Toast de React Aria aún se exporta como `UNSTABLE_`; queda aislado en `components/overlays/Toast.tsx` para migrar sin afectar a las apps.
- Nada de esto aplica a React Native; la biblioteca nativa compartirá tokens, no componentes ([ADR-0003](0003-react-native-expo.md)).

## Verificación
`pnpm run check` ejecuta el typecheck y las pruebas de `ui-web`. La galería se compila con `pnpm --filter @delivery/ui-web gallery:build`. La simulación de instalación del Dockerfile de `apps/api` sigue pasando sin copiar el manifiesto de `ui-web`.

## Reversibilidad
Media: las primitivas de React Aria están encapsuladas detrás de componentes Volon; cambiar de librería de comportamiento afecta `packages/ui-web`, no las apps.
