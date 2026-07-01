import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const logoSrc = `${import.meta.env.BASE_URL}logo-horizontal.svg`;

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  linkTo?: string;
};

const sizeMap = {
  sm: "h-8",
  md: "h-9 sm:h-10",
  lg: "h-11 sm:h-12",
};

export const BrandLogo = ({
  className,
  size = "md",
  linkTo = "/",
}: BrandLogoProps) => {
  const { t } = useTranslation();

  const content = (
    <img
      src={logoSrc}
      alt="RideYo"
      className={cn(sizeMap[size], "w-auto shrink-0 object-contain object-left", className)}
      loading="eager"
      decoding="sync"
    />
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-flex shrink-0 transition-opacity hover:opacity-90 active:scale-[0.99]"
        aria-label={t("components.brandLogo.homeAriaLabel")}
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default BrandLogo;
