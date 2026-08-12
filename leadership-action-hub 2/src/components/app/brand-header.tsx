import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import type { StaffProfile } from "@/lib/types";
import { initials } from "@/lib/utils";

export function BrandHeader({
  user,
  onMenu,
  menuOpen,
}: {
  user: StaffProfile;
  onMenu: () => void;
  menuOpen: boolean;
}) {
  return (
    <header className="sticky top-[var(--grok-banner-h,0px)] z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="relative mx-auto grid max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-3 sm:px-5 sm:py-4">
        {/* Mobile menu */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-hh-navy md:hidden"
          onClick={onMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <div className="hidden w-10 md:block" aria-hidden />

        {/* Centered logos */}
        <div className="flex min-w-0 flex-col items-center justify-center gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <img
              src="/brand/helping-heroes-logo.png"
              alt="Helping Heroes Rehabilitation Service"
              className="h-12 w-auto max-w-[42vw] object-contain sm:h-16 md:h-[4.5rem]"
            />
            <div className="hidden h-12 w-px bg-border sm:block md:h-14" aria-hidden />
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img
                src="/brand/community-assist-logo.jpg"
                alt="Community Assist"
                className="h-12 w-12 rounded-lg object-contain sm:h-14 sm:w-14 md:h-16 md:w-16"
              />
              <div className="hidden leading-tight sm:block">
                <div className="text-base font-bold tracking-tight text-ca-primary sm:text-lg">
                  Community Assist
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  Support made simple
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User / logout */}
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-hh-navy">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.title}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials(user.name)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signOut("/")}

            className="hidden sm:inline-flex"
          >
            <LogOut className="size-4" />
            Log out
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void signOut("/")}

            className="sm:hidden"
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
      <div className="border-t border-border/70 bg-secondary/60 px-3 py-1.5 sm:px-5">
        <p className="mx-auto max-w-[1400px] text-center text-[11px] font-medium tracking-wide text-muted-foreground sm:text-xs">
          Shared team workspace · Helping Heroes Rehabilitation Service & Community Assist
        </p>
      </div>
    </header>
  );
}
