# Volon UI (`@delivery/ui-web`)

**Estado:** primer incremento implementado y probado; pendiente de revisión visual del equipo de producto. Decisión técnica: [ADR-0008](../../docs/decisions/0008-ui-web-stack.md). Identidad: [docs/brand/identity.md](../../docs/brand/identity.md).

Biblioteca de componentes React para las apps web de Volon. Usa React Aria Components para el comportamiento accesible y Tailwind CSS 4 para la apariencia; las APIs y el lenguaje visual son propios. **No** se usa en React Native.

## Ver la galería
```bash
pnpm gallery            # desde la raíz → http://localhost:6006
pnpm --filter @delivery/ui-web gallery:build   # versión estática en storybook-static/
```
En la barra superior: pincel = tema Claro/Oscuro, monitor = viewport, pestaña *Accessibility* = auditoría axe. La sección **Cobertura** muestra la matriz terminado/pendiente, generada desde [`src/coverage.ts`](src/coverage.ts).

## Usar en una app
```tsx
import '@delivery/ui-web/styles.css'; // una vez, en la raíz de la app
import { Button, TextField, ToastRegion, toast } from '@delivery/ui-web';
```
- La app necesita Tailwind 4 (`@tailwindcss/vite` o PostCSS); `styles.css` ya incluye Tailwind, la fuente y los tokens.
- Tema: usa `<ThemeToggle />` o `useTheme()` (Claro / Oscuro / Sistema, persistente) e inserta `themeInitScript` en un `<script>` dentro de `<head>` para evitar el parpadeo. Sin JavaScript, `styles.css` sigue la preferencia del sistema.
- **Todo campo lleva ícono:** `TextField` y `Select` exigen la prop `icon` (TypeScript no compila sin ella); `PasswordField` y `SearchField` traen el suyo.
- Monta `<ToastRegion />` una sola vez.
- Usa utilidades semánticas (`bg-surface`, `text-text-secondary`, `border-border-subtle`); la paleta por defecto de Tailwind está desactivada a propósito.
- `className` en los componentes es para maquetación (márgenes, ancho), no para cambiar su apariencia. Si falta una variante, se agrega aquí.

## Tokens
Los valores vienen de [`@delivery/design-tokens`](../design-tokens/src/). Tras cambiarlos:
```bash
pnpm --filter @delivery/ui-web tokens   # regenera src/styles/tokens.css
```
Una prueba falla si `tokens.css` queda desincronizado; otra falla si algún par de color baja de WCAG AA.

## Estructura
`src/components/<familia>/` contiene el componente, sus pruebas (`*.test.tsx`) y su historia (`*.stories.tsx`). Familias: `actions`, `forms`, `content`, `data`, `navigation`, `feedback`, `overlays` y `brand`; el tema vive en `src/theme/`. `src/gallery/` contiene solo páginas y datos sintéticos de la galería (incluye *Patrones*: formulario y página de ejemplo).

## Agregar un componente
1. Revisa [la matriz de cobertura](src/coverage.ts) y [las normas de componentes](../../docs/conventions/ui-components.md).
2. Construye sobre la primitiva de React Aria si existe; exporta una API pequeña y tipada.
3. Agrega pruebas de comportamiento (teclado, roles, estados) y `axeViolations`.
4. Agrega la historia con variantes y estados, actualiza `coverage.ts` y exporta desde `src/index.ts`.
