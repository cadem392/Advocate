"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { BrandLockup } from "@/components/brand-lockup";

type ActiveItem =
  | "intake"
  | "workspace"
  | "methodology"
  | "evidence"
  | "support"
  | "dashboard";

interface AdvocateNavProps {
  activeItem?: ActiveItem;
  showCaseContext?: boolean;
  caseId?: string;
  patientName?: string;
  homeHref?: string;
  intakeHref?: string;
  workspaceHref?: string;
  methodologyHref?: string;
  evidenceHref?: string;
  supportHref?: string;
  exportHref?: string;
  exportLabel?: string;
}

const activeClass = "text-[#1E3A5F] border-b-2 border-[#1E3A5F] pb-1";
const inactiveClass = "hover:text-[#1B5E3F] transition-colors";

function splitHref(href: string) {
  const [pathWithHash] = href.split("?");
  const [path, hash] = pathWithHash.split("#");
  return {
    path: path || "/",
    hash: hash ? `#${hash}` : "",
  };
}

export function AdvocateNav({
  activeItem,
  showCaseContext = false,
  caseId = "#ADV-2047",
  patientName = "Marina Rodriguez",
  homeHref = "/",
  intakeHref = "/",
  workspaceHref = "/workspace",
  methodologyHref = "/#methodology",
  evidenceHref = "/evidence",
  supportHref = "/#support",
  exportHref = "/confirmation",
  exportLabel = "Export Case Packet",
}: AdvocateNavProps) {
  const pathname = usePathname();

  function handleSameRouteNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    const currentPath = pathname || "/";
    const { path, hash } = splitHref(href);

    if (path !== currentPath) {
      return;
    }

    event.preventDefault();

    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `${currentPath}${hash}`);
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!hash && window.location.hash) {
      window.history.replaceState(null, "", currentPath);
    }
  }

  function renderNavLink(label: ReactNode, href: string, id: string, isActive: boolean) {
    return (
      <Link
        href={href}
        id={id}
        onClick={(event) => handleSameRouteNavigation(event, href)}
        aria-current={isActive ? "page" : undefined}
        className={`${isActive ? activeClass : inactiveClass} relative z-[1] whitespace-nowrap pointer-events-auto`}
      >
        {label}
      </Link>
    );
  }

  return (
    <nav className="sticky top-0 z-[100] isolate border-b border-[#E8E4DF] bg-[#FDFCFB] px-8 py-2 pointer-events-auto">
      <div className="mx-auto flex max-w-[1536px] items-center justify-between gap-8">
        <div className="flex min-w-0 items-center gap-10">
          <Link
            href={homeHref}
            id="nav-logo"
            onClick={(event) => handleSameRouteNavigation(event, homeHref)}
            className="relative z-[1] flex shrink-0 items-center pointer-events-auto"
          >
            <BrandLockup width={560} height={134} priority imageClassName="h-[68px] w-auto" />
          </Link>

          <div className="hidden min-w-0 flex-wrap items-center gap-x-8 gap-y-2 text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] lg:flex">
            {renderNavLink("Intake", intakeHref, "nav-intake", activeItem === "intake")}
            {renderNavLink("Workspace", workspaceHref, "nav-workspace", activeItem === "workspace" || activeItem === "dashboard")}
            {renderNavLink("Methodology", methodologyHref, "nav-methodology", activeItem === "methodology")}
            {renderNavLink("Evidence", evidenceHref, "nav-evidence", activeItem === "evidence")}
            {renderNavLink("Support", supportHref, "nav-support", activeItem === "support")}
          </div>
        </div>

        <div className="flex shrink-0 items-center space-x-4">
          {showCaseContext ? (
            <div className="flex flex-col text-right mr-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Current Case</span>
              <span className="text-xs font-semibold">
                {caseId} | {patientName}
              </span>
            </div>
          ) : null}
          <Link
            href={exportHref}
            id="nav-cta-packet"
            onClick={(event) => handleSameRouteNavigation(event, exportHref)}
            className="relative z-[1] bg-white border border-[#1E3A5F] text-[#1E3A5F] px-4 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-[#F3F3F3] transition-all whitespace-nowrap pointer-events-auto"
          >
            {exportLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}
