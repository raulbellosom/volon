# Aplicaciones — desarrollo incremental

`api` contiene el primer handler Fetch modular de cotización, sin listener ni adaptadores reales. Su contrato y restricciones están en [API](../docs/specification/api-contracts.md). Pruebas locales con dependencias sintéticas: `pnpm check` desde la raíz.

`merchant-web` es el panel web de comercios (primer incremento, issue #10): acceso, sucursal, solicitud con cotización y estado del envío. Ver su [README](merchant-web/README.md) para iniciarla y para saber qué depende de APIs pendientes.

Cuando iniciemos implementación, se crearán solo las apps activas por fase: marketing, customer-web, merchant-web, courier-mobile, admin-web, api y worker. customer-mobile queda diferida hasta validar demanda.

No utilizar la carpeta como señal de que una app ya existe, se compila o está desplegada.
