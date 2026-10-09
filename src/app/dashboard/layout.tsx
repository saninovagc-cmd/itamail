"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Globe, 
  Mail, 
  Users, 
  CreditCard, 
  Receipt, 
  LifeBuoy, 
  Settings,
  LogOut,
  Menu
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
  { name: "Domaines", href: "/dashboard/domaines", icon: Globe },
  { name: "Boîtes mail", href: "/dashboard/boites-mail", icon: Mail },
  { name: "Utilisateurs", href: "/dashboard/utilisateurs", icon: Users },
  { name: "Abonnement", href: "/dashboard/abonnement", icon: CreditCard },
  { name: "Paiements", href: "/dashboard/paiements", icon: CreditCard },
  { name: "Factures", href: "/dashboard/factures", icon: Receipt },
  { name: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { name: "Paramètres", href: "/dashboard/parametres", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:static"}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Mail className="h-6 w-6 text-blue-600 mr-2" />
          <span className="text-xl font-bold text-slate-900">ITA MAIL</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
                `}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? "text-blue-700" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-500 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center">
            {/* Profil Avatar (Placeholder) */}
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
