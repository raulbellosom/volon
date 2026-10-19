# ADR-0015 — Folio humano separado del identificador de Delivery

Fecha: 2026-10-19. Aceptado para el incremento local/sintético #19 solicitado.

Delivery y sus snapshots rechazan UPDATE/DELETE. Se elige tabla inmutable 1:1
en vez de debilitar ese trigger o reemplazar PK/FK por un código comercial.
Mapping único global, CSPRNG y reintentos acotados; backfill y trigger diferido
garantizan cobertura histórica y creación atómica sin editar hechos previos.

Prefijo configurable para futuras emisiones, histórico estable; año de emisión
UTC y formato ampliable. El identificador público no autentica ni autoriza.
RLS sigue la Delivery y la búsqueda requiere Auth. Contrato cerrado actualizado
en coordinación con merchant-web; clientes antiguos deben actualizar parser.

No se modifica estado, finanzas, snapshots, despacho ni privacidad de destinos.
Retirar la presentación conserva mappings. No hay down migration destructiva.
Contrato propietario: [folios](../specification/delivery-public-reference.md).
