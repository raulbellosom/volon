# UI web, UI nativa y decisión móvil

**Estado:** web implementada en `packages/ui-web` según [ADR-0008](../decisions/0008-ui-web-stack.md) (React Aria Components + Tailwind 4 + Storybook); móvil sigue como dirección preferida sin librerías instaladas.

## Web
- React y Next.js para portales; Astro para marketing como candidato.
- Tailwind CSS 4; biblioteca **propia**, con incorporación selectiva del código fuente de componentes shadcn/ui.
- Tokens semánticos controlados por nosotros: superficies, tipografía, espaciado, densidad, radios, estados, contraste, dark mode y variantes por rol.
- Accesibilidad por defecto: teclado, focus visible, lectura de pantalla, zonas táctiles y estados de carga/error.
- Componentes de comercio y logística encima de primitives, no dentro del paquete base.

## Android/iOS
- React Native + Expo es la opción preferida **sujeta a pruebas de GPS background y gestos**.
- Crear ui-native propia con componentes nativos y contratos/tokens compartidos; NO reutilizar JSX web en móviles si sacrifica navegación, gestos o rendimiento.
- React Native Gesture Handler y Reanimated como candidatos para gestos/animaciones, con compatibilidad y accesibilidad probadas.
- NativeWind/Tailwind para mobile es una posibilidad; no imponer Tailwind CSS 4 nativo sin verificar estabilidad y compatibilidad del release elegido.
- Evitar WebView/Ionic para la app crítica de repartidores si no supera requerimientos de ubicación en segundo plano.
- React Native admite módulos Kotlin/Swift cuando haga falta; testear ciclo de vida, cierres, permisos y rutas.

## Política de componentes
1. Compartir tokens y reglas de negocio, no forzar un mismo componente renderizador.
2. Un componente reusable debe documentar API, estados, dimensiones, gestos y accesibilidad.
3. Probar en dispositivos Android de gama de entrada e iPhone real; no validar únicamente en simuladores.
4. Animaciones respetan preferencia de movimiento reducido.
5. Las vistas de mapa/ruta usan adaptadores por plataforma.
6. Revisión visual, interacción táctil, teclado, TalkBack y VoiceOver antes de declarar un componente estable.

## Ejemplo de separaciones
Button, Dialog y DataTable web ≠ Button, BottomSheet y listas virtualizadas nativas. OrderStatus y PricingQuote pueden compartir modelo y validaciones sin compartir implementación visual.

## Por decidir
Biblioteca native de estilo, navegación exacta, compatibilidad con Expo Development Builds, librería de mapas, dispositivos mínimos y criterios de calidad visual.
