# ADR-0017 — Stripe Checkout aislado, offline primero

Fecha: 2026-10-19. Aceptado únicamente para código/pruebas offline del #23 por
instrucción del fundador. Stripe es candidato aprobado para sandbox, no producción.

La persistencia efímera descrita aquí fue sustituida por
[ADR-0018](0018-stripe-sandbox-persistence.md) en #24. Se conservan las fronteras
offline y el contrato financiero negativo.

El contrato genérico VerifiedProviderEvidence no debe recibir firmas de fixtures.
Se introduce SandboxCheckoutPort con resultados offline-test/eligible:false y un
adaptador Stripe desacoplado. Transporte por defecto deniega, sin fetch/SDK de red;
HMAC Node equivalente documentado y API fija 2026-09-30.endive (stripe-node 23.0.0).
Sin dependencia externa nueva. [Contrato propietario](../specification/stripe-checkout-test.md).

Importes/binding/clave proceden de fixtures de servidor autorizados; ni metadata ni
cliente pueden sustituirlos. El único almacén concreto vive en tests; no se lee ni
muta ServicePayment*. Se prueba estado remoto simulado, no captura real. El gate
de #20 y puerto denegador de despacho permanecen intactos.

Se descartan SDK con red implícita, fetch global, webhook público, persistencia
falsa sobre intentos not_submitted y rama positiva por env. Un siguiente corte
necesita aprobación independiente de llamadas Test, secretos seguros, persistencia
durable y transporte limitado. Los mutex de fixture no son arquitectura SQL para
retener locks mientras se contacta a Stripe. Sin migraciones ni datos que revertir.
