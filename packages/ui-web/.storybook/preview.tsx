import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';
import '../src/styles/volon.css';

const preview: Preview = {
  decorators: [
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
        order: ['Introducción', 'Fundamentos', 'Acciones', 'Formularios', 'Contenido', 'Retroalimentación', 'Overlays', 'Patrones', 'Cobertura'],
      },
    },
  },
};

export default preview;
