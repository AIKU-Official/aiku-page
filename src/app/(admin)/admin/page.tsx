import type { Metadata } from "next";

import { SchemaCanvas } from "@/components/admin/canvas/SchemaCanvas";
import { ChangeHistory } from "@/components/admin/ChangeHistory";
import { PageHero } from "@/components/layout/PageHero";
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
        lead="AIKU 데이터베이스의 모든 표를 한 화면에서 보고 고칩니다. 저장한 내용은 사이트에 바로 반영됩니다."
      />
      <SchemaCanvas schema={schema} />
      {/* The canvas needs a pointer and a wide screen; phones get a note instead. */}
      <section className="site-container hidden py-10 max-sm:block">
        <p className="rounded-[20px] border border-line bg-surface-soft px-5 py-6 text-center text-body text-muted">
          표를 고치는 캔버스는 PC에서만 열립니다. 변경 기록은 아래에서 보고 되돌릴 수 있습니다.
        </p>
      </section>
      <ChangeHistory batches={history} />
    </>
  );
}
