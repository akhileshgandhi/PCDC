"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, logout, type User } from "@/lib/api";
import { LayoutDashboard, Building2, Layers, Users, Settings, FileText } from "lucide-react";

const ADMIN_NAV = [
  { label: "Dashboard", Icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Departments", Icon: Building2, href: "/admin/subjects" },
  { label: "Capabilities", Icon: Layers, href: "/admin/capabilities" },
  { label: "Case Studies", Icon: FileText, href: "/admin/case-studies" },
  { label: "User Management", Icon: Users, href: "/admin/users" },
  { label: "Settings", Icon: Settings, href: "/admin/settings" },
];

const MENTOR_NAV = [
  { label: "Dashboard", Icon: LayoutDashboard, href: "/mentor/dashboard" },
  { label: "Case Studies", Icon: FileText, href: "/mentor/case-studies" },
  { label: "My Students", Icon: Users, href: "/mentor/students" },
];

const STUDENT_NAV = [
  { label: "Dashboard", Icon: LayoutDashboard, href: "/student/dashboard" },
  { label: "Assessments", Icon: FileText, href: "/student/assessments" },
];

const NAV_BY_ROLE: Record<string, typeof ADMIN_NAV> = { admin: ADMIN_NAV, mentor: MENTOR_NAV, student: STUDENT_NAV };

export default function Shell({ title, subtitle, actions, children }: {
  title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;
  const initials = user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const nav = NAV_BY_ROLE[user.role] || ADMIN_NAV;
  const portalLabel = user.role === "mentor" ? "Mentor" : user.role === "student" ? "Student" : "Admin";

  return (
    <div>
      <header className="h-[68px] bg-white border-b border-line flex items-center gap-4 px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3 font-extrabold text-[17px]">
          <span className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center font-extrabold">PC</span>
          <div>PCDC<div className="text-[11px] font-medium text-slate2 -mt-0.5">{portalLabel}</div></div>
        </div>
        <div className="flex-1" />
        <Link href={`/${portalLabel.toLowerCase()}/profile`} title="My profile" className="flex items-center gap-3 hover:bg-brand-50 rounded-lg px-2 py-1 -mx-1">
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">{initials}</div>
          <div className="text-xs"><b className="block text-[13.5px]">{user.full_name}</b><span className="text-slate2 capitalize">{user.role}</span></div>
        </Link>
        <button onClick={logout} className="btn btn-gh py-2 px-3 text-xs">Logout</button>
      </header>
      <div className="flex min-h-[calc(100vh-68px)]">
        <aside className="w-[252px] bg-white border-r border-line p-5">
          <div className="text-[11px] tracking-wide uppercase text-slate2 font-bold mx-3 mb-3">{portalLabel} Portal</div>
          {nav.map(({ label, Icon, href }) => (
            <Link key={href} href={href} className={`sidelink ${pathname === href ? "sidelink-active" : ""}`}>
              <Icon size={18} strokeWidth={2} className="flex-none" />{label}
            </Link>
          ))}
        </aside>
        <main className="flex-1 p-9">
          <div className="flex justify-between items-end gap-4 flex-wrap mb-7">
            <div><h1 className="text-2xl font-extrabold m-0">{title}</h1>{subtitle && <p className="text-slate2 mt-1.5">{subtitle}</p>}</div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
