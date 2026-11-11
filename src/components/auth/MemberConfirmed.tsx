import { ButtonLink } from "@/components/ui/Button";

/** Shown once an account is linked to a roster member. */
export function MemberConfirmed({ message }: { message: string }) {
  return (
    <div className="grid w-full max-w-[520px] gap-4 card p-7 max-sm:p-5">
      <div role="status">
        <h2 className="text-subheading">{message}</h2>
        <p className="mt-1 text-small text-muted">
          이제 이 계정으로 로그인하면 AIKU 학회원으로 인식됩니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/profile" variant="dark" size="sm">
          내 프로필 보기
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" size="sm">
          홈으로
        </ButtonLink>
      </div>
    </div>
  );
}
