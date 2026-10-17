# Volón — plataforma local de comercio y reparto

**Estado actual: desarrollo técnico iniciado.** El nombre «Volón» es **provisional** y la identidad de dominio interna debe seguir siendo neutral.

Queremos construir una alternativa local en Puerto Vallarta y, posteriormente, Bahía de Banderas y otras ciudades. Ofreceremos (1) envíos solicitados por comercios desde sus canales de venta, (2) marketplace con comisión comercial objetivo **máxima de 10%** y costo de reparto desglosado, y (3) gestión de flotas en una etapa posterior. Tarifas efectivas, régimen legal y operación real aún requieren comprobación; no hay servicios desplegados.

## Código ya existente
- [`packages/pricing`](packages/pricing/README.md): **cálculo de comisiones y cotización logística**, en TypeScript. Comisión marketplace configurable **0%–10% del subtotal de productos**, excluye reparto, impuestos y PSP.
- [`packages/branding`](packages/branding/src/index.ts): punto central para reemplazar nombre comercial y configuración visible.
- [`pnpm-workspace.yaml`](pnpm-workspace.yaml), [`turbo.json`](turbo.json), [`tsconfig.base.json`](tsconfig.base.json): fundamentos del monorepo.
- [`scripts/check-source-lengths.mjs`](scripts/check-source-lengths.mjs): límite automático de tamaño para archivos fuente.
- [`packages/contracts`](packages/contracts/src/index.ts) y [`apps/api`](apps/api/src/app.ts): contrato de cotización y handler HTTP modular aislado; [alcance y pendientes](docs/specification/api-contracts.md).
- [CI](.github/workflows/pricing-checks.yml): instalación con lockfile, TypeScript estricto, límite de líneas y pruebas de dominio, contratos y API.

**Sin apps web/móviles, Supabase, pagos o GPS implementados todavía**. No tomar valores de ejemplo de las pruebas como tarifas comerciales.

## Ejecutar pruebas ahora
Node.js >=22.16 y pnpm 10.15.1:

```bash
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` ejecuta longitudes, TypeScript 5.8.3 y pruebas automatizadas. No hay lint ni build configurados; los paquetes privados exponen TypeScript fuente y la API no inicia un servidor.

## Qué desarrollaremos a continuación
Fundamento de API y contratos de cotización, autenticación/multiempresa, portal de comercios, app de repartidores React Native/Expo (con pruebas GPS reales) y panel de despacho. **Podemos desarrollar con datos sintéticos mientras revisamos el cumplimiento para operar comercialmente.** El marco legal es un requisito para lanzar, no motivo para impedir codificar.

## Guías del proyecto
- [Plan Maestro](MASTER_PLAN.md) y [requisitos/casos](docs/product/requirements.md).
- [Modelo operativo inicial](docs/product/pilot-operating-model.md).
- [Modelo comercial y referencias del mercado](docs/product/business-model.md).
- [Marco regulatorio](docs/legal/risks.md).
- [Especificación de arquitectura](docs/specification/README.md).
- [AGENTS.md](AGENTS.md) y [CLAUDE.md](CLAUDE.md): reglas compartidas de calidad, modularidad y tests.
