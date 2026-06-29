import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-2 text-xl text-foreground">{t("common.notFound")}</p>
        <p className="mb-6 text-muted-foreground">{t("common.notFoundDesc")}</p>
        <Button asChild>
          <Link to="/">{t("common.backHome")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
