import { Button, Menu, MenuItem, MenuSeparator, MenuTrigger } from '@delivery/ui-web';
import { ChevronDown, CircleUser, LogOut, Store } from 'lucide-react';
import { useSession } from '../session/useSession.ts';
import { useWorkspace } from '../workspace/useWorkspace.ts';

/** Account and branch switcher in the navbar. */
export function AccountMenu() {
  const { session, signOut } = useSession();
  const { currentBranch, branches } = useWorkspace();
  return (
    <MenuTrigger>
      <Button variant="ghost" size="sm" leadingIcon={<CircleUser />} trailingIcon={<ChevronDown />}>
        <span className="max-w-40 truncate">{currentBranch?.branchName ?? 'Mi cuenta'}</span>
        <span className="sr-only">, menú de cuenta</span>
      </Button>
      <Menu placement="bottom end" onAction={(key) => key === 'sign-out' && signOut()}>
        <MenuItem id="account" isDisabled description={session?.email ?? ''} icon={<CircleUser />}>Sesión iniciada</MenuItem>
        <MenuSeparator />
        {branches.length > 1 && <MenuItem id="branch" href="/sucursal" icon={<Store />}>Cambiar sucursal</MenuItem>}
        <MenuItem id="sign-out" icon={<LogOut />}>Cerrar sesión</MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
