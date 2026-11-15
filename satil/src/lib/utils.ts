import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const CURRENCIES = ["XOF", "CNY", "USD", "EUR", "GNF", "GHS", "NGN", "KES", "ZAR", "XAF"] as const;
export const today = () => new Date().toISOString().slice(0, 10);
