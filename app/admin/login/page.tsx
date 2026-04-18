import type { Metadata } from "next";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login — VOLTV",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F] p-4 bg-[radial-gradient(ellipse_at_top,_#E5091420_0%,_transparent_50%)]">
      <AdminLoginForm />
    </div>
  );
}
