"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, DollarSign, Database, Container, Server,
  ArrowRightLeft, Box, Zap, Shield, Trash2, Network, TrendingDown,
  Clock, ChevronRight, ChevronDown, Globe, Lock, Eye, EyeOff,
  Loader2, GitBranch, Cpu, Radio, HardDrive, Layers,
  Wifi, BarChart2, FlaskConical, Users, Settings, Building2,
  Activity, Target, ServerCog, Bell, Cloud,
} from "lucide-react";
import { RegionProvider, useRegion } from "@/components/RegionProvider";
import { IdentityProvider } from "@/components/identity/IdentityProvider";
import { WorkspaceSwitcher } from "@/components/identity/WorkspaceSwitcher";
import { EnvironmentSwitcher } from "@/components/identity/EnvironmentSwitcher";
import { UserMenu } from "@/components/identity/UserMenu";

/* ─── Target Information Architecture Definition ───────────────────── */

interface NavItemDef {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
}

interface AwsCategoryDef {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItemDef[];
}

const homeNavItems: NavItemDef[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
];

const observeNavItems: NavItemDef[] = [
  { href: "/services", icon: ServerCog, label: "Services" },
  { href: "/infrastructure", icon: Network, label: "Infrastructure" },
];

const reliabilityNavItems: NavItemDef[] = [
  { href: "/sre", icon: Activity, label: "SRE Health" },
  { href: "/slos", icon: Target, label: "SLOs & Error Budgets" },
  { href: "/alerts", icon: Bell, label: "Alerts" },
  { href: "/history", icon: Clock, label: "Failure History" },
];

const awsCategories: AwsCategoryDef[] = [
  {
    key: "compute",
    label: "Compute",
    icon: Cpu,
    items: [
      { href: "/ec2", icon: Server, label: "EC2" },
      { href: "/ecs", icon: Container, label: "ECS" },
      { href: "/lambda", icon: Zap, label: "Lambda" },
      { href: "/elasticache", icon: Cpu, label: "ElastiCache" },
    ],
  },
  {
    key: "data",
    label: "Data",
    icon: Database,
    items: [
      { href: "/rds", icon: Database, label: "RDS" },
      { href: "/dynamodb", icon: Layers, label: "DynamoDB" },
      { href: "/s3", icon: Box, label: "S3" },
    ],
  },
  {
    key: "networking",
    label: "Networking",
    icon: ArrowRightLeft,
    items: [
      { href: "/alb", icon: ArrowRightLeft, label: "Load Balancers" },
      { href: "/cloudfront", icon: Wifi, label: "CloudFront" },
      { href: "/route53", icon: Radio, label: "Route 53" },
    ],
  },
  {
    key: "developer",
    label: "Developer",
    icon: GitBranch,
    items: [
      { href: "/amplify", icon: GitBranch, label: "Amplify" },
      { href: "/codepipeline", icon: HardDrive, label: "CodePipeline" },
    ],
  },
  {
    key: "observability",
    label: "Observability",
    icon: BarChart2,
    items: [
      { href: "/cloudwatch", icon: BarChart2, label: "CloudWatch" },
    ],
  },
  {
    key: "aiml",
    label: "AI / ML",
    icon: FlaskConical,
    items: [
      { href: "/sagemaker", icon: FlaskConical, label: "SageMaker" },
    ],
  },
];

const cloudDirectNavItems: NavItemDef[] = [
  { href: "/cost", icon: DollarSign, label: "Cost" },
  { href: "/optimization", icon: TrendingDown, label: "Optimization" },
  { href: "/security", icon: Shield, label: "Security" },
  { href: "/waste", icon: Trash2, label: "Waste" },
];

const platformNavItems: NavItemDef[] = [
  { href: "/workspace", icon: Building2, label: "Workspace" },
  { href: "/members", icon: Users, label: "Members" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

/* ── Region Selector ─────────────────────────────────────────────── */
function RegionSelector() {
  const { region, setRegion, regions } = useRegion();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = regions.filter(
    r => r.label.toLowerCase().includes(search.toLowerCase()) || r.value.includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/20 hover:bg-white/[0.05] transition-all text-[11px] cursor-pointer"
      >
        <Globe size={12} className="text-cyan-400" />
        <span className="text-slate-400 font-medium">{region}</span>
        <ChevronDown size={11} className={`text-slate-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-[#0a0f1a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-[200] overflow-hidden">
          <div className="p-2 border-b border-white/[0.04]">
            <input
              type="text"
              placeholder="Search region…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/30 placeholder:text-slate-600"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map(r => (
              <button
                key={r.value}
                onClick={() => { setRegion(r.value); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 text-[11px] flex items-center justify-between hover:bg-cyan-500/[0.06] transition-colors cursor-pointer ${r.value === region ? "bg-cyan-500/[0.08] text-cyan-400" : "text-slate-400"}`}
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-[9px] text-slate-600 font-mono">{r.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Standard Nav Link ───────────────────────────────────────────── */
function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 px-3 py-[8px] rounded-xl text-[12px] font-medium transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-cyan-500/[0.14] to-transparent text-white font-semibold"
          : "text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/[0.06] hover:to-transparent"
      }`}
    >
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${isActive ? "bg-cyan-500/20 text-cyan-300" : "bg-white/[0.03] group-hover:bg-cyan-500/10 text-slate-400 group-hover:text-cyan-400"}`}>
        <Icon size={13} className="shrink-0 transition-colors duration-200" />
      </div>
      <span className="flex-1 truncate">{label}</span>
      {isActive && <div className="w-1 h-3.5 rounded-full bg-cyan-400 absolute left-0" />}
      <ChevronRight size={11} className={`transition-all duration-200 shrink-0 ${isActive ? "opacity-60 text-cyan-400" : "opacity-0 group-hover:opacity-40 -translate-x-1 group-hover:translate-x-0"}`} />
    </Link>
  );
}

/* ── Collapsible AWS Provider Navigation Tree ─────────────────────── */
function AwsCollapsibleNav() {
  const pathname = usePathname();
  const allAwsRoutes = awsCategories.flatMap(c => c.items.map(i => i.href));
  const isAwsActive = allAwsRoutes.some(r => pathname === r || pathname.startsWith(r + "/"));

  const [isOpen, setIsOpen] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    networking: true,
    developer: true,
    observability: true,
    aiml: true,
  });

  const toggleCategory = (key: string) => {
    setCollapsedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col">
      {/* AWS Group Header Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-between w-full px-3 py-[7.5px] rounded-xl text-[12px] font-medium transition-all duration-200 cursor-pointer ${
          isAwsActive
            ? "bg-white/[0.04] text-white font-semibold"
            : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${isAwsActive ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.03] text-slate-400 group-hover:text-amber-400"}`}>
            <Cloud size={13} className="shrink-0" />
          </div>
          <span className="font-semibold tracking-wide truncate">AWS</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.06]">
            Provider
          </span>
        </div>
        <ChevronDown
          size={12}
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {/* Nested Collapsible Categories */}
      {isOpen && (
        <div className="ml-4 pl-2 border-l border-white/[0.06] flex flex-col gap-1 my-1">
          {awsCategories.map((cat) => {
            const hasActiveChild = cat.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/"));
            const isCatOpen = hasActiveChild || !collapsedCategories[cat.key];

            return (
              <div key={cat.key} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  className={`flex items-center justify-between w-full px-2 py-1 rounded-md text-[10.5px] font-semibold tracking-wide transition-colors cursor-pointer ${
                    hasActiveChild
                      ? "text-cyan-300 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <cat.icon size={11} className={hasActiveChild ? "text-cyan-400" : "text-slate-500"} />
                    <span>{cat.label}</span>
                  </div>
                  <ChevronDown
                    size={10}
                    className={`text-slate-500 transition-transform duration-200 shrink-0 ${isCatOpen ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>

                {isCatOpen && (
                  <div className="flex flex-col gap-0.5 ml-2 pl-2 border-l border-white/[0.04] py-0.5">
                    {cat.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                            isActive
                              ? "bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400"
                              : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                          }`}
                        >
                          <item.icon size={11} className={isActive ? "text-cyan-400" : "text-slate-500"} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Client Layout ───────────────────────────────────────────────── */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RegionProvider>
      <LayoutInner>{children}</LayoutInner>
    </RegionProvider>
  );
}

/* ── Auth Overlay ────────────────────────────────────────────────── */
function AuthOverlay({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
      });
      const data = await res.json();
      if (data.success) {
        onAuthenticated();
      } else {
        setError(data.message || "Invalid password");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#030711] flex items-center justify-center p-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="relative w-full max-w-[400px] bg-[#0a0f1a] border border-white/[0.08] rounded-3xl shadow-2xl p-8 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-cyan-500/20 mb-6 scale-110">
            <Lock size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">OpsConsole Access</h2>
          <p className="text-slate-400 text-sm">Enter password to access the dashboard</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className={`w-full bg-white/[0.03] border ${error ? "border-red-500/50" : "border-white/[0.06]"} group-hover:border-cyan-500/30 focus:border-cyan-500/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all placeholder:text-slate-700`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <p className="text-[11px] text-red-400 mt-2 ml-1 flex items-center gap-1.5 font-medium">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Access Dashboard"}
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
          <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Cloud · SRE · Operations</p>
        </div>
      </div>
    </div>
  );
}

/* ── Layout Inner ────────────────────────────────────────────────── */
function LayoutInner({ children }: { children: React.ReactNode }) {
  const { region } = useRegion();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status", { credentials: "same-origin" })
      .then(r => r.json())
      .then(d => setIsAuthenticated(!!d.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return <AuthOverlay onAuthenticated={() => setIsAuthenticated(true)} />;

  return (
    <IdentityProvider>
      <>
        {/* ── Sidebar — FIXED ───────────────────────────────────── */}
        <aside className="fixed top-0 left-0 h-screen w-[250px] flex flex-col border-r border-white/[0.06] bg-[#0c1322] z-50">
          {/* Brand */}
          <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0">
                <LayoutDashboard size={16} className="text-white drop-shadow" />
              </div>
              <div>
                <p className="text-white font-semibold text-[14px] leading-none tracking-tight">OpsConsole</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium tracking-wide">SRE PLATFORM</p>
              </div>
            </div>
            {/* Workspace switcher in sidebar brand area */}
            <WorkspaceSwitcher />
          </div>

          {/* Region + Environment selectors */}
          <div className="px-3 py-2.5 border-b border-white/[0.06] shrink-0 flex flex-col gap-2">
            <RegionSelector />
            <EnvironmentSwitcher />
          </div>

          {/* Navigation — scrollable independently */}
          <nav className="flex-1 px-2.5 py-3.5 flex flex-col gap-3 overflow-y-auto min-h-0 select-none">
            {/* 1. HOME */}
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                Home
              </p>
              {homeNavItems.map((n) => (
                <NavLink key={n.href} {...n} />
              ))}
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 2. OBSERVE */}
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                Observe
              </p>
              {observeNavItems.map((n) => (
                <NavLink key={n.href} {...n} />
              ))}
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 3. RELIABILITY */}
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                Reliability
              </p>
              {reliabilityNavItems.map((n) => (
                <NavLink key={n.href} {...n} />
              ))}
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 4. CLOUD */}
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                Cloud
              </p>
              {/* Nested Collapsible AWS Module */}
              <AwsCollapsibleNav />

              {/* Direct Cloud Operational Items */}
              <div className="mt-1 flex flex-col gap-0.5">
                {cloudDirectNavItems.map((n) => (
                  <NavLink key={n.href} {...n} />
                ))}
              </div>
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 5. PLATFORM */}
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                Platform
              </p>
              {platformNavItems.map((n) => (
                <NavLink key={n.href} {...n} />
              ))}
            </div>
          </nav>

          {/* Footer — status indicator */}
          <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
              <span className="text-xs text-emerald-400 font-medium">Telemetry Model · {region}</span>
            </div>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────── */}
        <div className="ml-[250px] flex flex-col h-screen w-[calc(100vw-250px)] bg-[#090e1a]">
          {/* Top bar */}
          <header className="h-[52px] shrink-0 border-b border-white/[0.06] bg-[#0c1322]/90 backdrop-blur-md flex items-center px-5 justify-between sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <p className="text-[12px] text-slate-400 font-medium">Cloud Observability & SRE Platform</p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[11px] font-mono text-cyan-400 tracking-wide font-medium">Simulated Telemetry</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono hidden md:block">
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              {/* User menu in top bar */}
              <UserMenu />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-6 overflow-y-auto bg-[#090e1a]">
            <div className="max-w-[1440px] w-full mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </>
    </IdentityProvider>
  );
}
