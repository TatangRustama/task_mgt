import { ReactNode } from "react";
import { HeaderNotifications } from "@/components/layout/HeaderUserActions";
import { HeaderProfile } from "@/components/layout/HeaderProfile";
import { EMPTY_NOTIFICATIONS } from "@/lib/notification-types";
import { cn } from "@/lib/utils";

export function Header({
  action,
  userName,
  identity,
  reserveMenu = false,
}: {
  action?: ReactNode;
  userName: string;
  identity: string;
  reserveMenu?: boolean;
}) {
  return (
    <header className="app-frame-bar top-0 z-50 h-16 bg-secondary-navy shadow-[0_8px_24px_rgba(27,33,86,0.18)]">
      <div
        className={cn(
          "relative mx-auto flex h-full max-w-7xl items-center justify-end gap-2 pr-5 md:px-8",
          reserveMenu ? "pl-14" : "pl-5",
        )}
      >
        {action}
        <div className="flex min-w-0 items-center">
          <HeaderProfile name={userName} identity={identity} />
          <HeaderNotifications initial={EMPTY_NOTIFICATIONS} />
        </div>
      </div>
    </header>
  );
}
