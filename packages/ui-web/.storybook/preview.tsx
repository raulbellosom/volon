import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';
import { I18nProvider } from 'react-aria-components';
import '../src/styles/volon.css';

const preview: Preview = {
  decorators: [
    // Apps set their own locale; the gallery reviews Spanish (Mexico) formats.
    (Story) => <I18nProvider locale="es-MX"><Story /></I18nProvider>,
    withThemeByDataAttribute({
      themes: { Claro: 'light', Oscuro: 'dark' },
      defaultTheme: 'Claro',
      attributeName: 'data-theme',
    }),
  ],
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    a11y: { test: 'error' },
    controls: { expanded: true },
    options: {
      storySort: {
        order: ['Introducción', 'Fundamentos', 'Marca', 'Acciones', 'Formularios', 'Contenido', 'Datos', 'Navegación', 'Retroalimentación', 'Overlays', 'Patrones', 'Cobertura'],
      },
    },
  },
};

export default preview;
