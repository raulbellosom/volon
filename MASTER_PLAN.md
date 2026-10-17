# PLAN MAESTRO — Proyecto «Volón» (nombre provisional)

> **Documento rector del programa.** Versión 0.1, 17 de octubre de 2026. **Estado: plan de producto en revisión, pero desarrollo técnico iniciado en paquetes aislados; no hay aplicaciones ni operación productiva.**
>
> La marca «Volón» podrá sustituirse; nombres técnicos, API, contratos, aplicaciones y datos no deben depender de ella. Piloto de diseño inicial dentro de Puerto Vallarta, Jalisco; Bahía de Banderas queda para expansión posterior.

## Qué contiene
El plan cubre el **negocio entero y su evolución**, no únicamente la API o el MVP: descubrimiento comercial, alcance de producto, experiencia de clientes/comercios/repartidores/flotas/operadores, infraestructura, arquitectura, diseño UI, datos, tiempo real, seguridad, legal, pagos, operación real, métricas, marketing, soporte, calidad, piloto, marketplace, expansión, presupuesto y gestión.

**Punto de entrada:** [Plan Maestro completo](docs/master-plan/README.md). **Requisitos verificables:** [RF/RNF](docs/product/requirements.md) y [casos de uso](docs/product/use-cases.md). El [ciclo de vida documental](docs/conventions/documentation-lifecycle.md) impide mantener catálogos duplicados.

## Alcance ejecutivo
- **Servicio A — Envíos para comercios:** solicitar logística sin vender necesariamente dentro de la plataforma.
- **Servicio B — Marketplace:** catálogo, carrito, pedidos, pago y reparto.
- **Servicio C — Flotas:** administración de repartidores, disponibilidad, asignaciones e integraciones.
- **Canales:** web para consumidor/comercio/administración/marketing; app nativa Android+iOS para repartidores; app cliente nativa futura condicionada por evidencia.
- **Propuesta técnica, todavía no ratificada:** monorepo, TypeScript, pnpm/Turborepo, Next.js/React, Astro, React Native/Expo, UI propia basada selectivamente en shadcn/ui con Tailwind 4 web, backend modular, Supabase Self-Hosted, PostgreSQL/PostGIS, Redis, trabajadores y Broadcast.
- **Modelo M0 elegido para diseño, no validado:** [envíos B2B solicitados por comercios](docs/product/pilot-operating-model.md) con cobro exclusivo del servicio logístico al comercio, zona piloto compacta en Puerto Vallarta y repartidores en motocicleta. Después marketplace y flotas. No equivale a autorización comercial/legal.

## Secuencia principal
`P0 Investigación y decisiones → P1 Spikes críticos → P2 Fundaciones → P3 Operación de envíos → P4 Piloto controlado → P5 Marketplace → P6 Flotas/escala local → P7 Expansión`.

**Comisión objetivo marketplace: máximo 10% del subtotal de productos, sin reparto ni impuestos; fuente de mercado y matices en [modelo comercial](docs/product/business-model.md). No hay tarifas logísticas finales. No hay fechas ni promesas de capacidad inventadas**. Cada paso se libera por evidencias y criterios de salida, no solo porque termine la programación.

## Regla para agentes y desarrolladores
Leer primero este archivo, [docs/master-plan](docs/master-plan/README.md), [docs/specification](docs/specification/README.md), [docs/decisions](docs/decisions/README.md) y [docs/conventions](docs/conventions/development.md). No convertir hipótesis del plan en funcionalidad sin resolver bloqueadores y aprobar el corte de trabajo. **Autorizado iniciar código incremental**, pruebas y CI con datos sintéticos; no exige completar entrevistas como condición para programar. Seguridad, legalidad, pruebas de GPS y fiscalidad son bloqueantes de **operación comercial**, no del desarrollo experimental.
