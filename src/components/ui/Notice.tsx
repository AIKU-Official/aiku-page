import { ButtonLink } from "@/components/ui/Button";

/** A short message in a card with one way forward, for pages a visitor cannot use yet. */
export function Notice({
  children,
  action,
}: {
  children: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="mx-auto grid w-full max-w-[520px] gap-4 card p-7 max-sm:p-5">
      <p className="text-muted">{children}</p>
      <div>
        <ButtonLink href={action.href} variant="dark" size="sm">
          {action.label}
        </ButtonLink>
      </div>
    </div>
  );
}
