import React from "react";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center bg-slate-800 p-4 text-white">
      <nav className="flex flex-row">
        <a
          href="https://github.com/MichaelKohler/tv-tracker/"
          className="text-white-700 px-4 py-2 text-base font-semibold sm:px-8"
        >
          Open Source
        </a>
      </nav>
      <p className="mt-4">
        Made in Berlin by{" "}
        <a
          href="https://mkohler.dev"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Michael Kohler
        </a>
      </p>
    </footer>
  );
}
