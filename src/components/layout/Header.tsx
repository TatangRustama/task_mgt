import { ReactNode } from "react";
import { BackButton } from "@/components/layout/BackButton";
import { HeaderNotifications } from "@/components/layout/HeaderUserActions";
import { HeaderProfile } from "@/components/layout/HeaderProfile";
import type { UserNotifications } from "@/lib/notification-types";

export function Header({
  action,
  userName,
  identity,
  notifications,
}: {
  action?: ReactNode;
  userName: string;
  identity: string;
  notifications: UserNotifications;
}) {
  return (
    <header className="fixed top-0 left-0 z-50 h-16 w-full bg-secondary-navy shadow-[0_8px_24px_rgba(27,33,86,0.18)]">
      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
        <div className="flex shrink-0 items-center">
          <BackButton />
          <HeaderNotifications initial={notifications} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {action}
          <HeaderProfile name={userName} identity={identity} />
        </div>
      </div>
    </header>
  );
}
