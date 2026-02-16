import Link from "next/link";

export function FooterLinks() {
  return (
    <footer className="footer-links">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/contact">Contact</Link>
    </footer>
  );
}
