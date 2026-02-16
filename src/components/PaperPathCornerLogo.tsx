"use client";

import Link from "next/link";
import { useState } from "react";

export function PaperPathCornerLogo() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Link href="/home" className="pp-corner-logo" aria-label="PaperPath home">
      {!logoFailed ? (
        <img
          src="/paperpath-logo.png"
          alt="PaperPath logo"
          className="pp-corner-logo-image"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <>
          <span className="pp-corner-mark" aria-hidden>
            PP
          </span>
          <span className="pp-corner-wordmark">
            Paper<span>Path</span>
          </span>
        </>
      )}
    </Link>
  );
}
