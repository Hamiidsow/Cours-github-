import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export default function NotFound() {
  const t = getDictionary();
  return (
    <div className="container-page py-20 text-center">
      <h1 className="h1">{t.errors.notFound}</h1>
      <p className="mt-3 text-muted">{t.errors.notFoundText}</p>
      <Link href="/" className="btn-primary mt-6">{t.errors.backHome}</Link>
    </div>
  );
}
