import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

// Composants de base au format shadcn/ui (Radix + Tailwind + cva), regroupés dans un seul fichier.

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
        navy: "bg-navy-900 text-white shadow-sm hover:bg-navy-800",
        gold: "bg-gold-400 text-navy-950 shadow-sm hover:bg-gold-300",
        outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        ghost: "text-slate-600 hover:bg-slate-100",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "size-9", lg: "h-11 px-6 text-base" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = "button", ...p }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...p} />
));
Button.displayName = "Button";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-slate-100";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-10", className)} {...p} />
));
Input.displayName = "Input";
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(field, "h-10 pr-8", className)} {...p} />
));
Select.displayName = "Select";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-20 py-2", className)} {...p} />
));
Textarea.displayName = "Textarea";
export function Label({ className, children, required, ...p }: HTMLAttributes<HTMLLabelElement> & { required?: boolean; htmlFor?: string }) {
  return (
    <label className={cn("mb-1 block text-xs font-semibold text-slate-600", className)} {...p}>
      {children}{required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-xl border border-slate-200 bg-white shadow-card", className)} {...p} />;
}
export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5", className)}>
      <div>
        <h2 className="text-sm font-bold text-navy-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap", {
  variants: {
    tone: {
      slate: "bg-slate-100 text-slate-700 ring-slate-200",
      green: "bg-brand-50 text-brand-800 ring-brand-200",
      gold: "bg-gold-50 text-gold-700 ring-gold-200",
      red: "bg-red-50 text-red-700 ring-red-200",
      navy: "bg-navy-50 text-navy-700 ring-navy-200",
      violet: "bg-violet-50 text-violet-700 ring-violet-200",
    },
  },
  defaultVariants: { tone: "slate" },
});
export function Badge({ tone, className, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...p} />;
}
/** Étiquette obligatoire sur toute ligne du jeu d'exemple. */
export function DemoBadge() {
  return <Badge tone="violet" className="uppercase tracking-wide">Demo</Badge>;
}
const STATUS_TONE: Record<string, VariantProps<typeof badgeVariants>["tone"]> = {
  verifie: "green", eleve: "green", retenu: "green", oui: "green", actif: "green",
  hypothese: "gold", moyen: "gold", en_cours: "gold", peut_etre: "gold", recu: "navy",
  rejete: "red", faible: "red", non: "red", ecarte: "red", expire: "red",
  non_verifie: "slate",
};
export function StatusBadge({ value }: { value: string | null | undefined }) {
  const { t } = useI18n();
  if (!value) return <NA />;
  return <Badge tone={STATUS_TONE[value] ?? "navy"}>{t("o." + value, value)}</Badge>;
}
/** Jamais de valeur inventée : une donnée absente s'affiche ainsi. */
export function NA({ short }: { short?: boolean }) {
  const { t } = useI18n();
  return <span className="text-xs italic text-slate-400">{short ? "—" : t("common.na")}</span>;
}

export function Dialog({ open, onOpenChange, title, description, children, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            wide ? "sm:max-w-4xl" : "sm:max-w-2xl",
          )}
        >
          <div className="flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-navy-900 px-5 py-3.5 text-white">
            <div>
              <DialogPrimitive.Title className="text-base font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={cn("mt-0.5 text-xs text-navy-200", !description && "sr-only")}>{description ?? title}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-navy-200 hover:bg-white/10 hover:text-white" aria-label="Fermer"><X className="size-5" /></DialogPrimitive.Close>
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function PageHeader({ title, subtitle, actions, icon }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300 shadow-card sm:flex [&_svg]:size-5">{icon}</div>}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-navy-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const KPI_TONES = {
  green: { bar: "var(--color-brand-500)", icon: "bg-brand-50 text-brand-700" },
  navy: { bar: "var(--color-navy-600)", icon: "bg-navy-50 text-navy-700" },
  gold: { bar: "var(--color-gold-400)", icon: "bg-gold-50 text-gold-700" },
  red: { bar: "#dc2626", icon: "bg-red-50 text-red-700" },
  violet: { bar: "#7c3aed", icon: "bg-violet-50 text-violet-700" },
} as const;
export function Kpi({ label, value, hint, tone = "green", icon }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: keyof typeof KPI_TONES; icon?: ReactNode }) {
  const tn = KPI_TONES[tone];
  return (
    <Card className="keyline overflow-hidden p-4 pl-5" style={{ ["--kl" as any]: tn.bar }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {icon && <span className={cn("flex size-8 items-center justify-center rounded-lg [&_svg]:size-4", tn.icon)}>{icon}</span>}
      </div>
      <p className="tabular mt-1 text-2xl font-extrabold text-navy-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function Empty({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-md text-xs text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}
export function Notice({ tone = "gold", children, className }: { tone?: "gold" | "navy" | "red" | "green" | "violet"; children: ReactNode; className?: string }) {
  const m = {
    gold: "border-gold-300 bg-gold-50 text-gold-700", navy: "border-navy-200 bg-navy-50 text-navy-800",
    red: "border-red-200 bg-red-50 text-red-800", green: "border-brand-200 bg-brand-50 text-brand-900",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
  }[tone];
  return <div className={cn("rounded-lg border-l-4 px-3 py-2 text-xs leading-relaxed", m, className)}>{children}</div>;
}
export const th = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-navy-100 whitespace-nowrap";
export const td = "px-3 py-2 text-sm text-slate-700 align-top";
