import { redirect } from "next/navigation";

/** Legacy homepage — middleware also redirects; this covers direct matches. */
export default function RootPage() {
  redirect("/ar");
}
