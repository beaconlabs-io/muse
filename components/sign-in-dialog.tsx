"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

type Provider = "google" | "github";

// Public value. The widget is registered for musecanvas.app (subdomains
// included); local development sets Cloudflare's test sitekey instead, since
// localhost is deliberately not on the production widget.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFeijQhTo0o7arBw";

// Must match `expectedAction` in muse-backend's captcha plugin.
const TURNSTILE_ACTION = "sign-in";

interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let turnstileScript: Promise<Turnstile> | undefined;

/** Loads the Turnstile script once per page; a failed load can be retried. */
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileScript ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"));
    script.onerror = () => {
      script.remove();
      turnstileScript = undefined;
      reject(new Error("turnstile"));
    };
    document.head.append(script);
  });
  return turnstileScript;
}

/**
 * Renders a Turnstile widget and reports its token (null while there is none).
 * Tokens are single-use: remount it with a new `key` to get a fresh one.
 */
function TurnstileWidget({
  onToken,
  onLoadError,
}: {
  onToken: (token: string | null) => void;
  onLoadError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadTurnstile().then(
      (turnstile) => {
        if (cancelled || !container.current) return;
        widgetId = turnstile.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: TURNSTILE_ACTION,
          callback: onToken,
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      },
      () => {
        if (!cancelled) onLoadError();
      },
    );
    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
    // Rendered once per mount; the callbacks only call parent state setters.
  }, []);

  return <div ref={container} className="flex min-h-[65px] justify-center" />;
}

/**
 * Google / GitHub sign-in in a dialog. `children`, when given, is rendered as
 * the trigger. Pass `open` / `onOpenChange` to open it from code instead (the
 * recipe provider does, when a signed-out user starts a generation).
 */
export function SignInDialog({
  children,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Bumped after a failed attempt: the token was spent, so remount the widget.
  const [widgetKey, setWidgetKey] = useState(0);

  const signIn = async (provider: Provider) => {
    if (!captchaToken) return;
    const failed = (code: string) => {
      toast.error(t("signInFailed", { code }));
      setCaptchaToken(null);
      setWidgetKey((key) => key + 1);
    };
    // Better Auth redirects from the backend host, so the URLs must be
    // absolute. Both point back at this page: success lands here signed in,
    // an OAuth failure lands here with ?error=, which AuthErrorToast shows.
    const here = window.location.href;
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: here,
        errorCallbackURL: here,
        fetchOptions: { headers: { "x-captcha-response": captchaToken } },
      });
      // A rejected origin resolves with `error`; a backend that is down rejects.
      if (error) failed(error.code ?? error.message ?? String(error.status));
    } catch (cause) {
      failed(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="sm:text-center">
          <DialogTitle>{t("signInTitle")}</DialogTitle>
          <DialogDescription>{t("signInDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button variant="outline" disabled={!captchaToken} onClick={() => void signIn("google")}>
            <GoogleIcon />
            {t("signInWithGoogle")}
          </Button>
          <Button variant="outline" disabled={!captchaToken} onClick={() => void signIn("github")}>
            <GitHubIcon />
            {t("signInWithGithub")}
          </Button>
        </div>
        <TurnstileWidget
          key={widgetKey}
          onToken={setCaptchaToken}
          onLoadError={() => toast.error(t("signInFailed", { code: "verification" }))}
        />
        <p className="text-muted-foreground text-center text-xs">
          {t.rich("signInConsent", {
            terms: (chunks) => (
              <a href={`/${locale}/terms`} className="underline" target="_blank">
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a href={`/${locale}/privacy`} className="underline" target="_blank">
                {chunks}
              </a>
            ),
          })}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z"
      />
    </svg>
  );
}
