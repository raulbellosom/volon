import { Button, Menu, MenuItem, MenuSeparator, MenuTrigger } from '@delivery/ui-web';
import { ChevronDown, CircleUser, LogOut, Store } from 'lucide-react';
import { useSession } from '../session/useSession.ts';
import { useWorkspace } from '../workspace/useWorkspace.ts';

/** Hidden visually in the compact bar, shown (truncated) from `lg` and inside the mobile drawer. */
const BRANCH_LABEL = [
  'sr-only',
  'lg:not-sr-only lg:inline-block lg:max-w-48 lg:truncate lg:align-bottom',
  'in-[[role=dialog]]:not-sr-only in-[[role=dialog]]:inline-block in-[[role=dialog]]:max-w-48 in-[[role=dialog]]:truncate in-[[role=dialog]]:align-bottom',
].join(' ');

/**
 * Account and branch menu in the navbar. Below `lg` the trigger is compact (icon + chevron) so the
 * bar fits from 320px; the branch name stays in the accessible name, in the menu and in the page
 * header. From `lg`, and inside the mobile drawer, it is also shown, truncated if long.
 */
export function AccountMenu() {
  const { session, signOut } = useSession();
  const { currentBranch, branches } = useWorkspace();
  const branchName = currentBranch?.branchName ?? 'Mi cuenta';
  return (
    <MenuTrigger>
      <Button variant="ghost" size="sm" leadingIcon={<CircleUser />} trailingIcon={<ChevronDown />}>
        <span className={BRANCH_LABEL} title={branchName}>{branchName}</span>
        <span className="sr-only">, menú de cuenta</span>
      </Button>
      <Menu placement="bottom end" onAction={(key) => key === 'sign-out' && signOut()}>
        <MenuItem id="account" isDisabled description={session?.email ?? ''} icon={<CircleUser />}>Sesión iniciada</MenuItem>
        {currentBranch && <MenuItem id="current-branch" isDisabled description={currentBranch.branchName} icon={<Store />}>Sucursal activa</MenuItem>}
        <MenuSeparator />
        {branches.length > 1 && <MenuItem id="branch" href="/sucursal" icon={<Store />}>Cambiar sucursal</MenuItem>}
        <MenuItem id="sign-out" icon={<LogOut />}>Cerrar sesión</MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
