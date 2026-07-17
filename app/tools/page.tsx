import type { Metadata } from "next";
import { ToolsDirectory } from "./ToolsDirectory";
import { tools } from "../../lib/data";

export const metadata: Metadata = {
  title: "AI Tools & Software Directory",
  description: "Search and compare practical AI tools, productivity software, design platforms, and business services.",
};

export default function ToolsPage() {
  return (
    <main>

      <section className="directory-hero">
        <div className="container compact-hero">
          <p className="eyebrow"><span /> Curated and independently reviewed</p>
          <h1>Find the right tool for the work.</h1>
          <p>Search useful AI platforms and software by category, price, and the people they serve.</p>
        </div>
      </section>
      <ToolsDirectory tools={tools} />
    </main>
  );
}
