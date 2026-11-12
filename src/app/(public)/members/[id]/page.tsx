import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicProfile, memberExists } from "@/actions/profile";
import { BackLink } from "@/components/navigation/BackLink";
import { Section } from "@/components/layout/Section";
import { PrivateProfile } from "@/components/profile/PrivateProfile";
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
 * A member's profile on its own page: where phones open a member card, and the
 * panel's expand control leads. A private profile shows only to admins, who
 * load it in the browser; the static page itself never contains it.
 */
export default async function MemberProfilePage({ params }: PageProps<"/members/[id]">) {
  const { id } = await params;
  const result = await getPublicProfile(id);
  if (!result.ok && !(await memberExists(id))) notFound();

  return (
    <Section className="pt-8 max-lg:pt-8 max-sm:pt-5">
      <div className="site-container">
        <BackLink fallback={{ href: "/members", label: "Members" }} />
        <div className="mt-6 max-sm:mt-5">
          {result.ok ? (
            <ProfileContent
              subject={result.data.subject}
              profile={result.data.profile}
              projects={result.data.projects}
              awards={result.data.awards}
            />
          ) : (
            <PrivateProfile memberId={id} />
          )}
        </div>
      </div>
    </Section>
  );
}
