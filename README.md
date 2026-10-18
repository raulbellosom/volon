# Volón — plataforma local de comercio y reparto

**Estado actual: desarrollo técnico iniciado.** El nombre «Volón» es **provisional** y la identidad de dominio interna debe seguir siendo neutral.

Queremos construir una alternativa local en Puerto Vallarta y, posteriormente, Bahía de Banderas y otras ciudades. Ofreceremos (1) envíos solicitados por comercios desde sus canales de venta, (2) marketplace con comisión comercial objetivo **máxima de 10%** y costo de reparto desglosado, y (3) gestión de flotas en una etapa posterior. Tarifas efectivas, régimen legal y operación real aún requieren comprobación; no hay servicios desplegados.

## Código ya existente
- [`packages/pricing`](packages/pricing/README.md): **cálculo de comisiones y cotización logística**, en TypeScript. Comisión marketplace configurable **0%–10% del subtotal de productos**, excluye reparto, impuestos y PSP.
- [`packages/branding`](packages/branding/src/index.ts): punto central para reemplazar nombre comercial y configuración visible.
- [`pnpm-workspace.yaml`](pnpm-workspace.yaml), [`turbo.json`](turbo.json), [`tsconfig.base.json`](tsconfig.base.json): fundamentos del monorepo.
- [`scripts/check-source-lengths.mjs`](scripts/check-source-lengths.mjs): límite automático de tamaño para archivos fuente.
- [`packages/contracts`](packages/contracts/src/index.ts) y [`apps/api`](apps/api/src/app.ts): contrato reutilizable de cotización, handler modular, listener HTTP y adaptadores Auth/PostgreSQL; [alcance y pendientes](docs/specification/api-contracts.md).
- [CI](.github/workflows/pricing-checks.yml): instalación con lockfile, TypeScript estricto, límite de líneas y pruebas de dominio, contratos y API.

**Backend Docker local con Supabase oficial, Prisma/PostGIS y Redis; sin apps web/móviles, pagos ni tracking GPS**. No tomar valores de ejemplo de las pruebas como tarifas comerciales. [Arranque, credenciales sintéticas y protección de red](docs/operations/local-backend.md).

## Ejecutar pruebas ahora
Node.js 22.23.3 (versión probada) y pnpm 10.15.1:

```bash
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` genera/valida Prisma, comprueba longitudes, TypeScript estricto y pruebas sin servicios. `pnpm local:up` construye la API e inicia el backend; después `pnpm local:quote` demuestra crear/consultar una quote y `pnpm test:integration` comprueba el stack real. No hay lint de estilo configurado. [Runbook completo](docs/operations/local-backend.md).

## Prioridad actual
Backend e infraestructura con datos sintéticos. **No iniciar interfaces gráficas en este corte**. Delivery ya permite crear y consultar solicitudes `requested` con snapshot e idempotencia transaccional desde una quote vigente. Siguen pendientes proveedor vial, transiciones, pagos/despacho, auditoría completa y controles de operación; [contratos](docs/specification/api-contracts.md) y [decisiones](docs/specification/open-decisions.md). El marco legal es requisito para lanzar, no motivo para impedir codificar.

## Guías del proyecto
- [Plan Maestro](MASTER_PLAN.md) y [requisitos/casos](docs/product/requirements.md).
- [Modelo operativo inicial](docs/product/pilot-operating-model.md).
- [Modelo comercial y referencias del mercado](docs/product/business-model.md).
- [Marco regulatorio](docs/legal/risks.md).
- [Especificación de arquitectura](docs/specification/README.md).
- [AGENTS.md](AGENTS.md) y [CLAUDE.md](CLAUDE.md): reglas compartidas de calidad, modularidad y tests.
