# PSP para logística M0 — propuesta #22

Consulta: **2026-10-19**. Base revisada: origin/main `f6de821`, [M0](../product/pilot-operating-model.md) y [finanzas #20](../specification/service-payments.md).
Estado: **propuesta para aprobación del fundador**, no selección definitiva ni integración. RF-022 / DEC-03 / [Issue #22](https://github.com/raulbellosom/volon/issues/22).
El comercio paga únicamente logística propia de Volon; sin productos, split, wallet ni despacho habilitado. `eligible=false` / `PSP_NOT_CONFIGURED` permanece.

## Recomendación

**1. Stripe Checkout para el primer sandbox**, por claridad del flujo alojado, firma, consulta e idempotencia; juicio de ingeniería documental, no benchmark de aceptación.
**2. Conekta como alternativa**, con tarifa base algo menor y firma RSA/idempotencia documentadas. Validar primero condiciones de 3DS y contrato comercial.
**Openpay es el menor costo del escenario publicado**, pero tarifa sujeta a aprobación y firma criptográfica por mensaje no confirmada; no confundir HTTP Basic con firma del cuerpo.
Mercado Pago queda cuarto para este ensayo: fijo mayor en el escenario conservador y diferencias entre páginas/variantes de Checkout que requieren cotización explícita.

## Tarifas y método del cálculo

Tarjetas nacionales, MXN, una exhibición, sin promociones ni negociación. Cada tarifa es referencia pública, no oferta contractual para Volon.

| PSP | Variable + fijo, antes de IVA | Condición/fuente oficial |
| --- | --- | --- |
| Openpay | 2.90% + $2.50 | [Pasarela](https://www.openpay.mx/soluciones/pasarela-de-pagos?from=conekta.link): sujeto a análisis y aprobación; podría variar |
| Conekta | 3.40% + $3.00 | [Precio base](https://www.conekta.com/pricing), desde; 3DS opcional publicado $1.50 + IVA adicional |
| Stripe | 3.60% + $3.00 | [Tarifa nacional estándar](https://stripe.com/mx/pricing); [IVA sobre comisiones](https://support.stripe.com/questions/taxes-on-stripe-fees-for-mexico-based-businesses) |
| Mercado Pago | 3.49% + $4.00 | [Calculadora para e-commerce](https://vendedores.mercadopago.com.mx/plataforma-de-pagos-c), disponibilidad inmediata; ver incertidumbre abajo |

Modelo: `B = ticket × tasa + fijo`; `IVA_comisión = B × 0.16`; `C = redondear(B × 1.16, 2)`; `neto = ticket − C`.
Redondeo decimal HALF_UP al final por cargo; total para N cargos iguales = `N × C`, neto total = `N × neto`. El PSP puede redondear componentes por separado: conciliar centavos con su factura.
El IVA sobre la comisión **no es el IVA del servicio logístico**. Neto aquí = remanente tras PSP, no utilidad, dinero liquidado ni base fiscal; no descontamos/recuperamos IVA ni suponemos retenciones.
Se excluyen incidentes, MSI, tarjetas extranjeras/FX, antifraude adicional, reservas, retiros y contratos especiales; no se inventan descuentos por 100/500/1,000 operaciones.
Ejemplo Stripe $44: B=$4.584; IVA=$0.73344; C=$5.32. Todos los importes siguientes son MXN; tickets ilustrativos, no precios aprobados de Volon.

| PSP | Ticket | C con IVA/cargo | Neto/cargo | C efectiva | C /100 cargos | C /500 | C /1,000 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Openpay | 30 | 3.91 | 26.09 | 13.03% | 391.00 | 1955.00 | 3910.00 |
| Openpay | 44 | 4.38 | 39.62 | 9.95% | 438.00 | 2190.00 | 4380.00 |
| Openpay | 60 | 4.92 | 55.08 | 8.20% | 492.00 | 2460.00 | 4920.00 |
| Openpay | 100 | 6.26 | 93.74 | 6.26% | 626.00 | 3130.00 | 6260.00 |
| Conekta | 30 | 4.66 | 25.34 | 15.53% | 466.00 | 2330.00 | 4660.00 |
| Conekta | 44 | 5.22 | 38.78 | 11.86% | 522.00 | 2610.00 | 5220.00 |
| Conekta | 60 | 5.85 | 54.15 | 9.75% | 585.00 | 2925.00 | 5850.00 |
| Conekta | 100 | 7.42 | 92.58 | 7.42% | 742.00 | 3710.00 | 7420.00 |
| Stripe | 30 | 4.73 | 25.27 | 15.77% | 473.00 | 2365.00 | 4730.00 |
| Stripe | 44 | 5.32 | 38.68 | 12.09% | 532.00 | 2660.00 | 5320.00 |
| Stripe | 60 | 5.99 | 54.01 | 9.98% | 599.00 | 2995.00 | 5990.00 |
| Stripe | 100 | 7.66 | 92.34 | 7.66% | 766.00 | 3830.00 | 7660.00 |
| Mercado Pago | 30 | 5.85 | 24.15 | 19.50% | 585.00 | 2925.00 | 5850.00 |
| Mercado Pago | 44 | 6.42 | 37.58 | 14.59% | 642.00 | 3210.00 | 6420.00 |
| Mercado Pago | 60 | 7.07 | 52.93 | 11.78% | 707.00 | 3535.00 | 7070.00 |
| Mercado Pago | 100 | 8.69 | 91.31 | 8.69% | 869.00 | 4345.00 | 8690.00 |

**Incertidumbre MP:** aplicar IVA 16% es el escenario de comparación; la [página Checkout](https://www.mercadopago.com.mx/herramientas-para-vender/check-out?code=MNU9F&device=55) muestra porcentajes +IVA con presentación distinta del fijo.
Su [blog 2026](https://www.mercadopago.com.mx/blog/hot-sale-integra-mercado-pago) atribuye 3.49%+$4 al **Link**, y 7 días; la calculadora Checkout muestra 14 días como alternativa. No trasladar Link→Checkout ni prometer plazos/tarifa contratada.
Confirmar por escrito Checkout Pro exacto, fijo e IVA antes de elegir. Si no hubiera fijo, el mismo modelo sería $1.78 por $44; **no asumimos que esa oferta esté disponible**.

## Matriz técnica — capacidades documentadas, no probadas contra proveedor

| PSP | Checkout alojado y pruebas | Origen de webhook | Idempotencia y consulta/reconciliación |
| --- | --- | --- | --- |
| Stripe | [Checkout alojado y tarjetas de prueba](https://docs.stripe.com/checkout/quickstart) | [Stripe-Signature, cuerpo crudo](https://docs.stripe.com/webhooks/signature) | [Idempotency-Key](https://docs.stripe.com/api/idempotent_requests); consultar PaymentIntent y movimientos/saldo para conciliar |
| Conekta | [Link único alojado](https://developers.conekta.com/reference/createcheckout); modo de pruebas | [RSA/SHA-256, digest y llave pública](https://developers.conekta.com/docs/autenticaci%C3%B3n-webhooks) | [Idempotency-Key en orders](https://developers.conekta.com/reference/createorder); consultar orden/cargos y movimientos del panel |
| Openpay | Formulario redirect y sandbox en [API](https://documents.openpay.mx/docs/api/index.html) | API documenta usuario/contraseña Basic; firma por mensaje **NC** | order_id único, error 1006/409; no equivale a replay HTTP completo. Consultar charges por ID/order_id antes de repetir |
| Mercado Pago | Checkout Pro alojado y [compras de prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases) | [x-signature HMAC y consulta GET payment](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/additional-content/notifications/webhooks) | [X-Idempotency-Key en Orders](https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-pro/create-order/post); no extrapolarlo a preferences; consultar payment y reportes de conciliación |

NC = no confirmado en fuentes consultadas; no significa inexistente. Todos requieren deduplicación propia de eventos y reconciliación de timeouts; jamás reintentar un cobro incierto a ciegas.
Para una futura evidencia candidata: Stripe PaymentIntent `succeeded` con captura completa; Conekta [`order.paid`](https://developers.conekta.com/docs/order) con cargos pagados; Openpay charge `completed`; MP payment aprobado **y capturado** según variante.
Siempre verificar vía API autenticada cuenta/ambiente, binding servidor, importe total y moneda, ausencia de reverso/disputa y política de vigencia; confirmar semántica exacta en sandbox. Ni autorización ni redirect exitoso bastan.
Adaptación #20: el puerto futuro separa submit/verify/reconcile, pero los registros pending/not_submitted actuales son inmutables. No convertir fixtures en evidencia ni conectar positivos a dispatch-lab; requiere siguiente contrato aprobado.

## Condiciones económicas, comerciales y dudas

| PSP | Mínimo tarjeta y disponibilidad del dinero | Reembolsos / disputas / reservas |
| --- | --- | --- |
| Stripe | [Mínimo $10 MXN](https://docs.stripe.com/currencies); [México: disponibilidad inicial 7 días calendario, estándar 3 hábiles](https://docs.stripe.com/payouts), sujeto a cuenta/banco | [Reembolsar sin cargo adicional estándar; comisión original no vuelve](https://support.stripe.com/questions/refunds-in-mexico). Tarifa publicada disputa recibida $150 antes de IVA ($174 modelado), más principal; otros servicios opcionales aparte |
| Conekta | [Mínimo $15, máximo $100,000](https://help.conekta.com/hc/es-419/articles/360018090114--Cu%C3%A1l-es-el-monto-m%C3%ADnimo-y-m%C3%A1ximo-para-cobrar); primer depósito suele tardar hasta 10 días hábiles según pricing; recurrente NC | [Refund total/parcial](https://developers.conekta.com/docs/reembolsar-orden); devolución de comisión, costo por disputa y reservas NC. 3DS publicado añade $1.74 con IVA por uso: $44 pasaría de $5.22 a $6.96 si aplica a cada cargo |
| Openpay | Mínimo y liquidación bancaria exacta NC; producción y tarifa requieren aprobación | Refund API total/parcial; costo de refund/disputa, devolución de tarifa y reservas NC; solicitar cotización del producto exacto |
| Mercado Pago | Mínimo tarjeta NC; disponibilidad inmediata en **cuenta MP** modelada, no promesa de depósito bancario inmediato | [Refund total/parcial hasta 180 días, requiere saldo](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/additional-settings/refunds-and-cancellations); devolución de comisiones/costo por disputa y reservas NC; no asumir protección de bienes físicos para logística |

Otros métodos: Openpay publica SPEI $8+IVA ($9.28), efectivo 2.9%+$2.50+IVA; Conekta SPEI $12.50+IVA ($14.50), efectivo 2.6%+$3 con mínimo $5.40+IVA, más posible cobro en caja (fuentes pricing anteriores).
Stripe publica categoría bancaria/otros 4%+$3; confirmar tarifa y disponibilidad de SPEI/OXXO específicos. MP cotiza por método/plazo; no asumir tarifa de tarjeta para efectivo/SPEI. Asíncronos requieren esperar pago verificado antes de despacho.
En los cuatro: confirmar aceptación expresa de logística B2B propia, titular jurídico/RFC/CLABE/KYC aplicables, categoría comercial y mercancías excluidas de M0, plazo de liquidación/retenciones, reservas y cláusulas de suspensión.
Pendientes de cotización: mensualidad/mínimos comprometidos si existen, antifraude/3DS, MSI, internacionales/FX, disputas, reembolsos y retiros. Un dato NC no se presupuestó como costo cero ni una cuenta sandbox acredita aprobación comercial.

## Individual vs paquetes — solo análisis, M0 no cambia

| PSP | Comisión de 10 cargos de $44 | Comisión de un prepago hipotético de $440 | Ahorro por 10 servicios |
| --- | ---: | ---: | ---: |
| Openpay | 43.80 | 17.70 | 26.10 |
| Conekta | 52.20 | 20.83 | 31.37 |
| Stripe | 53.20 | 21.85 | 31.35 |
| Mercado Pago | 64.20 | 22.45 | 41.75 |

Sin descuento al comercio: el ahorro viene de pagar menos fijos. Con Stripe, 1,000 servicios de $44 serían 100 prepagos: $2,185 de comisión vs $5,320 individual; ahorro estimado $3,135. No confundir servicios con número de cargos PSP.
**Recomendar individual para el primer sandbox/M0.** Prepago queda como hipótesis de cambio comercial: exige aprobación de M0/PSP, tratamiento fiscal de anticipos, cancelación, vencimiento/saldos no usados, conciliación y revisión jurídica; llamarlo paquete no resuelve custodia de fondos.
Un paquete solo podría respaldar entregas mediante pago externo verificado, asignaciones monetarias por Delivery atómicas y únicas, saldo derivado de ledger, reversos/disputas y reconciliación. No una cifra editable ni saldo demo; esta tarea no diseña ni habilita wallet.
Facturación semanal/postpago añade riesgo crediticio y **no cumple** el pago verificado previo al despacho actual. No proponerla como atajo al gate.

## Decisión solicitada al fundador

Proponer **Stripe como primer candidato sandbox y Conekta como reserva**, con cobro individual. Por 1,000 cargos de $44, Stripe cuesta ~$100 más que Conekta y ~$940 más que Openpay en este modelo; valorar ese diferencial contra horas de integración, no ocultarlo.
Desventajas Stripe: mayor costo que ambos, fuerte costo relativo del fijo, disputa superior al ticket y comisión no recuperable en refund. Conekta: ahorro base pequeño, 3DS adicional puede revertirlo, primer depósito más lento y condiciones de incidentes aún NC.
Reabrir Openpay si confirma condiciones comerciales y una estrategia de origen/consulta autenticada compatible con #20; su ventaja económica merece validación antes de producción. MP puede reconsiderarse con tarifa Checkout contractual aclarada.
**Aprobar esta propuesta no autoriza integración ni operación:** siguiente issue acotará un adaptador sandbox aislado y pruebas de firma, consulta, captura, duplicados, timeout, refunds/disputas, siempre sin gate operativo positivo.
Verificación de esta entrega: cálculos decimales, netos/totales y límite de 150 líneas; solo este Markdown. No se ejecutaron pruebas PSP ni se abrieron cuentas; código, Prisma y elegibilidad permanecen intactos. Todas las fuentes enlazadas son oficiales; lo no público queda NC.
