import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "CONTA SMART PERÚ", description: "Sistema contable académico" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }
