"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Globe, 
  Mail, 
  CreditCard, 
  Receipt, 
  LifeBuoy, 
  Settings,
  Activity,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const adminNavigation = [
  { name: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { name: "Organisations", href: "/admin/organisations", icon: Building2 },
  { name: "Utilisateurs", href: "/admin/utilisateurs", icon: Users },
  { name: "Domaines", href: "/admin/domaines", icon: Globe },
  { name: "Boîtes mail", href: "/admin/boites-mail", icon: Mail },
  { name: "Abonnements", href: "/admin/abonnements", icon: CreditCard },
  { name: "Factures", href: "/admin/factures", icon: Receipt },
  { name: "Tickets Support", href: "/admin/support", icon: LifeBuoy },
  { name: "Logs & Audit", href: "/admin/logs", icon: Activity },
  { name: "Configuration", href: "/admin/parametres", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar Administrateur */}
      <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-50">
        <div className="h-16 flex items-center px-6 bg-slate-950/50">
          <ShieldCheck className="h-6 w-6 text-blue-500 mr-2" />
          <span className="text-xl font-bold text-white">ITA ADMIN</span>
        </div>
        
        <div className="px-4 py-3 bg-slate-800/50 mx-4 mt-4 rounded-lg flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            SA
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Super Admin</p>
            <p className="text-xs text-slate-400">ITA INNOVATE</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto mt-2">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Modules de gestion</p>
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-blue-600 text-white" 
                    : "hover:bg-slate-800 hover:text-white"}
                `}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-950/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Quitter l'admin
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pl-64">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Console d'administration globale</h2>
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Système opérationnel
            </span>
            <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
              Aller à l'espace client &rarr;
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
