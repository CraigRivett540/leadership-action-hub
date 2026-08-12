import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { prepareLogin } from "@/lib/dashboard-server";

export const Route = createFileRoute("/")({
  component: HomeLoginPage,
});

async function signInOrCreate(email: string, password: string) {
  // Ensure CEO password + staff roster are ready before auth attempt
  try {
    await prepareLogin();
  } catch {
    /* still try sign-in */
  }

  const signedIn = await authClient.signIn.email({ email, password });
  if (!signedIn.error) return;

  // First visit for staff: create account with the password they chose
  const nameFromEmail = email.split("@")[0]?.replace(/[._]/g, " ") ?? "Team member";
  const displayName = nameFromEmail
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const signedUp = await authClient.signUp.email({
    email,
    password,
    name: displayName,
  });
  if (signedUp.error) {
    const code = (signedUp.error as { code?: string }).code ?? "";
    const msg = (signedUp.error.message ?? "").toLowerCase();
    if (code.includes("USER_ALREADY_EXISTS") || msg.includes("already exists")) {
      throw new Error(
        "That email already has an account. Use the password you set on your first visit.",
      );
    }
    throw new Error(
      signedIn.error.message ??
        signedUp.error.message ??
        "Could not sign in. Check your email and password.",
    );
  }
  const again = await authClient.signIn.email({ email, password });
  if (again.error) {
    throw new Error(again.error.message ?? "Account created but sign-in failed. Try again.");
  }
}

function HomeLoginPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // Warm DB + reset CEO password as soon as the login screen loads
  useEffect(() => {
    let cancelled = false;
    void prepareLogin()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      toast.error("Enter your work email and password");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      try {
        await authClient.signOut();
      } catch {
        /* no prior session */
      }
      await signInOrCreate(cleanEmail, password);
      toast.success("Signed in");
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <img
                src="/brand/helping-heroes-logo.png"
                alt="Helping Heroes"
                className="h-11 w-auto object-contain"
              />
              <img
                src="/brand/community-assist-logo.jpg"
                alt="Community Assist"
                className="h-11 w-11 rounded-md object-contain"
              />
            </div>
            <CardTitle className="text-xl text-hh-navy">Already signed in</CardTitle>
            <p className="text-sm text-muted-foreground">
              You are signed in as{" "}
              <span className="font-semibold text-hh-navy">
                {user.displayName ?? user.primaryEmail}
              </span>
              . Continue to the hub, or switch to another account.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button className="h-11 w-full" onClick={() => void navigate({ to: "/dashboard" })}>
              Continue to dashboard
            </Button>
            <Button
              className="h-11 w-full"
              variant="outline"
              onClick={() => void signOut("/")}
            >
              Switch account / sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-5 pb-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <img
              src="/brand/helping-heroes-logo.png"
              alt="Helping Heroes"
              className="h-11 w-auto object-contain sm:h-12"
            />
            <div className="flex items-center gap-2.5">
              <img
                src="/brand/community-assist-logo.jpg"
                alt="Community Assist"
                className="h-11 w-11 rounded-md object-contain sm:h-12 sm:w-12"
              />
              <div className="text-left leading-tight">
                <div className="text-sm font-bold text-ca-primary">Community Assist</div>
                <div className="text-[11px] text-muted-foreground">Support made simple</div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl tracking-tight text-hh-navy">
              Leadership Action Hub
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in with your work email. On first visit, choose a password to create your
              account.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="you@helpingheroes.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Returning users: enter your password. First time: set a new password here — it
                becomes your login password.
              </p>
            </div>
            <Button className="h-11 w-full" type="submit" disabled={busy || !ready}>
              {busy ? "Signing in…" : ready ? "Continue" : "Preparing…"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
