import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const markSrc = `${import.meta.env.BASE_URL}logo-mark.png`;

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  linkTo?: string;
  showWordmark?: boolean;
};

const sizeMap = {
  sm: {
    mark: "h-8",
    text: "text-lg",
  },
  md: {
    mark: "h-10 md:h-11",
    text: "text-xl md:text-2xl",
  },
  lg: {
    mark: "h-12 md:h-14",
    text: "text-2xl md:text-3xl",
  },
};

export const BrandLogo = ({
  className,
  size = "md",
  linkTo = "/",
  showWordmark = true,
}: BrandLogoProps) => {
  const { t } = useTranslation();
  const sizes = sizeMap[size];

  const content = (
    <span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <img
        src={markSrc}
        alt=""
        aria-hidden
        className={cn(sizes.mark, "w-auto shrink-0 object-contain")}
        loading="eager"
        decoding="sync"
      />
      {showWordmark && (
        <span className={cn("font-bold leading-none tracking-tight", sizes.text)}>
          <span className="text-foreground">Ride</span>
          <span className="text-[#0EA5C6]">Yo</span>
        </span>
      )}
    </span>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-flex transition-opacity hover:opacity-90 active:scale-[0.99]"
        aria-label={t("components.brandLogo.homeAriaLabel")}
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default BrandLogo;
