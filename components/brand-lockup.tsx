import Image from "next/image";

interface BrandLockupProps {
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function BrandLockup({
  width = 380,
  height = 71,
  className,
  imageClassName,
  priority = false,
}: BrandLockupProps) {
  return (
    <div className={className}>
      <Image
        src="/brand/advocate-logo-signature-horizontal.svg"
        alt="Advocate"
        width={width}
        height={height}
        priority={priority}
        className={imageClassName ?? "h-auto w-full"}
      />
    </div>
  );
}
