import type { Metadata } from "next";

import { SchemaCanvas } from "@/components/admin/canvas/SchemaCanvas";
import { ChangeHistory } from "@/components/admin/ChangeHistory";
import { PageHero } from "@/components/layout/PageHero";
import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { loadHistory } from "@/lib/admin/history.server";
import { loadSchema } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin-client";

export const metadata: Metadata = {
  title: "관리자",
  description: "AIKU 데이터베이스를 직접 보고 고치는 페이지입니다.",
};

export default async function AdminPage() {
  await requireAdmin();
  const [schema, history] = await Promise.all([loadSchema(), loadHistory(createAdminClient())]);

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="AIKU 데이터 관리"
        lead="AIKU 데이터베이스의 모든 표를 한 화면에서 보고 고칩니다. DB 업데이트한 내용은 사이트에 바로 반영됩니다."
      />
      {/* Computers only: below 981px or on a touch screen, the page is a note and nothing else. */}
      <div className="max-lg:hidden pointer-coarse:hidden">
        <SchemaCanvas schema={schema} />
        <ChangeHistory batches={history} />
      </div>
      <section className="site-container hidden py-10 max-lg:block pointer-coarse:block">
        <EmptyNotice>관리자 페이지는 컴퓨터 환경에서만 이용할 수 있습니다.</EmptyNotice>
      </section>
    </>
  );
}
