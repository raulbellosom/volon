import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { defined } from '../../utils/defined.ts';
import { IconButton } from '../actions/IconButton.tsx';
import { TextField, type TextFieldProps } from './TextField.tsx';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing' | 'multiline'>;

/** Password input with an accessible show/hide toggle that keeps focus order intact. */
export function PasswordField({ autoComplete = 'current-password', ...props }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <TextField
      {...props}
      autoComplete={autoComplete}
      type={isVisible ? 'text' : 'password'}
      trailing={
        <IconButton
          size="sm"
          label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          icon={isVisible ? <EyeOff /> : <Eye />}
          {...defined({ isDisabled: props.isDisabled })}
          onPress={() => setIsVisible((visible) => !visible)}
        />
      }
    />
  );
}
