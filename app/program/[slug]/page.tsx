"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const validPrograms: Record<string, { title: string; file: string }> = {
  fear: { title: "Fear to First Move", file: "/programs/fear.html" },
  ai: { title: "Think Before You Build", file: "/programs/ai.html" },
  overwhelmed: { title: "From Many to One", file: "/programs/overwhelmed.html" },
  blank: { title: "Back to the Well", file: "/programs/blank.html" },
};

export default function ProgramPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [status, setStatus] = useState<"loading" | "authorized" | "not-found">("loading");
  const [htmlContent, setHtmlContent] = useState<string>("");

  useEffect(() => {
    const checkAccess = async () => {
      if (!validPrograms[slug]) {
        setStatus("not-found");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch(validPrograms[slug].file);
        let html = await res.text();

        // Fix 1: Sidebar fully opaque background
        html = html.replace(
          '.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5);',
          '.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.7);'
        );
        html = html.replace(
          /\.sidebar \{([^}]*?)background:var\(--ink\)/,
          '.sidebar {$1background:#000332'
        );

        // Fix 2: Inject ← Home link pointing to /dashboard
        const homeLink = `<a href="/dashboard" style="display:block;padding:10px 9px;margin-bottom:12px;border-radius:3px;text-decoration:none;font-size:12px;font-weight:700;color:rgba(255,255,255,0.55);transition:background .2s;" onmouseover="this.style.background='rgba(242,237,228,.06)'" onmouseout="this.style.background='none'" target="_top">← Home</a>`;
        html = html.replace(
          '.menu-toggle { display:none; position:fixed; top:14px; left:14px;',
          '.menu-toggle { display:none; position:fixed; top:16px; left:16px;'
        );
        html = html.replace(
          ".main { margin-left:0; padding:52px 18px 80px;",
          ".main { margin-left:0; padding:64px 18px 80px;"
        );
        html = html.replace(
          '<div class="sidebar-logo">creative reset club</div>',
          `<div class="sidebar-logo">creative reset club</div>${homeLink}`
        );

        // Fix 3: Day locking — inject CSS + override buildSidebar and showDay with locking logic
        const lockCSS = `
          .day-nav-item.locked { opacity:0.35; cursor:not-allowed; pointer-events:none; }
          .day-nav-item.locked .day-nav-title::after { content:' 🔒'; }
        `;
        html = html.replace('</style>\n</head>', `${lockCSS}</style>\n</head>`);
        // Fallback if newline differs
        html = html.replace('</style></head>', `${lockCSS}</style></head>`);

        // Inject completion timestamps and locking logic before init()
        const lockScript = `
function getCompletionTimestamps() {
  return JSON.parse(localStorage.getItem('crc-timestamps') || '{}');
}
function saveCompletionTimestamp(day) {
  const ts = getCompletionTimestamps();
  if (!ts[day]) {
    ts[day] = new Date().toISOString();
    localStorage.setItem('crc-timestamps', JSON.stringify(ts));
  }
}
function isDayUnlocked(day) {
  if (day === 1) return true;
  const prevDay = day - 1;
  if (!completed.has(prevDay)) return false;
  const ts = getCompletionTimestamps();
  if (!ts[prevDay]) return true; // completed before timestamps existed
  const completedDate = new Date(ts[prevDay]);
  const completedLocal = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return todayLocal > completedLocal;
}

// Override buildSidebar to add lock state
const _origBuildSidebar = buildSidebar;
buildSidebar = function() {
  _origBuildSidebar();
  for (let d = 2; d <= 14; d++) {
    const nav = document.getElementById('nav-' + d);
    if (nav && !isDayUnlocked(d)) {
      nav.classList.add('locked');
    }
  }
};

// Override showDay to prevent showing locked days
const _origShowDay = showDay;
showDay = function(n) {
  if (n > 1 && !isDayUnlocked(n)) return;
  _origShowDay(n);
};

// Override completeDay to save timestamp
const _origCompleteDay = completeDay;
completeDay = function(n) {
  _origCompleteDay(n);
  saveCompletionTimestamp(n);
  // Refresh sidebar lock states
  buildSidebar();
};
`;
        html = html.replace('init();', `${lockScript}\ninit();`);

        setHtmlContent(html);
        setStatus("authorized");
      } catch {
        setStatus("not-found");
      }
    };

    checkAccess();
  }, [slug, router]);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: "100vh", background: "#f4f2ee",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>
          loading...
        </p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div style={{
        minHeight: "100vh", background: "#f4f2ee",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16
      }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "#000332", fontSize: 18 }}>
          program not found.
        </p>
        <a href="/dashboard" style={{
          fontFamily: "'Codec Pro',sans-serif", fontSize: 14, fontWeight: 700,
          color: "#000332", textDecoration: "underline", textUnderlineOffset: 3
        }}>
          ← back to dashboard
        </a>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={htmlContent}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
      title={validPrograms[slug]?.title || "Program"}
    />
  );
}
