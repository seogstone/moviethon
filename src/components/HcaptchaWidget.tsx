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
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";
const IS_DEV = process.env.NODE_ENV !== "production";

export function HcaptchaWidget({ token, onTokenChange }: HcaptchaWidgetProps) {
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

  if (!SITE_KEY) {
    if (!IS_DEV) {
      return (
        <p className="text-xs text-[#c26b00]">
          Captcha is misconfigured. Missing `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`.
        </p>
      );
    }

    return (
      <p className="text-xs text-[#8e8e93]">
        Captcha bypass enabled for local development (`HCAPTCHA_BYPASS=true`).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      {!token && <p className="text-xs text-[#c26b00]">Complete captcha before submitting.</p>}
    </div>
  );
}
