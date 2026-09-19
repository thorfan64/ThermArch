import { Compass } from "lucide-react";

const LINKS = [
  { href: "#simulate", label: "Simulate" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#about", label: "About" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-ink-deep/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="#top" className="flex items-baseline gap-3">
          <Compass className="h-5 w-5 shrink-0 self-center text-thermal-warm" aria-hidden="true" />
          <span className="text-lg font-bold tracking-[0.22em]">THERMARCH</span>
          <span className="annot hidden sm:inline">Climate &rarr; Architecture</span>
        </a>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1 sm:gap-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block px-2 py-2 text-sm text-paper-muted transition-colors hover:text-paper sm:px-3"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
