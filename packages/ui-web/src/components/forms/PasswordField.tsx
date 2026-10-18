import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { defined } from '../../utils/defined.ts';
import { IconButton } from '../actions/IconButton.tsx';
import { TextField, type TextFieldProps } from './TextField.tsx';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing' | 'multiline' | 'icon'> & {
  /** Defaults to a lock. */
  icon?: ReactNode;
};

/** Password input with an accessible show/hide toggle that keeps focus order intact. */
export function PasswordField({ autoComplete = 'current-password', icon = <LockKeyhole />, ...props }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <TextField
      {...props}
      icon={icon}
      autoComplete={autoComplete}
      type={isVisible ? 'text' : 'password'}
      trailing={
        <IconButton
          size="sm"
          label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          icon={isVisible ? <EyeOff /> : <Eye />}
          {...defined({ isDisabled: props.isDisabled })}
          onPress={() => setIsVisible((visible) => !visible)}
          className="-me-1.5"
        />
      }
    />
  );
}
