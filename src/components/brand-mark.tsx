import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The brand logo (app icon). Size it with `className`, e.g. "h-8 w-8". */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src={BRAND.logo}
      alt={BRAND.name}
      width={64}
      height={64}
      className={cn("shrink-0", className)}
    />
  );
}
