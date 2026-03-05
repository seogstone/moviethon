"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => number;
      reset: (widgetId: number) => void;
    };
  }
}

interface HcaptchaWidgetProps {
  token: string;
  onTokenChange: (token: string) => void;
  resetNonce?: number;
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";
const IS_DEV = process.env.NODE_ENV !== "production";

export function HcaptchaWidget({ token, onTokenChange, resetNonce }: HcaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!SITE_KEY) {
      if (IS_DEV) {
        onTokenChange("local-test");
      } else {
        onTokenChange("");
      }
      return;
    }

    function renderWidget() {
      if (!window.hcaptcha || !containerRef.current || widgetIdRef.current !== null) {
        return;
      }

      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (captchaToken: string) => {
          onTokenChange(captchaToken);
        },
        "expired-callback": () => {
          onTokenChange("");
        },
      });
    }

    if (window.hcaptcha) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [onTokenChange]);

  useEffect(() => {
    if (resetNonce === undefined) {
      return;
    }

    if (!window.hcaptcha || widgetIdRef.current === null) {
      return;
    }

    window.hcaptcha.reset(widgetIdRef.current);
    onTokenChange("");
  }, [onTokenChange, resetNonce]);

  if (!SITE_KEY) {
    if (!IS_DEV) {
      return (
        <p className="text-xs text-[var(--negative)]">
          Captcha is misconfigured. Missing `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`.
        </p>
      );
    }

    return (
      <p className="text-xs text-[var(--muted)]">
        Captcha bypass enabled for local development (`HCAPTCHA_BYPASS=true`).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      {!token && <p className="text-xs text-[var(--volatility)]">Complete captcha before submitting.</p>}
    </div>
  );
}
