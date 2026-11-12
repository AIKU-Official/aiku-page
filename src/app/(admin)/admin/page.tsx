import type { Metadata } from "next";

import { SchemaCanvas } from "@/components/admin/canvas/SchemaCanvas";
import { PageHero } from "@/components/layout/PageHero";
import { loadSchema } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "관리자",
  description: "AIKU 데이터베이스를 직접 보고 고치는 페이지입니다.",
};

export default async function AdminPage() {
  await requireAdmin();
  const schema = await loadSchema();

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="AIKU 데이터 관리"
        lead="표를 눌러 행을 추가하고 고치고 지웁니다. 바꾼 내용은 DB 업데이트를 눌러야 실제로 저장되고, 사이트에 바로 반영됩니다."
      />
      <SchemaCanvas schema={schema} />
      {/* The canvas needs a pointer and a wide screen; phones get a note instead. */}
      <section className="site-container hidden py-10 max-sm:block">
        <p className="rounded-[20px] border border-line bg-surface-soft px-5 py-6 text-center text-body text-muted">
          데이터 관리는 PC에서만 할 수 있습니다.
        </p>
      </section>
    </>
  );
}
