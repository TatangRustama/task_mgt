import { ReactNode } from "react";
import { HeaderMenuButton, HeaderNotifications } from "@/components/layout/HeaderUserActions";
import { HeaderProfile } from "@/components/layout/HeaderProfile";
import { EMPTY_NOTIFICATIONS } from "@/lib/notification-types";

export function Header({
  action,
  userName,
  identity,
}: {
  action?: ReactNode;
  userName: string;
  identity: string;
}) {
  return (
    <header className="app-frame-bar top-0 z-50 h-16 bg-secondary-navy shadow-[0_8px_24px_rgba(27,33,86,0.18)]">
      <div className="flex h-full items-center gap-1 pl-2 pr-3 md:pr-8">
        <HeaderMenuButton />
        <HeaderNotifications initial={EMPTY_NOTIFICATIONS} />
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {action}
          <HeaderProfile name={userName} identity={identity} />
        </div>
      </div>
    </header>
  );
}
