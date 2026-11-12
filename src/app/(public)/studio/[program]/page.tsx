import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { ProgramSessions } from "@/components/studio/ProgramSessions";
import { isProgram, PROGRAMS } from "@/lib/studio/programs";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PROGRAMS).map((program) => ({ program }));
}

export async function generateMetadata({
  params,
}: PageProps<"/studio/[program]">): Promise<Metadata> {
  const { program } = await params;
  if (!isProgram(program)) return {};
  return {
    title: { absolute: `${PROGRAMS[program].label} · AIKU Studio` },
    robots: { index: false, follow: false },
  };
}

// One page per program, every semester together. The sessions load in the
// browser with the member's session, for Studio members only.
export default async function ProgramPage({ params }: PageProps<"/studio/[program]">) {
  const { program } = await params;
  if (!isProgram(program)) notFound();
  const { label, lead, tone } = PROGRAMS[program];

  // The page takes the program's colour in place of the AIKU green.
  return (
    <div className={tone.scope}>
      <PageHero eyebrow="Studio" title={label} lead={lead} accent />
      <Section>
        <div className="site-container">
          {/* The semester filter reads the address, which needs a boundary on a static page. */}
          <Suspense fallback={null}>
            <ProgramSessions slug={program} />
          </Suspense>
        </div>
      </Section>
    </div>
  );
}
