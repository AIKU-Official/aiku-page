import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="site-container flex items-center justify-between gap-6 py-7 text-[0.92rem] text-muted max-sm:flex-col max-sm:items-start">
      <div className="flex items-center gap-3">
        <Image
          src="/assets/aiku-logo-green.png"
          alt="AIKU"
          width={70}
          height={22}
          className="h-auto w-[70px]"
        />
        <p>고려대학교 딥러닝 학회</p>
      </div>
      <p>© {new Date().getFullYear()} AIKU</p>
    </footer>
  );
}
