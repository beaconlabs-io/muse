import { Hero } from "@/components/hero";
import type { Metadata } from "next";
import { localeAlternates } from "@/lib/locale-alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: localeAlternates(lang) };
}

export default function Home() {
  return (
    <main>
      <Hero />
    </main>
  );
}
