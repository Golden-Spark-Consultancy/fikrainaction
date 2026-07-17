import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div><Link className="footer-logo-link" href="/" aria-label="Fikra in Action home"><Image className="footer-logo" src="/fikra-in-action-logo.png" alt="Fikra in Action" width={1170} height={607} unoptimized /></Link><p>Helping you move from curiosity to confident action.</p></div>
      <div><strong>Explore</strong><Link href="/tools">AI Tools</Link><Link href="/comparisons">Comparisons</Link><Link href="/tutorials">Tutorials</Link><Link href="/deals">Deals</Link></div>
      <div><strong>About</strong><Link href="/about">About us</Link><Link href="/editorial-policy">Editorial policy</Link><Link href="/review-methodology">Review methodology</Link><Link href="/contact">Contact</Link></div>
      <div><strong>Legal</strong><Link href="/affiliate-disclosure">Affiliate disclosure</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms of Service</Link><Link href="/cookies">Cookies</Link></div>
    </div>
    <div className="container footer-bottom"><span>© 2026 Fikra in Action</span><span>Some links may earn us a commission at no extra cost to you.</span></div>
  </footer>;
}
