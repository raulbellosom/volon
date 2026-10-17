# Monorepo previsto

**Estado:** plano de carpetas, no scaffolding de aplicaciones.

El repositorio GitHub se llama actualmente volon, pero el código no debería usar ese nombre como identidad técnica permanente. Paquetes y dominios deben seguir nombres neutros y documentados.

## Árbol objetivo tras la fase de implementación
    apps/
      marketing/          # Astro; captación y contenido
      customer-web/       # React/Next.js; PWA y pedidos
      merchant-web/       # React/Next.js; comercio y sucursales
      courier-mobile/     # React Native/Expo; GPS y entregas
      admin-web/          # Operaciones, soporte y supervisión
      api/                # Backend modular
      worker/             # Jobs y eventos
      customer-mobile/    # Futuro, NO iniciar en MVP
    packages/
      branding/           # Marca visible reemplazable
      design-tokens/      # Tokens semánticos, web y mobile
      ui-web/             # Código UI web propio (shadcn selectivo)
      ui-native/          # Componentes nativos propios
      ui-commerce/        # UI de comercio reusable
      ui-logistics/       # UI logística con adaptadores web/native
      api-client/         # Cliente tipado API
      contracts/          # Contratos, eventos y esquemas
      domain/             # Tipos/conceptos puros compartibles
      config/             # Convenciones de herramientas
    infrastructure/
      supabase/
      docker/
      observability/
      deployment/
    docs/
      product/
      architecture/
      brand/
      decisions/
      validation/
      roadmap/
      legal/
      operations/
      conventions/

## Reglas
- pnpm Workspaces + Turborepo son la propuesta de herramientas; no instalarlas en Fase 0.
- Los paquetes no deben importar de aplicaciones concretas.
- ui-web no debe filtrar APIs DOM a ui-native; compartir tokens y contratos, no componentes a la fuerza.
- Dominios del backend no deben importar dependencias del frontend.
- Cada app tendrá sus propias variables y pipeline de despliegue.
- Dependencias versionadas con estrategia establecida antes de iniciar código.
- La nomenclatura de paquetes/variables seguirá siendo neutral; nunca acoplarla al dominio público de la marca.
- No crear carpetas vacías únicamente para aparentar desarrollo; Git no las conserva sin archivos.

## Límites de cambios
Si una futura prueba exige dividir aplicaciones o cambiar proveedor, documentar la decisión y migración, evitar reestructuraciones silenciosas.
