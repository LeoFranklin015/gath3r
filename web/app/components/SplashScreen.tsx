"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const APP_NAME = "gath3r";
const LETTER_DELAY_MS = 110;
const LOGO_APPEAR_MS = 250;
const TYPEWRITER_START_MS = 700;
const TAGLINE_DELAY_MS = 500;
const BUTTON_DELAY_MS = 900;

export function SplashScreen() {
  const { login } = usePrivy();
  const [typedName, setTypedName] = useState("");
  const [isDoneTyping, setIsDoneTyping] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Start typewriter after logo has appeared
    const startTimer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setTypedName(APP_NAME.slice(0, i));

        if (i === APP_NAME.length) {
          clearInterval(interval);
          setIsDoneTyping(true);
          setTimeout(() => setShowTagline(true), TAGLINE_DELAY_MS);
          setTimeout(() => setShowButton(true), TAGLINE_DELAY_MS + BUTTON_DELAY_MS);
        }
      }, LETTER_DELAY_MS);

      return () => clearInterval(interval);
    }, TYPEWRITER_START_MS);

    return () => clearTimeout(startTimer);
  }, []);

  return (
    <div className="relative flex h-dvh flex-col items-center justify-between overflow-hidden bg-background px-6 py-14">

      {/* Center — logo + name + tagline */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6">

        {/* Logo: fades in + scales up */}
        <div
          style={{
            opacity: 0,
            animation: `fade-scale-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${LOGO_APPEAR_MS}ms forwards`,
          }}
        >
          <Image
            src="/location-pin.gif"
            alt="Gath3r"
            width={100}
            height={100}
            priority
            unoptimized
          />
        </div>

        {/* App name: types in letter by letter */}
        <div className="flex h-14 items-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            {typedName}
            {!isDoneTyping && typedName.length > 0 && (
              <span
                className="ml-0.5 inline-block w-0.5 bg-primary align-middle"
                style={{ height: "0.85em", opacity: 1 }}
              />
            )}
          </h1>
        </div>

        {/* Tagline: fades + slides up */}
        <p
          className="text-base text-muted-foreground"
          style={{
            opacity: showTagline ? 1 : 0,
            transform: showTagline ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          Events, owned by you.
        </p>
      </div>

      {/* Bottom — CTA slides up */}
      <div
        className="flex w-full flex-col items-center gap-3"
        style={{
          opacity: showButton ? 1 : 0,
          transform: showButton ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <Button
          onClick={login}
          size="lg"
          className="w-full rounded-2xl py-6 text-base font-semibold"
        >
          <Mail className="mr-2 h-4 w-4" />
          Continue with Email
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <span className="cursor-pointer underline underline-offset-2">Terms</span>
          {" & "}
          <span className="cursor-pointer underline underline-offset-2">Privacy</span>
        </p>
      </div>
    </div>
  );
}
