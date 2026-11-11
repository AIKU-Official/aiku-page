import type { Metadata } from "next";

import { LoginCallback } from "@/components/auth/LoginCallback";
import { Section } from "@/components/layout/Section";

export const metadata: Metadata = { title: "로그인" };

export default function LoginCallbackPage() {
  return (
    <Section>
      <div className="site-container grid justify-items-center">
        <LoginCallback />
      </div>
    </Section>
  );
}
