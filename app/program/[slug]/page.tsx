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
  const [userId, setUserId] = useState<string | null>(null);

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
      setUserId(user.id);

      try {
        const res = await fetch(validPrograms[slug].file);
        let html = await res.text();

        // Fix 1: Sidebar fully opaque background
        html = html.replace(
          '.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5);',
          '.sidebar-overlay { display:none; position:fixed; top:0; right:0; bottom:0; left:268px; background:rgba(0,0,0,.3);'
        );
        html = html.replace(
          /\.sidebar \{([^}]*?)background:var\(--ink\)/,
          '.sidebar {$1background:#1a1f3a'
        );

        // Fix 2: Inject ← Home link pointing to /dashboard
        const homeLink = `<a href="/dashboard" onclick="window.top.location.href='/dashboard';return false;" ontouchend="window.top.location.href='/dashboard';return false;" style="display:block;padding:14px 12px;margin-bottom:12px;border-radius:3px;text-decoration:none;font-size:13px;font-weight:700;color:rgba(255,255,255,0.65);cursor:pointer;touch-action:manipulation;position:relative;z-index:100;-webkit-tap-highlight-color:rgba(255,255,255,0.1);">← Home</a>`;
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

        // Fix 3: Day locking + Part 2 progressive reveal + Part 3 writing box + Part 5 celebration
        const injectedCSS = `
          .day-nav-item.locked { opacity:0.5; cursor:not-allowed; pointer-events:none; }
          .day-nav-item.locked .day-nav-num { opacity:0.4; }
          .day-nav-item.locked .day-nav-title::after { content:' 🔒'; }

          /* Part 2: Progressive reveal with upward drift */
          .writing-prompt { display:none; opacity:0; }
          .writing-prompt.revealed { display:block; animation:revealUp 0.4s ease forwards; }
          .writing-prompt:first-child { display:block; opacity:1; }
          .prompt-next-btn { display:inline-block; margin-top:8px; margin-bottom:4px; background:none; border:none; color:var(--red); font-family:'Codec Pro',sans-serif; font-size:12px; font-weight:700; cursor:pointer; padding:4px 0; letter-spacing:0.04em; }
          .prompt-next-btn:hover { opacity:0.7; }
          @keyframes revealUp { 0% { opacity:0; transform:translateY(8px); } 100% { opacity:1; transform:translateY(0); } }

          /* Part 3: Writing box with smooth expand */
          .writing-area { border:1px solid rgba(26,31,58,0.1) !important; min-height:120px !important; max-height:none !important; transition:border-color 0.2s ease, min-height 0.3s ease; }
          .writing-area.typing { min-height:220px !important; }
          .writing-area:focus { border-color:rgba(26,31,58,0.25) !important; }
          .writing-area.sufficient { border-color:rgba(122,158,126,0.5) !important; }
          .writing-encouragement { font-size:12px; color:var(--sand-mid); margin-top:6px; font-weight:300; transition:opacity 0.3s ease; }

          /* Part 5: Celebration overlay with sequenced animations */
          .celebration-overlay { position:fixed; inset:0; background:#f5f2ef; z-index:1000; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px; opacity:0; pointer-events:none; transition:opacity 0.3s ease; }
          .celebration-overlay.show { opacity:1; pointer-events:auto; }
          .celebration-symbol { font-size:48px; color:var(--red); margin-bottom:20px; opacity:0; transform:scale(0); }
          .celebration-overlay.show .celebration-symbol { animation:celebScale 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
          .celebration-heading { font-family:'Codec Pro',sans-serif; font-size:clamp(28px,5vw,42px); font-weight:700; color:var(--ink); margin-bottom:12px; opacity:0; transform:translateY(12px); }
          .celebration-overlay.show .celebration-heading { animation:celebFadeUp 0.4s ease forwards 0.3s; }
          .celebration-sub { font-size:16px; color:var(--ink-soft); line-height:1.65; max-width:440px; margin-bottom:8px; font-weight:300; opacity:0; transform:translateY(12px); }
          .celebration-overlay.show .celebration-sub { animation:celebFadeUp 0.4s ease forwards 0.5s; }
          .celebration-note { font-size:12px; color:var(--sand-mid); margin-bottom:32px; opacity:0; transform:translateY(12px); }
          .celebration-overlay.show .celebration-note { animation:celebFadeUp 0.4s ease forwards 0.5s; }
          .celebration-btns { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; opacity:0; }
          .celebration-overlay.show .celebration-btns { animation:celebFadeUp 0.4s ease forwards 0.7s; }
          .celebration-btn-outline { padding:14px 28px; border-radius:100px; border:1.5px solid var(--ink); background:none; color:var(--ink); font-family:'Codec Pro',sans-serif; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; }
          .celebration-btn-filled { padding:14px 28px; border-radius:100px; border:none; background:var(--ink); color:var(--cream); font-family:'Codec Pro',sans-serif; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; }
          .celebration-btn-filled.disabled { opacity:0.35; cursor:not-allowed; }
          @keyframes celebScale { 0% { opacity:0; transform:scale(0); } 100% { opacity:1; transform:scale(1); } }
          @keyframes celebFadeUp { 0% { opacity:0; transform:translateY(12px); } 100% { opacity:1; transform:translateY(0); } }
        `;
        html = html.replace('</style>\n</head>', `${injectedCSS}</style>\n</head>`);
        html = html.replace('</style></head>', `${injectedCSS}</style></head>`);

        // Inject celebration overlay div into body
        html = html.replace(
          '<button class="menu-toggle"',
          `<div class="celebration-overlay" id="celebrationOverlay">
            <div class="celebration-symbol">✦</div>
            <div class="celebration-heading" id="celebrationHeading">Day done.</div>
            <div class="celebration-sub" id="celebrationSub"></div>
            <div class="celebration-note">your next day unlocks tomorrow.</div>
            <div class="celebration-btns">
              <a href="/dashboard" onclick="window.top.location.href='/dashboard';return false;" ontouchend="window.top.location.href='/dashboard';return false;" class="celebration-btn-outline" style="cursor:pointer;touch-action:manipulation;">back to dashboard</a>
              <button class="celebration-btn-filled" id="celebrationNextBtn" onclick="closeCelebration()">next day →</button>
            </div>
          </div>
          <button class="menu-toggle"`
        );

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

// Override completeDay to save timestamp + show celebration + notify parent
const _origCompleteDay = completeDay;
completeDay = function(n) {
  _origCompleteDay(n);
  saveCompletionTimestamp(n);
  buildSidebar();
  showCelebration(n);
  // Notify parent to save to Supabase
  window.parent.postMessage({ type: 'dayComplete', day: n }, '*');
};

// Part 5: Celebration overlay
function showCelebration(n) {
  const overlay = document.getElementById('celebrationOverlay');
  const heading = document.getElementById('celebrationHeading');
  const sub = document.getElementById('celebrationSub');
  const nextBtn = document.getElementById('celebrationNextBtn');
  if (!overlay) return;
  heading.textContent = 'Day ' + n + ' done.';
  const messages = {
    1: "You just cleared the mental backlog. That's the hardest part — and you did it. See you tomorrow.",
    14: "You showed up for 14 days. That matters more than you think."
  };
  sub.textContent = messages[n] || "Another day of honest thinking. That compounds. See you tomorrow.";
  if (n < 14 && isDayUnlocked(n + 1)) {
    nextBtn.className = 'celebration-btn-filled';
    nextBtn.onclick = function() { closeCelebration(); showDay(n + 1); };
  } else if (n < 14) {
    nextBtn.className = 'celebration-btn-filled disabled';
    nextBtn.textContent = 'Day ' + (n+1) + ' unlocks tomorrow';
    nextBtn.onclick = null;
  } else {
    nextBtn.textContent = 'see your full journal →';
    nextBtn.className = 'celebration-btn-filled';
    nextBtn.onclick = function() { closeCelebration(); showJournal(); };
  }
  overlay.classList.add('show');
}
function closeCelebration() {
  document.getElementById('celebrationOverlay')?.classList.remove('show');
}

// Part 2: Progressive reveal for sub-prompts
function setupProgressiveReveal() {
  document.querySelectorAll('.writing-prompts').forEach(function(container) {
    const prompts = container.querySelectorAll('.writing-prompt');
    if (prompts.length <= 1) return;
    prompts.forEach(function(p, i) {
      if (i === 0) { p.classList.add('revealed'); return; }
    });
    var revealed = 1;
    function addNextBtn() {
      if (revealed >= prompts.length) return;
      var btn = document.createElement('button');
      btn.className = 'prompt-next-btn';
      btn.textContent = 'next →';
      btn.onclick = function() {
        if (revealed < prompts.length) {
          prompts[revealed].classList.add('revealed');
          revealed++;
          btn.remove();
          if (revealed < prompts.length) addNextBtn();
        }
      };
      prompts[revealed - 1].after(btn);
    }
    addNextBtn();
  });
}

// Part 3: Writing box encouragement
function setupWritingEncouragement() {
  document.querySelectorAll('.writing-area').forEach(function(ta) {
    ta.setAttribute('placeholder', 'start anywhere. there are no wrong answers here.');
    var enc = document.createElement('div');
    enc.className = 'writing-encouragement';
    enc.textContent = 'write freely and at length. use the prompts above as guides — not limits.';
    ta.parentNode.insertBefore(enc, ta.nextSibling);
    ta.addEventListener('input', function() {
      var wc = ta.value.trim().split(/\\s+/).filter(function(w){return w.length>0}).length;
      if (wc > 0) ta.classList.add('typing');
      else ta.classList.remove('typing');
      if (wc === 0) enc.textContent = 'write freely and at length. use the prompts above as guides — not limits.';
      else if (wc <= 30) enc.textContent = 'keep going...';
      else if (wc <= 70) enc.textContent = "you're finding it. stay with it.";
      else if (wc <= 99) enc.textContent = "almost there. don't stop now.";
      else enc.textContent = "you're there. keep going if you want. ✦";
    });
  });
}

// Override init to add progressive reveal + writing encouragement
const _origInit = init;
init = function() {
  _origInit();
  setupProgressiveReveal();
  setupWritingEncouragement();
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

  // Listen for day completion messages from iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "dayComplete" || !userId) return;
      const dayNumber = event.data.day;
      await supabase.from("day_submissions").upsert({
        user_id: userId,
        program_id: slug,
        day_number: dayNumber,
        submitted_at: new Date().toISOString(),
      }, { onConflict: "user_id,program_id,day_number" });
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [userId, slug]);

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
