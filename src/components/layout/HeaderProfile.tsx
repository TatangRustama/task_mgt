import Link from "next/link";
import { User } from "lucide-react";

export function HeaderProfile({
  name,
  identity,
}: {
  name: string;
  identity: string;
}) {
  return (
    <Link
      href="/profil"
      className="flex min-w-0 items-center gap-2 rounded-lg py-1 pl-1.5 pr-0.5 text-on-secondary transition hover:bg-white/10 active:scale-[0.98]"
    >
      <span className="min-w-0 text-right">
        <span className="block truncate text-[11px] font-semibold leading-4 md:text-xs">
          {name}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-medium leading-3 text-on-secondary/75 md:text-[11px]">
          {identity}
        </span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
        <User className="h-5 w-5" />
      </span>
    </Link>
  );
}
