const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconPin = () => (<svg {...base}><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>);
export const IconCheck = () => (<svg {...base}><path d="m5 12 5 5 9-10" /></svg>);
export const IconShield = () => (<svg {...base}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const IconHeart = ({ filled = false }: { filled?: boolean }) => (<svg {...base} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>);
export const IconMenu = () => (<svg {...base}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconHome = () => (<svg {...base} width={40} height={40} strokeWidth={1.5}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>);
export const IconWhatsApp = () => (<svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.100L2 22l5-1.300A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.100l-.300-.200-2.9.800.8-2.8-.200-.300A8 8 0 1 1 12 20Zm4.4-5.700c-.200-.100-1.4-.700-1.6-.800s-.400-.100-.500.1-.600.8-.800.9-.300.2-.500 0a6.5 6.5 0 0 1-3.2-2.800c-.200-.400.2-.400.7-1.200a.400.4 0 0 0 0-.400l-.700-1.700c-.200-.500-.400-.400-.500-.400h-.500a.900.9 0 0 0-.600.3 2.7 2.7 0 0 0-.900 2c0 1.2.900 2.3 1 2.500s1.7 2.6 4.1 3.600c1.5.600 2.1.700 2.9.600a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .100-1.100c0-.200-.200-.200-.400-.300Z" /></svg>);
