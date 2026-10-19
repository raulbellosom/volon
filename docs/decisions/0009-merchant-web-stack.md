# ADR-0009: merchant-web como SPA con Vite y React Router
- **Fecha:** 2026-10-18
- **Estado:** Aceptada para el primer incremento (issue #10). Ajusta el candidato «React/Next.js» de [ADR-0005](0005-ui-strategy.md) y del [árbol del monorepo](../architecture/repository-structure.md) solo para `merchant-web`.
- **Contexto:** `merchant-web` es un panel autenticado para comercios: sin páginas públicas, sin SEO y con todos los datos detrás de un bearer de Supabase Auth. Consume `@delivery/ui-web`, que ya usa Vite, Tailwind 4 y Vitest ([ADR-0008](0008-ui-web-stack.md)).

## Decisión
| Necesidad | Elección | Versión fijada |
| --- | --- | --- |
| Build y servidor de desarrollo | Vite + `@vitejs/plugin-react` + `@tailwindcss/vite` | 8.3.2 / 6.1.1 / 4.3.3 |
| Rutas | `react-router` en modo librería (`createBrowserRouter`) | 7.18.4 |
| Pruebas | Vitest + Testing Library + jsdom, con la app completa sobre `createMemoryRouter` | igual que ADR-0008 |

- La app habla solo con rutas del mismo origen (`/v1`, `/auth/v1`). En desarrollo, el proxy de Vite las reenvía al backend local de [ADR-0007](0007-local-backend.md) y añade la clave publicable leída de `.env.local`; esa clave nunca entra al bundle.
- El modo demostración (`vite --mode demo`) usa datos sintéticos en memoria. Existe solo en el servidor de desarrollo: la condición es una constante de compilación y `scripts/verify-bundle.mjs` hace fallar el build si aparecen datos demo o secretos locales.

## Alternativas
- **Next.js:** su valor (SSR, rutas públicas, SEO) no aplica a un panel autenticado; añadiría servidor Node, otra cadena de build distinta de `ui-web` y decisiones de despliegue que aún no están tomadas. Sigue siendo candidato para `customer-web` y `marketing`.
- **TanStack Router:** tipado de rutas superior, pero con más API para pocas rutas. React Router se integra directo con el `RouterProvider` de React Aria para que los `Link` de Volon UI naveguen sin recargar.
- **TanStack Query:** se pospone; cinco operaciones sin caché compartida no lo justifican. Un hook `useResource` cubre carga, error y reintento.

## Consecuencias
- Un despliegue real necesitará un gateway del mismo origen para `/v1` y `/auth/v1` (o CORS explícito en la API); queda pendiente junto con el hosting.
- El token vive en `sessionStorage` (se borra con la pestaña). Revisar al definir la sesión productiva y la renovación de tokens.

## Verificación
`pnpm run check` incluye el typecheck y las pruebas de `merchant-web`. CI ejecuta `pnpm run merchant:build`, que compila y verifica el bundle.

## Reversibilidad
Alta: las pantallas dependen del puerto `MerchantApi` y de componentes Volon, no de Vite. Migrar a otro framework afecta el arranque, las rutas y el proxy.
