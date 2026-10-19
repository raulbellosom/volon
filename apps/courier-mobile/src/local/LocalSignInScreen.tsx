import { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from '../ui/AppText.tsx';
import { BrandLogo } from '../ui/BrandLogo.tsx';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { Notice } from '../ui/Notice.tsx';
import { Screen } from '../ui/Screen.tsx';
import { TextField } from '../ui/TextField.tsx';
import { accountCopy } from './account-copy.ts';
import { useLocalSession } from './LocalSessionProvider.tsx';

/** Sign-in against the local Supabase Auth with a synthetic courier account typed by the operator. */
export function LocalSignInScreen() {
  const { theme } = useTheme();
  const { signIn, submit, signOutReason } = useLocalSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const ready = email.trim().length > 3 && password.length > 0;
  const send = () => {
    if (ready) void submit(email, password);
  };

  return (
    <Screen footer={<Button label="Iniciar sesión" icon="log-in-outline" size="action" pending={signIn.pending} disabled={!ready} onPress={send} />}>
      <Card>
        <BrandLogo height={40} />
        <View style={{ gap: theme.spacing[2] }}>
          <AppText variant="display" heading>Acceso de repartidor</AppText>
          <AppText color="text-secondary">Entra con una cuenta sintética del laboratorio local para probar tu disponibilidad real.</AppText>
        </View>
      </Card>

      {signOutReason === 'expired' && <Notice tone="warning" title="Tu sesión terminó">Por seguridad, vuelve a iniciar sesión.</Notice>}
      {signOutReason === 'not-enabled' && <Notice tone="danger" title={accountCopy('not-enabled').title}>{accountCopy('not-enabled').description}</Notice>}
      {signIn.error && <Notice tone="danger" title={accountCopy(signIn.error).title} live>{accountCopy(signIn.error).description}</Notice>}

      <TextField label="Correo" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="username" returnKeyType="next" />
      <TextField label="Contraseña" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" returnKeyType="go" onSubmitEditing={send} />

      <Notice tone="info" title="Solo cuentas de prueba">
        La sesión vive en memoria y se borra al cerrar la app. La contraseña del laboratorio está en tu archivo local de configuración; nunca la escribas en el código.
      </Notice>
    </Screen>
  );
}
