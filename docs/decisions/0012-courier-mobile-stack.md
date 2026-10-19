# ADR-0012: courier-mobile con Expo SDK 57, React Navigation y pruebas headless
- **Fecha:** 2026-10-19
- **Estado:** Aceptada solo para el corte demo sintético ([issue #15](https://github.com/raulbellosom/volon/issues/15)). [ADR-0003](0003-react-native-expo.md) sigue **condicionada** a las pruebas de GPS y gestos en teléfonos reales; esta decisión no la cierra.
- **Contexto:** el fundador trabaja de forma remota, sin emuladores, teléfonos ni credenciales. La app debe poder construirse, probarse y exportarse solo con código, pruebas y CI.

## Decisión
| Necesidad | Elección | Versión fijada |
| --- | --- | --- |
| Runtime | Expo SDK 57 · React Native 0.86.3 · React 19.2.3 | `expo` 57.0.26 |
| Navegación | `@react-navigation/native` + `native-stack` (sin expo-router) | 7.5.0 / 7.20.0 (`elements` fijado en 2.9.44 vía `overrides`) |
| Safe areas y pantallas nativas | `react-native-safe-area-context`, `react-native-screens` | 5.7.0 / 4.26.2 |
| Tipografía e íconos | Plus Jakarta Sans por peso (`@expo-google-fonts`) e Ionicons (`@expo/vector-icons/Ionicons`) | 0.4.2 / 15.1.1 |
| Pruebas | `jest-expo` + Testing Library React Native + `react-test-renderer` | 57.0.5 / 13.3.3 / 19.2.3 |
| Validación sin dispositivo | `expo export` para Android (bytecode Hermes) y web | CI |

- Tokens y marca se consumen como TypeScript de `@delivery/design-tokens` y `@delivery/branding`. No se usa DOM ni CSS de `ui-web`.
- Los componentes nativos viven en `apps/courier-mobile/src/ui`. Se moverán a `packages/ui-native` cuando exista una segunda app nativa que los necesite.
- La compuerta `EXPO_PUBLIC_COURIER_MODE` falla en cerrado: vacío o `demo` usa el adaptador sintético; cualquier otro valor bloquea la app.

## Alternativas
- **Expo SDK 58:** su primera versión publicada hace más de dos semanas (58.0.3) empaqueta `react-native 0.88.0-rc.3`, una versión preliminar. Se reevaluará al estabilizarse.
- **expo-router:** rutas por archivos y deep links que este corte no necesita. Además exige `@expo/metro-runtime` más reciente que el par aprobado.
- **Testing Library RN 14:** requiere `test-renderer` 1.x; la 13.3.3 coincide con el `react-test-renderer` que ya trae jest-expo.

## Consecuencias
- React 19.2.3 convive con 19.3.0 de las apps web: pnpm aísla las versiones por paquete.
- Expo Go de las tiendas suele soportar solo el SDK más reciente. Para abrir la app en un teléfono puede hacer falta un development build o un Expo Go compatible con SDK 57 (ver el README de la app).
- La vista web sirve solo para revisar la UI y tomar capturas. No sustituye la prueba en Android ni iOS.

## Reversibilidad
Alta: las pantallas dependen del puerto `CourierGateway` y de tokens compartidos. Subir de SDK cambia versiones fijadas, no la arquitectura.
