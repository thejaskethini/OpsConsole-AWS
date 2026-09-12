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
  Activity, Target, ServerCog, Bell, Cloud, ChevronLeft,
  Sparkles, AlertOctagon,
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
  { href: "/incidents", icon: AlertOctagon, label: "Incidents" },
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
function RegionSelector({ collapsed }: { collapsed?: boolean }) {
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
        title={collapsed ? `AWS Region: ${region}` : undefined}
        className={`flex items-center justify-between w-full rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all text-xs cursor-pointer ${
          collapsed ? "p-2 justify-center" : "px-3 py-1.5"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe size={13} className="text-cyan-400 shrink-0" />
          {!collapsed && (
            <span className="text-slate-300 font-mono text-[11px] truncate">{region}</span>
          )}
        </div>
        {!collapsed && (
          <ChevronDown size={12} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-[#0c1322] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/80 z-[200] overflow-hidden">
          <div className="p-2 border-b border-white/[0.06]">
            <input
              type="text"
              placeholder="Search region…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/40 placeholder:text-slate-500 font-mono"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map(r => (
              <button
                key={r.value}
                onClick={() => { setRegion(r.value); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-cyan-500/[0.08] transition-colors cursor-pointer ${r.value === region ? "bg-cyan-500/[0.12] text-cyan-400 font-semibold" : "text-slate-300"}`}
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-[10px] text-slate-500 font-mono">{r.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Standard Nav Link ───────────────────────────────────────────── */
function NavLink({ href, icon: Icon, label, collapsed }: { href: string; icon: React.ElementType; label: string; collapsed?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
        collapsed ? "justify-center p-2.5" : "px-3 py-2"
      } ${
        isActive
          ? "bg-cyan-500/[0.10] text-white font-semibold"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
      }`}
    >
      <div className={`flex items-center justify-center shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"}`}>
        <Icon size={16} />
      </div>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {isActive && <div className="w-1 h-4 rounded-r-sm bg-cyan-400 absolute left-0" />}
          <ChevronRight size={12} className={`transition-all duration-150 shrink-0 ${isActive ? "opacity-60 text-cyan-400" : "opacity-0 group-hover:opacity-30"}`} />
        </>
      )}

      {/* Tooltip on collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#101a30] text-white text-xs font-medium rounded-md shadow-xl border border-white/[0.08] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </Link>
  );
}

/* ── Collapsible AWS Provider Navigation Tree ─────────────────────── */
function AwsCollapsibleNav({ collapsed }: { collapsed?: boolean }) {
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

  if (collapsed) {
    return (
      <div className="relative group">
        <button
          type="button"
          title="AWS Provider Services"
          className={`flex items-center justify-center w-full p-2.5 rounded-lg text-xs font-medium transition-all ${
            isAwsActive ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:text-amber-400 hover:bg-white/[0.03]"
          }`}
        >
          <Cloud size={16} />
        </button>
        <div className="absolute left-full ml-3 top-0 w-48 bg-[#0c1322] border border-white/[0.08] rounded-xl shadow-2xl p-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-white/[0.04]">
            AWS Provider Layer
          </p>
          {awsCategories.flatMap(c => c.items).slice(0, 8).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                pathname === item.href ? "bg-cyan-500/15 text-cyan-300 font-semibold" : "text-slate-300 hover:bg-white/[0.04]"
              }`}
            >
              <item.icon size={12} className="text-slate-400" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* AWS Group Header Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
          isAwsActive
            ? "bg-white/[0.04] text-white font-semibold"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Cloud size={16} className={`shrink-0 ${isAwsActive ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400"}`} />
          <span className="font-semibold tracking-wide truncate">AWS</span>
          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-white/[0.05] text-slate-400 border border-white/[0.06]">
            Provider
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`text-slate-500 transition-transform duration-150 shrink-0 ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {/* Nested Collapsible Categories */}
      {isOpen && (
        <div className="ml-3 pl-2.5 border-l border-white/[0.08] flex flex-col gap-1 mt-1 mb-1">
          {awsCategories.map((cat) => {
            const hasActiveRoute = cat.items.some(
              (i) => pathname === i.href || pathname.startsWith(i.href + "/")
            );
            const isCatCollapsed = collapsedCategories[cat.key] ?? false;

            return (
              <div key={cat.key} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  className={`flex items-center justify-between px-2 py-1 rounded-md text-[11.5px] font-semibold tracking-wide transition-colors cursor-pointer ${
                    hasActiveRoute
                      ? "text-cyan-300"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <cat.icon size={12} className={hasActiveRoute ? "text-cyan-400" : "text-slate-500"} />
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <ChevronDown
                    size={11}
                    className={`text-slate-500 transition-transform ${!isCatCollapsed ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>

                {!isCatCollapsed && (
                  <div className="ml-2 pl-2 border-l border-white/[0.06] flex flex-col gap-0.5 my-0.5">
                    {cat.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
                            isActive
                              ? "bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400 -ml-[9px] pl-[7px]"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                          }`}
                        >
                          <item.icon size={12} className={isActive ? "text-cyan-400" : "text-slate-500"} />
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
    <div className="fixed inset-0 z-[100] bg-[#070b14] flex items-center justify-center p-6">
      <div className="relative w-full max-w-[400px] bg-[#0c1322] border border-white/[0.08] rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5">
            <Lock size={24} className="text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1.5 tracking-tight font-heading">OpsConsole Access</h2>
          <p className="text-slate-400 text-xs">Unified SRE & Cloud Operations Platform</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className={`w-full bg-white/[0.03] border ${error ? "border-red-500/50" : "border-white/[0.08]"} focus:border-cyan-500/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all placeholder:text-slate-600 font-mono`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {error && (
              <p className="text-[11px] text-red-400 mt-1.5 ml-1 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Access Dashboard"}
          </button>
        </form>
        <div className="mt-8 pt-5 border-t border-white/[0.04] text-center">
          <p className="text-[10.5px] text-slate-500 font-medium tracking-wide uppercase">Unified SRE Operations Platform</p>
        </div>
      </div>
    </div>
  );
}

/* ── Layout Inner ────────────────────────────────────────────────── */
function LayoutInner({ children }: { children: React.ReactNode }) {
  const { region } = useRegion();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/auth/status", { credentials: "same-origin" })
      .then(r => r.json())
      .then(d => setIsAuthenticated(!!d.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return <AuthOverlay onAuthenticated={() => setIsAuthenticated(true)} />;

  const sidebarWidth = isCollapsed ? 68 : 252;

  return (
    <IdentityProvider>
      <div className="flex min-h-screen bg-[#090d16] text-slate-200">
        {/* ── Sidebar — FIXED ───────────────────────────────────── */}
        <aside
          style={{ width: `${sidebarWidth}px` }}
          className="fixed top-0 left-0 h-screen flex flex-col border-r border-white/[0.06] bg-[#0c1220] z-50 transition-all duration-200"
        >
          {/* Brand & Workspace Area */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <LayoutDashboard size={16} className="text-cyan-400" />
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-[13.5px] leading-tight tracking-tight font-heading truncate">
                      OpsConsole
                    </p>
                    <p className="text-[9.5px] text-slate-400 font-mono tracking-wider uppercase">
                      SRE Platform
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar Collapse Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
              >
                <ChevronLeft size={15} className={`transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Workspace switcher */}
            {!isCollapsed && (
              <div className="mt-2.5">
                <WorkspaceSwitcher />
              </div>
            )}
          </div>

          {/* Region + Environment selectors */}
          <div className="px-3 py-2.5 border-b border-white/[0.06] shrink-0 flex flex-col gap-2">
            <RegionSelector collapsed={isCollapsed} />
            {!isCollapsed && <EnvironmentSwitcher />}
          </div>

          {/* Navigation — scrollable independently */}
          <nav className="flex-1 px-2.5 py-3 flex flex-col gap-3.5 overflow-y-auto min-h-0 select-none">
            {/* 1. HOME */}
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                  Home
                </p>
              )}
              {homeNavItems.map((n) => (
                <NavLink key={n.href} {...n} collapsed={isCollapsed} />
              ))}
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 2. OBSERVE */}
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                  Observe
                </p>
              )}
              {observeNavItems.map((n) => (
                <NavLink key={n.href} {...n} collapsed={isCollapsed} />
              ))}
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 3. RELIABILITY */}
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                  Reliability
                </p>
              )}
              {reliabilityNavItems.map((n) => (
                <NavLink key={n.href} {...n} collapsed={isCollapsed} />
              ))}
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 4. CLOUD */}
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                  Cloud
                </p>
              )}
              {/* Nested Collapsible AWS Module */}
              <AwsCollapsibleNav collapsed={isCollapsed} />

              {/* Direct Cloud Operational Items */}
              <div className="mt-1 flex flex-col gap-0.5">
                {cloudDirectNavItems.map((n) => (
                  <NavLink key={n.href} {...n} collapsed={isCollapsed} />
                ))}
              </div>
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* 5. PLATFORM */}
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1">
                  Platform
                </p>
              )}
              {platformNavItems.map((n) => (
                <NavLink key={n.href} {...n} collapsed={isCollapsed} />
              ))}
            </div>
          </nav>

          {/* Footer — Status indicators with generous bottom padding */}
          <div className="px-3.5 py-3 border-t border-white/[0.06] shrink-0 pb-8 bg-[#090d16]/60 backdrop-blur-sm">
            {isCollapsed ? (
              <div className="flex justify-center py-1" title={`AWS Connected (${region}) · Simulated SRE`}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse-subtle" />
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse-subtle" />
                    AWS Connected
                  </span>
                  <span className="font-mono text-[11px] text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">{region}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
                  <span>SRE Telemetry</span>
                  <span className="text-violet-300 font-semibold bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">SIMULATED</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────── */}
        <div
          style={{ marginLeft: `${sidebarWidth}px`, width: `calc(100vw - ${sidebarWidth}px)` }}
          className="flex flex-col min-h-screen bg-[#090d16] transition-all duration-200"
        >
          {/* Top Bar */}
          <header className="h-[52px] shrink-0 border-b border-white/[0.06] bg-[#0c1220]/90 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span className="text-slate-200 font-semibold">OpsConsole</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">Unified SRE Operations Platform</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Telemetry Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-[11px] font-mono text-violet-300">
                <Sparkles size={11} className="text-violet-400" />
                <span>SIMULATED SRE</span>
              </div>

              {/* AWS Substrate Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>AWS CONNECTED</span>
              </div>

              {/* User menu in top bar */}
              <UserMenu />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-[#090d16]">
            <div className="max-w-[1536px] w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </IdentityProvider>
  );
}
