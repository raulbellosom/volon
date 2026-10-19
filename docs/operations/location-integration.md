# Integración de ubicaciones para merchant-web

Entrega a Claude del corte backend #11. Contratos normativos, errores y límites:
[API](../specification/api-contracts.md#direcciones-y-ubicaciones-sintéticas-issue-11).
No requiere migración o cambios de credenciales; reconstruir el backend con
`pnpm local:up` antes de probar. Stack exclusivo sintético; nunca introducir
domicilios de personas o comercios reales en este incremento.

## Lista de integración

1. Reutilizar sesión Supabase y bearer actuales. Obtener Branch autorizado desde
   contexto existente; no inventar sucursales ni aceptar un ID como autorización.
2. Leer `GET /v1/branches/{branchId}/pickup-location`. Validar con
   `parsePickupLocationResponse` de `@delivery/contracts`. Usar coordinates para
   pickup de la cotización. La respuesta no tiene dirección textual de la sucursal.
3. Mantener dropoff como `{lat,lng}`. Puede adjuntarse destination sintético con
   addressLine e instructions opcionales según contrato; hacer trim, presentar
   límites por puntos de código (`[...text].length`) y mostrar que no está verificado.
   No enviar pickupOrigin, source geocoded, verification verified, persona o teléfono.
4. Validar entrada con `parseDeliveryQuoteRequest` y respuesta de cotización con
   `parseDeliveryQuoteResponse`. Conservar el DTO actual de precio y expiración.
5. Asociar quoteId con la selección utilizada. Si cambian destino, texto,
   indicaciones o sucursal antes de confirmar, descartar la quote en interfaz y
   cotizar otra vez. No enviar el formulario actual como dirección de Delivery.
6. Confirmar con el POST Delivery existente: solo branchId/quoteId y la misma
   Idempotency-Key en reintentos del mismo comando. Nueva cotización/comando usa
   nueva key. No recalcular importes ni modificar una entrega mediante replay.
7. Para revisar la dirección efectivamente cotizada/confirmada, usar GET
   `/v1/delivery-quotes/{quoteId}/locations` o `/v1/deliveries/{deliveryId}/locations`
   y `parseDeliveryLocationsResponse`. El snapshot puede diferir del formulario
   actual; es la fuente para la confirmación. legacy_input y null significan que
   el registro anterior no conserva texto/procedencia autoritativa.
8. Los DTOs de historial y detalle resumido permanecen iguales. Cargar ubicaciones
   solo al pedir detalle explícito, sin copiarlas a listas, analytics o logs.
9. Manejar 401 con flujo de sesión existente; 404 como no disponible sin revelar
   si era ajeno/revocado/deshabilitado; 422 corrige entrada/recotiza; 409 mantiene
   reglas de quote/idempotencia; 503 permite reintento sin mostrar diagnósticos.
   Respetar no-store; no persistir ubicaciones en localStorage o caché compartida.
10. No integrar SDK/mapa/autocomplete comercial todavía. La API ejecutable sigue
    limitada a Branch en (0,0), radio sintético de 8 km y pickup dentro de 1 m.
    No trasladar un pin real de Puerto Vallarta a este entorno como entrega válida.
    Seleccionar proveedor y aprobar privacidad/cobertura es trabajo posterior.

## Ejemplo exclusivamente sintético

`POST /v1/delivery-quotes` con bearer actual y Content-Type application/json:

```json
{
  "branchId": "branch_synthetic_a",
  "pickup": { "lat": 0, "lng": 0 },
  "dropoff": { "lat": 0.02, "lng": 0.02 },
  "serviceType": "local_delivery",
  "destination": {
    "addressLine": "Calle Sintética 123, Colonia Prueba",
    "instructions": "Puerta de prueba",
    "source": "synthetic",
    "verification": "unverified"
  }
}
```

La respuesta 201 de cotización conserva quoteId/precio/expiración anteriores.
Tras crear Delivery, su GET locations devuelve 200:

```json
{
  "branchId": "branch_synthetic_a",
  "pickup": {
    "coordinates": { "lat": 0, "lng": 0 },
    "source": "branch_record",
    "verification": "unverified"
  },
  "dropoff": {
    "coordinates": { "lat": 0.02, "lng": 0.02 },
    "addressLine": "Calle Sintética 123, Colonia Prueba",
    "instructions": "Puerta de prueba",
    "source": "synthetic",
    "verification": "unverified"
  }
}
```

## Pendientes de mapas

La [evaluación oficial de proveedores](../validation/address-provider-evaluation.md)
recomienda evaluar Geoapify y contrastarlo con Google en Puerto Vallarta; no
autoriza implementación externa. Backend necesitará contrato de selección
validada por servidor, integración de geocoding/routing, procedencia y política
de retención implementada. Claude necesitará después proveedor aprobado, SDK,
atribuciones, clave pública restringida, presupuesto, estados de resultados
ambiguos y errores. Nunca deberá recibir la clave privada de backend.
