# Aplicaciones — desarrollo incremental

`api` contiene el primer handler Fetch modular de cotización, sin listener ni adaptadores reales. Su contrato y restricciones están en [API](../docs/specification/api-contracts.md). Pruebas locales con dependencias sintéticas: `pnpm check` desde la raíz.

Cuando iniciemos implementación, se crearán solo las apps activas por fase: marketing, customer-web, merchant-web, courier-mobile, admin-web, api y worker. customer-mobile queda diferida hasta validar demanda.

No utilizar la carpeta como señal de que una app ya existe, se compila o está desplegada.
