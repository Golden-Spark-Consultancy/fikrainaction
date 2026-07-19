import type { Metadata } from "next";
import Link from "next/link";
import { tools } from "../../lib/data";

export const metadata: Metadata = { title: "Software & AI Tool Comparisons", description: "Clear side-by-side comparisons focused on fit, features, price, and practical value." };

export default function ComparisonsPage() {
  return <main><section className="directory-hero"><div className="container compact-hero"><p className="eyebrow"><span /> Side-by-side, without the noise</p><h1>Compare the differences that matter.</h1><p>Quickly see where leading tools excel, where they fall short, and which one fits your workflow.</p></div></section><section className="container section"><div className="comparison-index"><Link href="/compare/notion-ai-vs-clickup"><div><span className={`logo-tile ${tools[0].logoClass}`}>{tools[0].logo}</span><b>Notion AI</b></div><span>versus</span><div><span className="logo-tile logo-blue">C</span><b>ClickUp Brain</b></div><p>Knowledge management or project execution?</p><strong>Compare →</strong></Link><Link href="/compare/canva-vs-adobe-express"><div><span className={`logo-tile ${tools[1].logoClass}`}>{tools[1].logo}</span><b>Canva</b></div><span>versus</span><div><span className="logo-tile logo-indigo">A</span><b>Adobe Express</b></div><p>Which creative platform offers the better everyday workflow?</p><strong>Compare →</strong></Link></div></section></main>;
}
