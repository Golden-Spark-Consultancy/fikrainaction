export type Tool = {
  slug: string;
  name: string;
  logo: string;
  logoClass: string;
  category: string;
  description: string;
  rating: number;
  price: string;
  badge?: string;
  highlights: string[];
  bestFor: string;
  affiliateUrl: string;
};

export type MainCategory = { name: string; slug: string; icon: string; color: string; description: string };

export const tools: Tool[] = [
  { slug: "notion-ai", name: "Notion AI", logo: "N", logoClass: "logo-violet", category: "AI productivity", description: "A connected workspace for notes, projects, knowledge, and AI-assisted writing.", rating: 4.8, price: "From $10/month", badge: "Editor’s pick", highlights: ["Flexible connected workspace", "Strong writing and summaries", "Large template ecosystem"], bestFor: "Teams organizing knowledge and projects", affiliateUrl: "https://www.notion.so/product/ai" },
  { slug: "canva-magic-studio", name: "Canva Magic Studio", logo: "C", logoClass: "logo-coral", category: "Design & content", description: "Accessible AI-assisted design tools for social posts, presentations, and brand assets.", rating: 4.7, price: "Free plan available", badge: "Best for beginners", highlights: ["Very easy to learn", "Broad content formats", "Useful brand controls"], bestFor: "Creators and small businesses", affiliateUrl: "https://www.canva.com/magic-studio/" },
  { slug: "make", name: "Make", logo: "M", logoClass: "logo-indigo", category: "Automation", description: "A visual automation platform for connecting apps and building advanced workflows.", rating: 4.6, price: "Free plan available", badge: "Best for workflows", highlights: ["Powerful visual builder", "Thousands of app connections", "Flexible branching logic"], bestFor: "Operations and automation teams", affiliateUrl: "https://www.make.com/" },
  { slug: "monday", name: "monday.com", logo: "m", logoClass: "logo-yellow", category: "Work management", description: "Customizable boards, workflows, and dashboards for managing work across teams.", rating: 4.5, price: "From $9/seat", highlights: ["Highly visual workflows", "Many ready-made templates"], bestFor: "Growing teams", affiliateUrl: "https://monday.com/" },
  { slug: "semrush", name: "Semrush", logo: "S", logoClass: "logo-orange", category: "Marketing", description: "SEO, competitive research, content, and advertising tools in one platform.", rating: 4.6, price: "From $139.95/month", highlights: ["Deep keyword research", "Competitive intelligence"], bestFor: "Marketing professionals", affiliateUrl: "https://www.semrush.com/" },
  { slug: "grammarly", name: "Grammarly", logo: "G", logoClass: "logo-green", category: "Writing", description: "Writing assistance for clearer, more confident communication across apps.", rating: 4.4, price: "Free plan available", highlights: ["Works across many apps", "Fast tone and clarity suggestions"], bestFor: "Professionals and students", affiliateUrl: "https://www.grammarly.com/" },
];

export const categories: MainCategory[] = [
  { name: "AI Tools", slug: "ai-tools", icon: "✦", color: "dot-violet", description: "AI tools for content creation, automation, productivity, video, images, audio, research and business." },
  { name: "Web Hosting", slug: "web-hosting", icon: "⌂", color: "dot-blue", description: "Website hosting, WordPress hosting, cloud hosting, VPS, domains and website-building services." },
  { name: "Marketing Software", slug: "marketing-software", icon: "↗", color: "dot-coral", description: "SEO, email marketing, CRM, analytics, sales funnels, social media and advertising software." },
  { name: "Creator Platforms", slug: "creator-platforms", icon: "◉", color: "dot-green", description: "Platforms for courses, communities, digital products, newsletters, memberships and creator monetization." },
];

export const contentTypes = ["Review", "Comparison", "Tutorial", "Deal", "Alternatives", "Landing page"] as const;

export const posts = [
  { slug: "choose-ai-tool", category: "Practical guide", readTime: "7 min", visual: "01", title: "How to choose an AI tool without wasting your budget", excerpt: "A simple framework for separating a useful investment from an impressive demo." },
  { slug: "automate-first-workflow", category: "Automation", readTime: "9 min", visual: "02", title: "Your first business automation: where to begin", excerpt: "Find the repetitive task worth automating and map it safely from start to finish." },
  { slug: "affiliate-disclosure-trust", category: "Editorial", readTime: "5 min", visual: "03", title: "Why transparent recommendations lead to better choices", excerpt: "How we balance useful recommendations, affiliate relationships, and editorial independence." },
];
