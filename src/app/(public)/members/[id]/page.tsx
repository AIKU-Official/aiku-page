import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicProfile } from "@/actions/profile";
import { BackLink } from "@/components/navigation/BackLink";
import { Section } from "@/components/layout/Section";
import { ProfileContent } from "@/components/profile/ProfileContent";

// Refreshed when the member saves their profile; hourly as a safety net.
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/members/[id]">): Promise<Metadata> {
  const result = await getPublicProfile((await params).id);
  return result.ok
    ? {
        title: result.data.subject.name,
        description: result.data.profile.headline || `AIKU ${result.data.subject.generation} 회원`,
      }
    : { title: "프로필" };
}

/**
 * A member's public profile on its own page: where phones open a member card,
 * and the panel's expand control leads. Private profiles are not found.
 */
export default async function MemberProfilePage({ params }: PageProps<"/members/[id]">) {
  const result = await getPublicProfile((await params).id);
  if (!result.ok) notFound();
  const { subject, profile, projects } = result.data;

  return (
    <Section className="pt-8 max-lg:pt-8 max-sm:pt-5">
      <div className="site-container">
        <BackLink fallback={{ href: "/members", label: "Members" }} />
        <div className="mt-6 max-sm:mt-5">
          <ProfileContent subject={subject} profile={profile} projects={projects} />
        </div>
      </div>
    </Section>
  );
}
