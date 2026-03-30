"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const validPrograms: Record<string, { title: string; file: string }> = {
  empty_the_head: { title: "Empty the Head", file: "/programs/empty_the_head.html" },
  make_it_yours: { title: "Make It Yours", file: "/programs/make_it_yours.html" },
  reignite: { title: "Reignite", file: "/programs/reignite.html" },
  refill: { title: "Refill", file: "/programs/refill.html" },
  move_it_forward: { title: "Move It Forward", file: "/programs/move_it_forward.html" },
  one_thing: { title: "One Thing at a Time", file: "/programs/one_thing.html" },
};

export default function ProgramPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [status, setStatus] = useState<"loading" | "accountability" | "authorized" | "not-found">("loading");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [accountabilityName, setAccountabilityName] = useState("");
  const [accountabilityChecked, setAccountabilityChecked] = useState(false);

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

      // Check if accountability screen has been shown for this track
      const { data: accRecord } = await supabase
        .from("day_submissions")
        .select("submitted_at")
        .eq("user_id", user.id)
        .eq("program_id", slug)
        .eq("day_number", 0)
        .maybeSingle();

      if (!accRecord) {
        setStatus("accountability");
        return;
      }

      try {
        const res = await fetch(validPrograms[slug].file);
        let html = await res.text();

        // Fix 0: Scope all localStorage keys by userId to prevent cross-user data bleed
        const uid = user.id;
        // Track-specific prefixes used in HTML files
        html = html.replaceAll("'crc-ri'", `'crc-${uid}-ri'`);
        html = html.replaceAll("'crc-ri-", `'crc-${uid}-ri-`);
        html = html.replaceAll("`crc-ri-", `\`crc-${uid}-ri-`);
        html = html.replaceAll("'crc-mif'", `'crc-${uid}-mif'`);
        html = html.replaceAll("'crc-mif-", `'crc-${uid}-mif-`);
        html = html.replaceAll("`crc-mif-", `\`crc-${uid}-mif-`);
        html = html.replaceAll("'crc-ot'", `'crc-${uid}-ot'`);
        html = html.replaceAll("'crc-ot-", `'crc-${uid}-ot-`);
        html = html.replaceAll("`crc-ot-", `\`crc-${uid}-ot-`);
        html = html.replaceAll("'crc-rf'", `'crc-${uid}-rf'`);
        html = html.replaceAll("'crc-rf-", `'crc-${uid}-rf-`);
        html = html.replaceAll("`crc-rf-", `\`crc-${uid}-rf-`);
        html = html.replaceAll("'crc-miy'", `'crc-${uid}-miy'`);
        html = html.replaceAll("'crc-miy-", `'crc-${uid}-miy-`);
        html = html.replaceAll("`crc-miy-", `\`crc-${uid}-miy-`);
        html = html.replaceAll("'crc-eth'", `'crc-${uid}-eth'`);
        html = html.replaceAll("'crc-eth-", `'crc-${uid}-eth-`);
        html = html.replaceAll("`crc-eth-", `\`crc-${uid}-eth-`);

        // Fix 1: Sidebar fully opaque background
        html = html.replace(
          '.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5);',
          '.sidebar-overlay { display:none; position:fixed; top:0; right:0; bottom:0; left:268px; background:rgba(0,0,0,.3);'
        );
        html = html.replace(
          /\.sidebar \{([^}]*?)background:var\(--ink\)/,
          '.sidebar {$1background:#000332'
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
          `<div class="sidebar-logo">creative reset club</div>${homeLink}<button class="sidebar-toggle" id="sidebarCollapseBtn" onclick="toggleSidebarCollapse()"><span>‹</span></button>`
        );

        // Fix 3: Day locking + Part 2 progressive reveal + Part 3 writing box + Part 5 celebration
        const injectedCSS = `
          /* Sidebar collapse toggle */
          .sidebar { transition:width 0.3s ease, padding 0.3s ease; }
          .sidebar-toggle { position:absolute; top:28px; right:12px; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.1); border:1.5px solid rgba(255,255,255,0.2); color:#FAF7F0; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:60; }
          .sidebar-toggle:hover { background:#FF9090; border-color:#FF9090; }
          .sidebar-toggle span { display:block; transition:transform 0.3s; }
          .sidebar.collapsed { width:0; padding:0; overflow:hidden; min-width:0; }
          .sidebar.collapsed * { visibility:hidden; }
          .sidebar.collapsed .sidebar-toggle { visibility:visible; position:fixed; top:28px; left:8px; right:auto; }
          .sidebar.collapsed .sidebar-toggle span { transform:rotate(180deg); }
          .app .main { transition:margin-left 0.3s ease, max-width 0.3s ease; }
          .sidebar.collapsed ~ .main { margin-left:40px; max-width:calc(100% - 40px); }
          @media(max-width:768px) { .sidebar-toggle { display:none; } }

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
          .writing-area { border:1px solid rgba(0,3,50,0.1) !important; min-height:120px !important; max-height:none !important; transition:border-color 0.2s ease, min-height 0.3s ease; }
          .writing-area.typing { min-height:220px !important; }
          .writing-area:focus { border-color:rgba(0,3,50,0.25) !important; }
          .writing-area.sufficient { border-color:rgba(122,158,126,0.5) !important; }
          .writing-encouragement { font-size:12px; color:var(--sand-mid); margin-top:6px; font-weight:300; transition:opacity 0.3s ease; }

          /* Part 5: Celebration overlay with sequenced animations */
          .celebration-overlay { position:fixed; inset:0; background:#FAF7F0; z-index:1000; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px; opacity:0; pointer-events:none; transition:opacity 0.3s ease; }
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

          /* Voice recording section */
          .voice-section { margin-top:32px; padding-top:28px; border-top:none; }
          .voice-section.hidden { display:none; }
          .voice-label { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--red); margin-bottom:8px; }
          .voice-heading { font-family:'Codec Pro',sans-serif; font-size:20px; color:var(--ink); margin-bottom:6px; font-weight:700; }
          .voice-sub { font-size:14px; color:var(--ink-soft); line-height:1.6; margin-bottom:24px; font-weight:300; }
          .voice-controls { display:flex; flex-direction:column; align-items:center; gap:14px; margin-bottom:16px; }
          .record-btn { width:64px; height:64px; border-radius:50%; background:var(--ink); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
          .record-btn:hover { transform:scale(1.05); }
          .record-btn.recording { animation:pulse 1.5s ease infinite; }
          @keyframes pulse { 0%,100% { box-shadow:0 0 0 0 rgba(255,144,144,0.4); } 50% { box-shadow:0 0 0 12px rgba(255,144,144,0); } }
          .record-btn svg { width:24px; height:24px; }
          .voice-timer { font-size:18px; font-weight:700; color:var(--ink); font-family:'Codec Pro',sans-serif; }
          .voice-bars { display:flex; gap:3px; align-items:center; height:28px; }
          .voice-bar { width:3px; background:var(--red); border-radius:2px; transition:height 0.1s ease; }
          .voice-error { font-size:13px; color:var(--red); text-align:center; margin-top:8px; }
          .voice-skip { font-size:12px; color:var(--sand-mid); text-align:center; cursor:pointer; background:none; border:none; font-family:'Codec Pro',sans-serif; text-decoration:underline; text-underline-offset:3px; }
          .voice-transcript-card { background:var(--ice); border-radius:12px; padding:20px 24px; margin-top:16px; }
          .voice-transcript-label { font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--red); margin-bottom:8px; }
          .voice-transcript-text { font-size:14px; color:var(--ink); line-height:1.7; font-weight:300; }
          .voice-rerecord { font-size:12px; color:var(--sand-mid); cursor:pointer; background:none; border:none; font-family:'Codec Pro',sans-serif; text-decoration:underline; text-underline-offset:3px; margin-top:10px; display:block; text-align:center; }
          .voice-privacy { font-size:11px; color:var(--sand-mid); text-align:center; margin-top:12px; font-weight:300; }
          .voice-status { font-size:13px; color:var(--sand-mid); text-align:center; margin-top:12px; opacity:0; animation:fadeStatus 0.3s ease forwards; }
          .voice-status.visible { opacity:1; }
          @keyframes fadeStatus { from { opacity:0; } to { opacity:1; } }
          .voice-retry { font-size:12px; color:var(--red); cursor:pointer; background:none; border:none; font-family:'Codec Pro',sans-serif; text-decoration:underline; text-underline-offset:3px; margin-top:8px; display:block; text-align:center; }
          .voice-player { margin-top:12px; }
          .voice-player audio { width:100%; height:36px; border-radius:8px; }
          .voice-skipped-note { font-size:13px; color:var(--sand-mid); font-style:italic; font-weight:300; margin-top:8px; }
          .voice-playback-collapsed { margin-top:8px; }
          .voice-playback-collapsed audio { width:100%; height:32px; border-radius:6px; }

          /* Voice consent modal */
          .voice-consent-modal { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:999; display:flex; align-items:center; justify-content:center; padding:24px; }
          .voice-consent-card { background:var(--cream); border-radius:20px; padding:36px 40px; max-width:440px; width:100%; }
          .voice-consent-title { font-family:'Codec Pro',sans-serif; font-size:22px; font-weight:700; color:var(--ink); margin-bottom:12px; }
          .voice-consent-body { font-size:14px; color:var(--ink-soft); line-height:1.7; margin-bottom:24px; font-weight:300; }
          .voice-consent-btns { display:flex; gap:10px; flex-wrap:wrap; }
          .voice-consent-accept { padding:12px 24px; border-radius:100px; border:none; background:var(--ink); color:var(--cream); font-family:'Codec Pro',sans-serif; font-size:13px; font-weight:700; cursor:pointer; }
          .voice-consent-skip { padding:12px 24px; border-radius:100px; border:1.5px solid var(--ink); background:none; color:var(--ink); font-family:'Codec Pro',sans-serif; font-size:13px; font-weight:700; cursor:pointer; }

          /* Settle In */
          .settle-wrap { background:#FAF7F0; padding:72px 24px 64px; display:flex; flex-direction:column; align-items:center; text-align:center; position:relative; margin-bottom:32px; border-bottom:1px solid rgba(0,3,50,0.06); }
          .settle-label { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:rgba(0,3,50,0.35); margin-bottom:12px; font-weight:500; }
          .day-header-fixed { margin-bottom:0; }
          .settle-collapsed-header { display:none; padding:16px 0; border-bottom:1px solid rgba(0,3,50,0.06); cursor:pointer; margin-bottom:24px; }
          .settle-collapsed-header.show { display:flex; align-items:center; justify-content:space-between; }
          .settle-collapsed-label { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:rgba(0,3,50,0.3); font-weight:500; }
          .settle-collapsed-chevron { font-size:12px; color:rgba(0,3,50,0.25); transition:transform 0.2s; }
          .settle-collapsed-header.expanded .settle-collapsed-chevron { transform:rotate(180deg); }
          .settle-wrap.settled-done { display:none; }
          .settle-wrap.settled-done.settled-expanded { display:flex; }
          .settle-content { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:180px; gap:16px; }
          .settle-text { font-family:'Codec Pro',sans-serif; font-size:17px; color:#000332; opacity:.6; font-weight:300; line-height:1.7; }
          .settle-text-small { font-family:'Codec Pro',sans-serif; font-size:13px; color:#000332; opacity:.35; font-weight:300; line-height:1.7; }
          .settle-text-large { font-family:'Codec Pro',sans-serif; font-size:clamp(48px,10vw,80px); color:#000332; font-weight:300; line-height:1; }
          .settle-line-item { font-family:'Codec Pro',sans-serif; font-size:16px; color:#000332; opacity:0; font-weight:300; line-height:1.8; animation:settleFadeIn 0.5s ease forwards; }
          .settle-continue { margin-top:28px; background:#000332; color:#FAF7F0; border:none; padding:13px 28px; border-radius:100px; font-family:'Codec Pro',sans-serif; font-size:13px; font-weight:700; cursor:pointer; letter-spacing:.02em; transition:opacity .2s; }
          .settle-continue:hover { opacity:.8; }
          .settle-circle { border-radius:50%; background:#FF9090; }
          .settle-dot { width:10px; height:10px; border-radius:50%; background:#FF9090; }
          .settle-ring { border-radius:50%; border:1.5px solid #FF9090; position:absolute; }
          .settle-horizon { height:1.5px; background:#000332; border-radius:1px; }
          .settle-tab { background:#000332; color:#FAF7F0; font-family:'Codec Pro',sans-serif; font-size:11px; padding:8px 16px; border-radius:6px; font-weight:400; }
          @keyframes settleFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
          @keyframes settleBreathIn { 0%,100% { width:60px; height:60px; opacity:.7; } 50% { width:120px; height:120px; opacity:1; } }
          @keyframes settlePulse { 0%,100% { transform:scale(1); opacity:.6; } 50% { transform:scale(1.4); opacity:1; } }
          @keyframes settleSlowBlink { 0%,100% { opacity:1; } 50% { opacity:.08; } }
          @keyframes settleRipple { 0% { width:10px; height:10px; opacity:.6; } 100% { width:120px; height:120px; opacity:0; } }
          @keyframes settleChordRing { 0% { width:14px; height:14px; opacity:.5; } 100% { width:100px; height:100px; opacity:0; } }

          /* Progressive Steps */
          .pstep { display:none; }
          .pstep.pstep-active { display:block; animation:pstepReveal 0.6s ease forwards; }
          .pstep.pstep-done { display:block; }
          @keyframes pstepReveal { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
          .pstep-collapsed { padding:14px 0; border-bottom:1px solid rgba(0,3,50,0.06); cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
          .pstep-collapsed-label { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:rgba(0,3,50,0.3); font-weight:500; }
          .pstep-collapsed-chevron { font-size:12px; color:rgba(0,3,50,0.25); transition:transform 0.2s; }
          .pstep-collapsed.expanded .pstep-collapsed-chevron { transform:rotate(180deg); }
          .pstep-done > .pstep-collapsed + .pstep-body { display:none; }
          .pstep-done.pstep-expanded > .pstep-collapsed + .pstep-body { display:block; }
          .section-label::after { display:none; }

          /* Keep Going AI */
          .kg-loading { display:flex; align-items:center; gap:10px; padding:20px 0; }
          .kg-loading-dots { display:flex; gap:4px; }
          .kg-loading-dot { width:5px; height:5px; border-radius:50%; background:var(--red); animation:kgPulse 1.4s ease infinite; }
          .kg-loading-dot:nth-child(2) { animation-delay:.2s; }
          .kg-loading-dot:nth-child(3) { animation-delay:.4s; }
          @keyframes kgPulse { 0%,80%,100% { opacity:.3; transform:scale(.8); } 40% { opacity:1; transform:scale(1); } }
          .kg-loading-text { font-size:13px; color:var(--sand-mid); font-weight:300; }
          .kg-ai-question { animation:pstepReveal 0.6s ease forwards; }
          .kg-response-area { width:100%; min-height:120px; padding:16px 18px; border:1px solid rgba(0,3,50,0.1); border-radius:3px; background:transparent; font-family:'Codec Pro',sans-serif; font-size:14px; line-height:1.8; color:var(--ink); resize:vertical; outline:none; transition:border-color .2s; margin-top:16px; }
          .kg-response-area::placeholder { color:var(--sand-mid); font-style:normal; font-size:13px; }
          .kg-response-area:focus { border-color:rgba(0,3,50,0.25); }
          .pstep-body { padding-top:8px; }
          .pstep[data-step="1"] .pstep-body { padding-top:32px; }
          .pstep[data-step="1"] .section { margin-bottom:0; }
          .pstep[data-step="1"] .question-text { margin-bottom:20px; }
          .pstep[data-step="1"] .writing-prompts { margin-bottom:24px; }
          .pstep[data-step="1"] .writing-area { margin-bottom:12px; }
          .pstep[data-step="1"] .char-counter { margin-bottom:8px; }
          .pstep-continue { display:inline-block; margin-top:32px; background:#000332; color:#FAF7F0; border:none; padding:13px 28px; border-radius:100px; font-family:'Codec Pro',sans-serif; font-size:13px; font-weight:700; cursor:pointer; letter-spacing:.02em; transition:opacity .2s; }
          .pstep-continue:hover { opacity:.8; }
          .pstep-continue:disabled { opacity:.35; cursor:not-allowed; }
          .pstep-voice-done { font-size:12px; color:rgba(0,3,50,0.35); font-weight:300; margin-top:8px; }
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
var CRC_UID = '${user.id}';
function getCompletionTimestamps() {
  return JSON.parse(localStorage.getItem('crc-' + CRC_UID + '-timestamps') || '{}');
}
function saveCompletionTimestamp(day) {
  const ts = getCompletionTimestamps();
  if (!ts[day]) {
    ts[day] = new Date().toISOString();
    localStorage.setItem('crc-' + CRC_UID + '-timestamps', JSON.stringify(ts));
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
// Part 6: Voice recording
var voiceConsent = null; // null = unknown, true = yes, false = skip

function setupVoiceSections() {
  document.querySelectorAll('.day-view').forEach(function(dayView) {
    var dayId = dayView.id.replace('day-','');
    if (dayView.querySelector('.voice-section')) return;
    var section = document.createElement('div');
    section.className = 'voice-section';
    section.id = 'voice-' + dayId;
    section.innerHTML = '<div class="voice-label">voice reflection</div>' +
      '<div class="voice-heading">Now say it out loud.</div>' +
      '<div class="voice-sub">You have 1 minute. Don\\'t read back what you wrote — just talk. What did you actually just discover?</div>' +
      '<div class="voice-controls" id="vc-' + dayId + '">' +
        '<button class="record-btn" id="rec-' + dayId + '" onclick="toggleRecording(' + dayId + ')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#ff9090" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' +
        '</button>' +
        '<div class="voice-timer" id="timer-' + dayId + '">1:00</div>' +
        '<div class="voice-bars" id="bars-' + dayId + '" style="display:none">' +
          '<div class="voice-bar" style="height:8px"></div><div class="voice-bar" style="height:12px"></div>' +
          '<div class="voice-bar" style="height:6px"></div><div class="voice-bar" style="height:14px"></div>' +
          '<div class="voice-bar" style="height:10px"></div><div class="voice-bar" style="height:8px"></div>' +
          '<div class="voice-bar" style="height:12px"></div>' +
        '</div>' +
      '</div>' +
      '' +
      '<div class="voice-privacy">Your voice note is saved privately to your account. Only you can access it.</div>' +
      '<div id="vresult-' + dayId + '"></div>';
    var sections = dayView.querySelectorAll('.section');
    // Insert after the first .section (writing box), before the second (reflection)
    if (sections.length >= 2) dayView.insertBefore(section, sections[1]);
    else if (sections.length === 1) sections[0].after(section);
    else dayView.appendChild(section);
  });
  if (voiceConsent === false) {
    document.querySelectorAll('.voice-section').forEach(function(s) { s.classList.add('hidden'); });
  }
}

var recorders = {};
var recChunks = {};
var recTimers = {};
var recIntervals = {};
var voiceUrlCache = {};

function toggleRecording(day) {
  if (voiceConsent === null) {
    showVoiceConsent(day);
    return;
  }
  if (voiceConsent === false) return;
  if (recorders[day] && recorders[day].state === 'recording') {
    stopRecording(day);
  } else {
    startRecording(day);
  }
}

function showVoiceConsent(pendingDay) {
  var modal = document.createElement('div');
  modal.className = 'voice-consent-modal';
  modal.id = 'voiceConsentModal';
  modal.innerHTML = '<div class="voice-consent-card">' +
    '<div class="voice-consent-title">Before you record</div>' +
    '<div class="voice-consent-body">Your voice note will be saved privately to your account. It may be used in anonymised form to improve Creative Reset Club. You can delete your recordings at any time from your profile.</div>' +
    '<div class="voice-consent-btns">' +
      '<button class="voice-consent-accept" onclick="acceptVoiceConsent(' + pendingDay + ')">Got it, let\\'s go</button>' +
      '<button class="voice-consent-skip" onclick="declineVoiceConsent()">Skip voice notes</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(modal);
}

function acceptVoiceConsent(pendingDay) {
  voiceConsent = true;
  document.getElementById('voiceConsentModal')?.remove();
  window.parent.postMessage({ type: 'saveVoiceConsent', consent: true }, '*');
  startRecording(pendingDay);
}

function declineVoiceConsent() {
  voiceConsent = false;
  document.getElementById('voiceConsentModal')?.remove();
  window.parent.postMessage({ type: 'saveVoiceConsent', consent: false }, '*');
  document.querySelectorAll('.voice-section').forEach(function(s) { s.classList.add('hidden'); });
}


async function startRecording(day) {
  try {
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    var recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    recorders[day] = recorder;
    recChunks[day] = [];
    recorder.ondataavailable = function(e) { if (e.data.size > 0) recChunks[day].push(e.data); };
    recorder.onstop = function() {
      stream.getTracks().forEach(function(t) { t.stop(); });
      onRecordingDone(day);
    };
    recorder.start();
    var btn = document.getElementById('rec-' + day);
    if (btn) btn.classList.add('recording');
    document.getElementById('bars-' + day).style.display = 'flex';
    startTimer(day, 60);
    startWaveform(day);
  } catch(e) {
    var vc = document.getElementById('vc-' + day);
    if (vc) {
      var err = document.createElement('div');
      err.className = 'voice-error';
      err.textContent = 'We need microphone access for this exercise. You can skip it if you prefer.';
      vc.appendChild(err);
    }
  }
}

function stopRecording(day) {
  if (recorders[day] && recorders[day].state === 'recording') {
    recorders[day].stop();
  }
  clearInterval(recTimers[day]);
  clearInterval(recIntervals[day]);
  var btn = document.getElementById('rec-' + day);
  if (btn) btn.classList.remove('recording');
  document.getElementById('bars-' + day).style.display = 'none';
}

function startTimer(day, seconds) {
  var remaining = seconds;
  var timerEl = document.getElementById('timer-' + day);
  recTimers[day] = setInterval(function() {
    remaining--;
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    if (timerEl) timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    if (remaining <= 0) stopRecording(day);
  }, 1000);
}

function startWaveform(day) {
  var bars = document.getElementById('bars-' + day)?.children;
  if (!bars) return;
  recIntervals[day] = setInterval(function() {
    for (var i = 0; i < bars.length; i++) {
      bars[i].style.height = (4 + Math.random() * 20) + 'px';
    }
  }, 150);
}

function setVoiceStatus(day, text) {
  var result = document.getElementById('vresult-' + day);
  if (!result) return;
  // Don't overwrite if transcript or player already rendered
  if (result.querySelector('.voice-transcript-card') || result.querySelector('.voice-player')) return;
  result.innerHTML = '<div class="voice-status visible">' + text + '</div>';
}

function onRecordingDone(day) {
  var blob = new Blob(recChunks[day], { type: 'audio/webm' });
  console.log('1. Recording stopped, blob size:', blob.size);
  // Show the continue button now that recording is done
  var vcBtn = document.getElementById('pstep-voice-btn-' + day);
  if (vcBtn) vcBtn.style.display = '';
  setVoiceStatus(day, 'saving your voice note...');
  var reader = new FileReader();
  reader.onloadend = function() {
    var base64 = reader.result.split(',')[1];
    console.log('2. Base64 encoded, length:', base64.length, '— sending to parent...');
    window.parent.postMessage({ type: 'uploadVoiceNote', dayNumber: day, audioBase64: base64 }, '*');
  };
  reader.readAsDataURL(blob);
}

window.addEventListener('message', function(event) {
  if (event.data?.type === 'voiceConsentStatus') {
    voiceConsent = event.data.consent;
    if (voiceConsent === false) {
      document.querySelectorAll('.voice-section').forEach(function(s) { s.classList.add('hidden'); });
    }
  }
  if (event.data?.type === 'voiceConsentSaved') {
    voiceConsent = event.data.consent;
  }
  if (event.data?.type === 'voiceProgress') {
    setVoiceStatus(event.data.dayNumber, event.data.status);
  }
  if (event.data?.type === 'voiceNoteResult') {
    var day = event.data.dayNumber;
    var result = document.getElementById('vresult-' + day);
    if (!result) return;
    var voiceUrl = event.data.url || '';
    if (voiceUrl) voiceUrlCache[day] = voiceUrl;
    var playerHtml = voiceUrl ? '<div class="voice-player"><audio controls src="' + voiceUrl + '"></audio></div>' : '';
    if (event.data.transcript) {
      result.innerHTML = '<div class="voice-transcript-card">' +
        '<div class="voice-transcript-label">what you said:</div>' +
        '<div class="voice-transcript-text">' + event.data.transcript + '</div>' +
      '</div>' + playerHtml +
      '<button class="voice-rerecord" onclick="reRecord(' + day + ')">re-record</button>';
    } else {
      result.innerHTML = (voiceUrl ? '<div class="voice-status visible">your voice note is saved.</div>' : '<div class="voice-status visible">transcription unavailable.</div>') +
        playerHtml +
        (voiceUrl ? '<button class="voice-retry" onclick="retryTranscription(' + day + ',\\'' + voiceUrl + '\\')">retry transcription</button>' : '') +
        '<button class="voice-rerecord" onclick="reRecord(' + day + ')">re-record</button>';
    }
  }
});

function retryTranscription(day, voiceUrl) {
  setVoiceStatus(day, 'retrying transcription...');
  window.parent.postMessage({ type: 'retryTranscription', dayNumber: day, voiceUrl: voiceUrl }, '*');
}

function reRecord(day) {
  document.getElementById('vresult-' + day).innerHTML = '';
  document.getElementById('timer-' + day).textContent = '1:00';
}

// ── SIDEBAR COLLAPSE ──
function toggleSidebarCollapse() {
  var sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('collapsed');
}

// ── KEEP GOING AI ──
var kgCache = {}; // dayNum -> { question, fallback }

function generateKeepGoing(dayNum) {
  console.log('[KG] 1. generateKeepGoing called for day', dayNum);
  if (kgCache[dayNum] && kgCache[dayNum].question) {
    console.log('[KG] 1a. Cache hit, using cached question');
    renderKeepGoingQuestion(dayNum, kgCache[dayNum].question);
    return;
  }
  var ta = document.getElementById('write-' + dayNum);
  var writing = ta ? ta.value : '';
  console.log('[KG] 2. Writing length:', writing.length, 'chars');
  var kgContainer = document.getElementById('kg-content-' + dayNum);
  if (!kgContainer) { console.log('[KG] 2a. ERROR: kg-content-' + dayNum + ' not found'); return; }

  // Show loading
  kgContainer.innerHTML = '<div class="kg-loading"><div class="kg-loading-dots"><div class="kg-loading-dot"></div><div class="kg-loading-dot"></div><div class="kg-loading-dot"></div></div><div class="kg-loading-text">thinking...</div></div>';

  console.log('[KG] 3. Sending postMessage to parent: generateKeepGoing');
  window.parent.postMessage({ type: 'generateKeepGoing', day: dayNum, writing: writing }, '*');
}

function renderKeepGoingQuestion(dayNum, question) {
  var kgContainer = document.getElementById('kg-content-' + dayNum);
  if (!kgContainer) return;
  kgCache[dayNum] = kgCache[dayNum] || {};
  kgCache[dayNum].question = question;

  var savedResponse = localStorage.getItem('crc-' + CRC_UID + '-kg-response-' + dayNum) || '';
  kgContainer.innerHTML = '<div class="kg-ai-question"><div class="question-text">"' + question.replace(/"/g, '') + '"</div></div>' +
    '<textarea class="kg-response-area" id="kg-response-' + dayNum + '" placeholder="write here if you want to. this is optional." oninput="saveKgResponse(' + dayNum + ')">' + savedResponse + '</textarea>';
}

function renderKeepGoingFallback(dayNum) {
  var kgContainer = document.getElementById('kg-content-' + dayNum);
  if (!kgContainer) return;
  var fallback = kgCache[dayNum] && kgCache[dayNum].fallback ? kgCache[dayNum].fallback : '';
  if (fallback) {
    kgContainer.innerHTML = '<div class="question-text">"' + fallback + '"</div>';
  }
}

function saveKgResponse(dayNum) {
  var ta = document.getElementById('kg-response-' + dayNum);
  if (ta) {
    localStorage.setItem('crc-' + CRC_UID + '-kg-response-' + dayNum, ta.value);
    window.parent.postMessage({ type: 'saveKeepGoing', day: dayNum, response: ta.value, question: (kgCache[dayNum] && kgCache[dayNum].question) || '' }, '*');
  }
}

// Listen for AI response and voice URL from parent
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'existingVoiceUrl') {
    var dayNum = event.data.dayNumber;
    if (event.data.url) {
      voiceUrlCache[dayNum] = event.data.url;
    }
  }
  if (event.data && event.data.type === 'keepGoingResult') {
    var dayNum = event.data.dayNumber;
    console.log('[KG] 6. iframe received keepGoingResult for day', dayNum, 'question:', event.data.question ? event.data.question.substring(0,50) + '...' : 'NULL');
    if (event.data.question) {
      renderKeepGoingQuestion(dayNum, event.data.question);
    } else {
      console.log('[KG] 6a. Falling back to static copy');
      renderKeepGoingFallback(dayNum);
    }
  }
});

// ── PROGRESSIVE STEPS ──
var pstepState = {}; // dayNum -> current step index

function setupProgressiveSteps() {
  document.querySelectorAll('.day-view').forEach(function(dayView) {
    var dayNum = parseInt(dayView.id.replace('day-',''));
    if (isNaN(dayNum)) return;
    var contentWrap = document.getElementById('day-content-' + dayNum);
    if (!contentWrap) return;

    // Gather elements in order
    var header = contentWrap.querySelector('.day-header');
    var uts = contentWrap.querySelector('.uts-section');
    var sections = contentWrap.querySelectorAll('.section');
    var voice = contentWrap.querySelector('.voice-section');
    var completeRow = contentWrap.querySelector('.complete-row');

    // sections[0]=start here, sections[1]=keep going, sections[2]=notice this, sections[3]=micro-action
    var startHere = sections[0] || null;
    var keepGoing = sections[1] || null;
    var noticeThis = sections[2] || null;
    var microAction = sections[3] || null;

    // Build 5 step wrappers
    var steps = [];

    // Step 1: Under the Surface (header + uts)
    var s1 = document.createElement('div');
    s1.className = 'pstep';
    s1.setAttribute('data-step','0');
    s1.setAttribute('data-label','under the surface');
    var s1body = document.createElement('div');
    s1body.className = 'pstep-body';
    if (header) s1body.appendChild(header);
    if (uts) { uts.setAttribute('open',''); s1body.appendChild(uts); }
    var s1btn = document.createElement('button');
    s1btn.className = 'pstep-continue';
    s1btn.textContent = 'continue';
    s1body.appendChild(s1btn);
    s1.appendChild(s1body);
    steps.push(s1);

    // Step 2: Start Here (writing)
    var s2 = document.createElement('div');
    s2.className = 'pstep';
    s2.setAttribute('data-step','1');
    s2.setAttribute('data-label','start here');
    var s2body = document.createElement('div');
    s2body.className = 'pstep-body';
    if (startHere) s2body.appendChild(startHere);
    var s2btn = document.createElement('button');
    s2btn.className = 'pstep-continue';
    s2btn.id = 'pstep-write-btn-' + dayNum;
    s2btn.textContent = 'continue';
    s2btn.disabled = true;
    s2body.appendChild(s2btn);
    s2.appendChild(s2body);
    steps.push(s2);

    // Step 3: Keep Going (AI-generated) + Notice This
    var s3 = document.createElement('div');
    s3.className = 'pstep';
    s3.setAttribute('data-step','2');
    s3.setAttribute('data-label','keep going');
    var s3body = document.createElement('div');
    s3body.className = 'pstep-body';
    // Store fallback text from static Keep Going and replace with dynamic container
    var kgFallbackText = '';
    if (keepGoing) {
      var kgQ = keepGoing.querySelector('.question-text');
      if (kgQ) kgFallbackText = kgQ.textContent.replace(/^"|"$/g, '');
    }
    kgCache[dayNum] = { question: null, fallback: kgFallbackText };
    // Keep the section label from the original keepGoing
    if (keepGoing) {
      var kgLabel = keepGoing.querySelector('.section-label');
      if (kgLabel) s3body.appendChild(kgLabel);
    }
    var kgContentDiv = document.createElement('div');
    kgContentDiv.id = 'kg-content-' + dayNum;
    // Show static fallback initially (will be replaced when AI fires)
    if (kgFallbackText) kgContentDiv.innerHTML = '<div class="question-text">"' + kgFallbackText + '"</div>';
    s3body.appendChild(kgContentDiv);
    if (noticeThis) s3body.appendChild(noticeThis);
    var s3btn = document.createElement('button');
    s3btn.className = 'pstep-continue';
    s3btn.textContent = 'continue';
    s3body.appendChild(s3btn);
    s3.appendChild(s3body);
    steps.push(s3);

    // Step 4: Voice Reflection
    var s4 = document.createElement('div');
    s4.className = 'pstep';
    s4.setAttribute('data-step','3');
    s4.setAttribute('data-label','voice reflection');
    var s4body = document.createElement('div');
    s4body.className = 'pstep-body';
    if (voice) s4body.appendChild(voice);
    var s4btn = document.createElement('button');
    s4btn.className = 'pstep-continue';
    s4btn.id = 'pstep-voice-btn-' + dayNum;
    s4btn.textContent = 'continue';
    s4btn.style.display = 'none';
    s4body.appendChild(s4btn);
    s4.appendChild(s4body);
    steps.push(s4);

    // Step 5: Micro Action + Complete
    var s5 = document.createElement('div');
    s5.className = 'pstep';
    s5.setAttribute('data-step','4');
    s5.setAttribute('data-label','micro-action');
    var s5body = document.createElement('div');
    s5body.className = 'pstep-body';
    if (microAction) s5body.appendChild(microAction);
    if (completeRow) s5body.appendChild(completeRow);
    s5.appendChild(s5body);
    steps.push(s5);

    // Clear content wrap and add steps
    contentWrap.innerHTML = '';
    steps.forEach(function(step) { contentWrap.appendChild(step); });

    // Init state
    pstepState[dayNum] = 0;

    // Wire continue buttons
    steps.forEach(function(step, idx) {
      var btn = step.querySelector('.pstep-continue');
      if (btn) {
        btn.addEventListener('click', function() {
          advanceStep(dayNum, idx);
        });
      }
    });

    // Wire writing check for step 2
    wireWriteCheck(dayNum);
  });
}

function wireWriteCheck(dayNum) {
  var ta = document.getElementById('write-' + dayNum);
  var btn = document.getElementById('pstep-write-btn-' + dayNum);
  if (!ta || !btn) return;
  function check() {
    var wc = wordCount(ta.value || '');
    btn.disabled = wc < MIN;
  }
  ta.addEventListener('input', check);
  check(); // initial state
}

function advanceStep(dayNum, fromIdx) {
  var contentWrap = document.getElementById('day-content-' + dayNum);
  if (!contentWrap) return;
  var steps = contentWrap.querySelectorAll('.pstep');
  var nextIdx = fromIdx + 1;
  if (nextIdx >= steps.length) return;

  // Save writing on step 2 continue and trigger Keep Going AI
  if (fromIdx === 1) {
    var ta = document.getElementById('write-' + dayNum);
    if (ta) {
      window.parent.postMessage({ type: 'saveWriting', day: dayNum, text: ta.value }, '*');
    }
    // Fire AI generation for Keep Going (nextIdx === 2)
    generateKeepGoing(dayNum);
  }

  // Collapse current step
  collapseStep(steps[fromIdx]);

  // Show next step
  steps[nextIdx].classList.add('pstep-active');
  pstepState[dayNum] = nextIdx;

  // Scroll to new step
  setTimeout(function() {
    steps[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function collapseStep(stepEl) {
  stepEl.classList.remove('pstep-active');
  stepEl.classList.add('pstep-done');
  var label = stepEl.getAttribute('data-label') || '';
  var stepIdx = stepEl.getAttribute('data-step');

  // Add collapsed header if not already present
  if (!stepEl.querySelector('.pstep-collapsed')) {
    var collapsed = document.createElement('div');
    collapsed.className = 'pstep-collapsed';
    var headerHtml = '<span class="pstep-collapsed-label">' + label + '</span><span class="pstep-collapsed-chevron">↓</span>';
    collapsed.innerHTML = headerHtml;

    // For voice step (data-step="3"), add playback or skipped note below header
    if (stepIdx === '3') {
      var dayView = stepEl.closest('.day-view');
      var dayNum = dayView ? parseInt(dayView.id.replace('day-','')) : 0;
      var url = voiceUrlCache[dayNum];
      if (url) {
        var playback = document.createElement('div');
        playback.className = 'voice-playback-collapsed';
        playback.innerHTML = '<audio controls src="' + url + '"></audio>';
        collapsed.appendChild(playback);
      }
    }

    stepEl.insertBefore(collapsed, stepEl.firstChild);
    collapsed.addEventListener('click', function() {
      stepEl.classList.toggle('pstep-expanded');
      collapsed.classList.toggle('expanded');
    });
  }

  // Hide the continue button in collapsed state
  var btn = stepEl.querySelector('.pstep-continue');
  if (btn) btn.style.display = 'none';
}

function showStepsForDay(dayNum) {
  var contentWrap = document.getElementById('day-content-' + dayNum);
  if (!contentWrap) return;
  var steps = contentWrap.querySelectorAll('.pstep');

  // Reset all steps
  steps.forEach(function(step) {
    step.classList.remove('pstep-active', 'pstep-done', 'pstep-expanded');
    step.style.display = '';
    var collapsed = step.querySelector('.pstep-collapsed');
    if (collapsed) collapsed.remove();
    var btn = step.querySelector('.pstep-continue');
    if (btn) btn.style.display = '';
  });

  // Show step 1
  pstepState[dayNum] = 0;
  if (steps[0]) steps[0].classList.add('pstep-active');
  wireWriteCheck(dayNum);
}

// ── SETTLE IN ──
var settleAudioCtx = null;
var settleAudioNodes = [];

function getSettleExercise(dayNum) {
  return ((dayNum - 1) % 14);
}

function buildSettleHTML(exIdx) {
  switch(exIdx) {
    case 0: // Breathing Circle
      return '<div class="settle-circle" id="settleAnim" style="width:60px;height:60px;animation:settleBreathIn 8s ease-in-out infinite"></div>' +
        '<div class="settle-text" id="settleBreathText">breathe in</div>';
    case 1: // The Dot
      return '<div class="settle-dot" id="settleAnim" style="animation:settlePulse 3s ease-in-out infinite"></div>' +
        '<div class="settle-text">watch it. just for a moment.</div>';
    case 2: // The Horizon Line
      return '<div class="settle-horizon" id="settleAnim" style="width:0;max-width:280px;transition:width 4s ease-out"></div>' +
        '<div class="settle-text">let your eyes follow it. don\\'t rush.</div>';
    case 3: // The Countdown
      return '<div class="settle-text-large" id="settleCountdown">5</div>';
    case 4: // Shake It Off
      return '<div id="settleLines" style="display:flex;flex-direction:column;gap:4px"></div>';
    case 5: // The Sound
      return '<div style="position:relative;display:flex;align-items:center;justify-content:center;width:120px;height:120px">' +
        '<div class="settle-dot" style="width:14px;height:14px;position:relative;z-index:2"></div>' +
        '<div class="settle-ring" id="settleRing1" style="animation:settleChordRing 3s ease-out infinite"></div>' +
        '<div class="settle-ring" id="settleRing2" style="animation:settleChordRing 3s ease-out infinite 1s"></div>' +
        '<div class="settle-ring" id="settleRing3" style="animation:settleChordRing 3s ease-out infinite 2s"></div>' +
        '</div>' +
        '<div class="settle-text">let it wash over you.</div>' +
        '<div class="settle-text-small" id="settleTimer">20</div>';
    case 6: // Three Things
      return '<div class="settle-text">before we begin — name three things you can feel right now.</div>' +
        '<div class="settle-text-small">the chair. the temperature. your breath.</div>';
    case 7: // The Slow Blink
      return '<div class="settle-circle" id="settleAnim" style="width:48px;height:48px;animation:settleSlowBlink 2s ease-in-out 3"></div>' +
        '<div class="settle-text">blink slowly. three times.</div>';
    case 8: // The Permission Slip
      return '<div class="settle-text" id="settleAnim" style="font-size:20px;font-style:italic;opacity:0;animation:settleFadeIn 1.2s ease forwards">nothing you write needs to be good.</div>';
    case 9: // The Tab Close
      return '<div id="settleTab" class="settle-tab" style="transition:transform 4s ease,opacity 3.5s ease">what you were just doing</div>' +
        '<div class="settle-text" style="margin-top:16px">think of one thing you were just doing. now close the tab in your mind.</div>';
    case 10: // The Exhale
      return '<div class="settle-text" style="font-size:20px;font-style:italic">take one long exhale before you begin.</div>';
    case 11: // The Empty Page
      return '<div class="settle-text" id="settleReady" style="font-size:22px;opacity:0">ready.</div>';
    case 12: // The Body Scan
      return '<div id="settleLines" style="display:flex;flex-direction:column;gap:4px"></div>';
    case 13: // The Arrive
      return '<div style="position:relative;display:flex;align-items:center;justify-content:center;width:120px;height:120px">' +
        '<div class="settle-dot" style="width:10px;height:10px;position:relative;z-index:2"></div>' +
        '<div class="settle-ring" id="settleRing1" style="animation:settleRipple 3s ease-out infinite"></div>' +
        '<div class="settle-ring" id="settleRing2" style="animation:settleRipple 3s ease-out infinite 1s"></div>' +
        '<div class="settle-ring" id="settleRing3" style="animation:settleRipple 3s ease-out infinite 2s"></div>' +
        '</div>' +
        '<div class="settle-text">you made it here. that\\'s the hardest part.</div>';
    default: return '';
  }
}

function startSettleAnimation(exIdx) {
  if (exIdx === 0) { // Breathing Circle — alternate text
    var bt = document.getElementById('settleBreathText');
    if (bt) { window._settleBreathInt = setInterval(function(){ bt.textContent = bt.textContent === 'breathe in' ? 'breathe out' : 'breathe in'; }, 4000); }
  }
  if (exIdx === 2) { // Horizon Line — trigger width
    setTimeout(function(){ var h = document.getElementById('settleAnim'); if(h) h.style.width='280px'; }, 50);
  }
  if (exIdx === 3) { // Countdown
    var nums = [5,4,3,2,1];
    var ci = 0;
    var cd = document.getElementById('settleCountdown');
    window._settleCountdownInt = setInterval(function(){
      ci++;
      if (ci < nums.length && cd) { cd.style.opacity='0'; setTimeout(function(){ cd.textContent=nums[ci]; cd.style.opacity='1'; },200); }
      else { clearInterval(window._settleCountdownInt); }
    }, 1200);
  }
  if (exIdx === 4) { // Shake It Off
    var lines = ['roll your shoulders back.','drop your jaw.','unclench your hands.','you\\'re here now.'];
    var container = document.getElementById('settleLines');
    if (container) {
      lines.forEach(function(l, i) {
        setTimeout(function(){
          var el = document.createElement('div');
          el.className = 'settle-line-item';
          el.style.animationDelay = '0s';
          el.textContent = l;
          container.appendChild(el);
        }, i * 900);
      });
    }
  }
  if (exIdx === 5) { // The Sound — Web Audio
    try {
      settleAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var freqs = [220, 261.63, 329.63, 392, 523.25]; // A minor pentatonic
      freqs.forEach(function(f) {
        var osc = settleAudioCtx.createOscillator();
        var gain = settleAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.value = 0.04;
        osc.connect(gain);
        gain.connect(settleAudioCtx.destination);
        osc.start();
        settleAudioNodes.push({ osc: osc, gain: gain });
      });
      var st = document.getElementById('settleTimer');
      var sec = 20;
      window._settleSoundInt = setInterval(function(){
        sec--;
        if (st) st.textContent = sec;
        if (sec <= 0) clearInterval(window._settleSoundInt);
      }, 1000);
    } catch(e) {}
  }
  if (exIdx === 9) { // Tab Close — animate away
    setTimeout(function(){ var tab = document.getElementById('settleTab'); if(tab){ tab.style.transform='translateY(-40px)'; tab.style.opacity='0'; }}, 500);
  }
  if (exIdx === 11) { // Empty Page — fade in "ready."
    setTimeout(function(){ var r = document.getElementById('settleReady'); if(r){ r.style.transition='opacity 1.5s ease'; r.style.opacity='1'; }}, 3000);
  }
  if (exIdx === 12) { // Body Scan
    var blines = ['feet on the floor.','hands relaxed.','shoulders down.','eyes soft.'];
    var bc = document.getElementById('settleLines');
    if (bc) {
      blines.forEach(function(l, i) {
        setTimeout(function(){
          var el = document.createElement('div');
          el.className = 'settle-line-item';
          el.textContent = l;
          bc.appendChild(el);
        }, i * 1000);
      });
    }
  }
}

function stopSettleAnimation(exIdx) {
  // Stop all intervals
  clearInterval(window._settleBreathInt);
  clearInterval(window._settleCountdownInt);
  clearInterval(window._settleSoundInt);
  // Kill all CSS animations on settle elements
  document.querySelectorAll('.settle-content *').forEach(function(el) {
    el.style.animationPlayState = 'paused';
    el.style.animation = 'none';
  });
  // Fade out audio
  if (settleAudioCtx && settleAudioNodes.length) {
    settleAudioNodes.forEach(function(n) {
      try {
        n.gain.gain.linearRampToValueAtTime(0, settleAudioCtx.currentTime + 1);
        setTimeout(function(){ n.osc.stop(); }, 1100);
      } catch(e){}
    });
    settleAudioNodes = [];
  }
  // Specific fixups
  if (exIdx === 0) { // Breathing — show circle at rest
    var c = document.getElementById('settleAnim'); if(c){ c.style.width='90px'; c.style.height='90px'; c.style.opacity='1'; }
    var bt = document.getElementById('settleBreathText'); if(bt) bt.style.display='none';
  }
  if (exIdx === 3) { // Countdown — show "1"
    var cd = document.getElementById('settleCountdown'); if(cd){ cd.textContent='1'; cd.style.opacity='1'; }
  }
  if (exIdx === 7) { // Slow Blink — full opacity
    var sb = document.getElementById('settleAnim'); if(sb){ sb.style.opacity='1'; }
  }
}

function setupSettleIn() {
  document.querySelectorAll('.day-view').forEach(function(dayView) {
    var dayNum = parseInt(dayView.id.replace('day-',''));
    if (isNaN(dayNum)) return;
    var exIdx = getSettleExercise(dayNum);

    // Extract day header — it stays above everything, never collapses
    var dayHeader = dayView.querySelector('.day-header');
    if (dayHeader) {
      dayHeader.classList.add('day-header-fixed');
      dayView.removeChild(dayHeader);
    }

    // Build settle wrap
    var wrap = document.createElement('div');
    wrap.className = 'settle-wrap';
    wrap.id = 'settle-' + dayNum;
    wrap.innerHTML = '<div class="settle-label">settle in</div>' +
      '<div class="settle-content" id="settle-content-' + dayNum + '">' + buildSettleHTML(exIdx) + '</div>' +
      '<button class="settle-continue" id="settle-btn-' + dayNum + '">continue</button>';

    // Build collapsed header for after continue
    var collapsedHeader = document.createElement('div');
    collapsedHeader.className = 'settle-collapsed-header';
    collapsedHeader.id = 'settle-collapsed-' + dayNum;
    collapsedHeader.innerHTML = '<span class="settle-collapsed-label">settle in ✓</span><span class="settle-collapsed-chevron">↓</span>';

    // Wrap remaining children into content div
    var children = Array.from(dayView.children);
    var contentWrap = document.createElement('div');
    contentWrap.id = 'day-content-' + dayNum;
    contentWrap.style.display = 'none';
    children.forEach(function(ch) { contentWrap.appendChild(ch); });

    // Assemble: header → settle → collapsed header → content
    if (dayHeader) dayView.appendChild(dayHeader);
    dayView.appendChild(wrap);
    dayView.appendChild(collapsedHeader);
    dayView.appendChild(contentWrap);

    // Continue button: collapse settle, show content
    document.getElementById('settle-btn-' + dayNum).onclick = function() {
      stopSettleAnimation(exIdx);
      wrap.classList.add('settled-done');
      collapsedHeader.classList.add('show');
      var cw = document.getElementById('day-content-' + dayNum);
      cw.style.display = 'block';
      var firstStep = cw.querySelector('.pstep');
      if (firstStep) firstStep.classList.add('pstep-active');
    };

    // Collapsed header toggle: re-expand/collapse settle
    collapsedHeader.onclick = function() {
      var isExpanded = wrap.classList.contains('settled-expanded');
      if (isExpanded) {
        wrap.classList.remove('settled-expanded');
        collapsedHeader.classList.remove('expanded');
      } else {
        wrap.classList.add('settled-expanded');
        collapsedHeader.classList.add('expanded');
      }
    };
  });
}

// Override showDay to trigger settle animation
var _settleShowDay;
function wrapShowDayForSettle() {
  _settleShowDay = showDay;
  showDay = function(n) {
    _settleShowDay(n);
    // Reset settle state
    var settleWrap = document.getElementById('settle-' + n);
    var contentWrap = document.getElementById('day-content-' + n);
    var btn = document.getElementById('settle-btn-' + n);
    var collapsedH = document.getElementById('settle-collapsed-' + n);
    if (settleWrap && contentWrap && btn) {
      contentWrap.style.display = 'none';
      btn.style.display = '';
      // Reset settle state
      settleWrap.classList.remove('settled-done', 'settled-expanded');
      if (collapsedH) { collapsedH.classList.remove('show', 'expanded'); }
      // Reset progressive steps for this day
      showStepsForDay(n);
      // Restart animation
      var exIdx = getSettleExercise(n);
      var sc = document.getElementById('settle-content-' + n);
      if (sc) { sc.innerHTML = buildSettleHTML(exIdx); }
      startSettleAnimation(exIdx);
    }
  };
}

const _origInit = init;
init = function() {
  _origInit();
  setupProgressiveReveal();
  setupWritingEncouragement();
  setupVoiceSections();
  setupSettleIn();
  setupProgressiveSteps();
  wrapShowDayForSettle();
  // Start settle animation for day 1
  startSettleAnimation(getSettleExercise(1));
  // Check voice consent and fetch existing voice URLs
  window.parent.postMessage({ type: 'checkVoiceConsent' }, '*');
  for (var d = 1; d <= 14; d++) {
    window.parent.postMessage({ type: 'fetchVoiceUrl', day: d }, '*');
  }
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

  // Listen for messages from iframe (day completion, voice, consent)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const iframeRef = document.querySelector("iframe");
      if (!userId) return;
      const { type } = event.data || {};

      if (type === "dayComplete") {
        await supabase.from("day_submissions").upsert({
          user_id: userId,
          program_id: slug,
          day_number: event.data.day,
          submitted_at: new Date().toISOString(),
        }, { onConflict: "user_id,program_id,day_number" });
      }

      if (type === "saveWriting") {
        await supabase.from("day_submissions").upsert({
          user_id: userId,
          program_id: slug,
          day_number: event.data.day,
          written_response: event.data.text,
        }, { onConflict: "user_id,program_id,day_number" });
      }

      if (type === "generateKeepGoing") {
        console.log("[KG] 4. Parent received generateKeepGoing for day", event.data.day, "iframeRef:", !!iframeRef);
        try {
          const res = await fetch("/api/generate-keep-going", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ writing: event.data.writing }),
          });
          console.log("[KG] 5. API response status:", res.status);
          const result = await res.json();
          console.log("[KG] 5a. API result:", JSON.stringify(result).substring(0, 100));
          iframeRef?.contentWindow?.postMessage({
            type: "keepGoingResult",
            dayNumber: event.data.day,
            question: result.question || null,
          }, "*");
          console.log("[KG] 5b. Sent keepGoingResult to iframe, question:", result.question ? "yes" : "null (fallback)");
        } catch (err) {
          console.log("[KG] 5c. ERROR in fetch:", err);
          iframeRef?.contentWindow?.postMessage({
            type: "keepGoingResult",
            dayNumber: event.data.day,
            question: null,
          }, "*");
          console.log("[KG] 5d. Sent fallback keepGoingResult to iframe");
        }
      }

      if (type === "saveKeepGoing") {
        await supabase.from("day_submissions").upsert({
          user_id: userId,
          program_id: slug,
          day_number: event.data.day,
          keep_going_question: event.data.question,
          keep_going_response: event.data.response,
        }, { onConflict: "user_id,program_id,day_number" });
      }

      if (type === "fetchVoiceUrl") {
        const { data: sub } = await supabase
          .from("day_submissions")
          .select("voice_note_url")
          .eq("user_id", userId)
          .eq("program_id", slug)
          .eq("day_number", event.data.day)
          .maybeSingle();
        let signedUrl = null;
        if (sub?.voice_note_url) {
          const match = sub.voice_note_url.match(/voice-notes\/(.+)$/);
          if (match) {
            const { data: signed } = await supabase.storage
              .from("voice-notes")
              .createSignedUrl(match[1], 3600);
            signedUrl = signed?.signedUrl || null;
          }
        }
        iframeRef?.contentWindow?.postMessage({
          type: "existingVoiceUrl",
          dayNumber: event.data.day,
          url: signedUrl,
        }, "*");
      }

      if (type === "checkVoiceConsent") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("voice_consent")
          .eq("id", userId)
          .single();
        iframeRef?.contentWindow?.postMessage({
          type: "voiceConsentStatus",
          consent: profile?.voice_consent,
        }, "*");
      }

      if (type === "saveVoiceConsent") {
        await supabase
          .from("profiles")
          .update({ voice_consent: event.data.consent })
          .eq("id", userId);
        iframeRef?.contentWindow?.postMessage({
          type: "voiceConsentSaved",
          consent: event.data.consent,
        }, "*");
      }

      if (type === "uploadVoiceNote") {
        const { dayNumber, audioBase64 } = event.data;
        try {
          console.log("3. Parent received upload message, decoding base64...");
          const byteChars = atob(audioBase64);
          const byteArray = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
          const blob = new Blob([byteArray], { type: "audio/webm" });
          console.log("4. Blob created, size:", blob.size, "— calling /api/voice...");

          iframeRef?.contentWindow?.postMessage({ type: "voiceProgress", dayNumber, status: "turning your words into text..." }, "*");

          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          formData.append("userId", userId);
          formData.append("programId", slug);
          formData.append("dayNumber", String(dayNumber));

          const res = await fetch("/api/voice", { method: "POST", body: formData });
          console.log("5. /api/voice response status:", res.status);
          const result = await res.json();
          console.log("6. /api/voice result:", result);

          // Convert public URL to signed URL for playback
          let playableUrl = result.url || null;
          if (playableUrl) {
            const urlMatch = playableUrl.match(/voice-notes\/(.+)$/);
            if (urlMatch) {
              const { data: signed } = await supabase.storage
                .from("voice-notes")
                .createSignedUrl(urlMatch[1], 3600);
              if (signed?.signedUrl) playableUrl = signed.signedUrl;
            }
          }

          iframeRef?.contentWindow?.postMessage({
            type: "voiceNoteResult",
            dayNumber,
            url: playableUrl,
            transcript: result.transcript || null,
            error: result.error || null,
          }, "*");
        } catch (err) {
          console.error("Voice upload error:", err);
          iframeRef?.contentWindow?.postMessage({
            type: "voiceNoteResult",
            dayNumber,
            url: null,
            transcript: null,
            error: "Upload failed",
          }, "*");
        }
      }

      if (type === "retryTranscription") {
        const { dayNumber, voiceUrl } = event.data;
        try {
          iframeRef?.contentWindow?.postMessage({ type: "voiceProgress", dayNumber, status: "retrying transcription..." }, "*");

          const formData = new FormData();
          formData.append("userId", userId);
          formData.append("programId", slug);
          formData.append("dayNumber", String(dayNumber));
          formData.append("transcribeOnly", "true");
          formData.append("voiceUrl", voiceUrl);

          const res = await fetch("/api/voice", { method: "POST", body: formData });
          const result = await res.json();

          iframeRef?.contentWindow?.postMessage({
            type: "voiceNoteResult",
            dayNumber,
            url: result.url || voiceUrl,
            transcript: result.transcript || null,
            error: result.error || null,
          }, "*");
        } catch (err) {
          iframeRef?.contentWindow?.postMessage({
            type: "voiceNoteResult",
            dayNumber,
            url: voiceUrl,
            transcript: null,
            error: "Retry failed",
          }, "*");
        }
      }
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

  const dismissAccountability = async () => {
    if (!userId) return;
    // Save accountability_shown flag as day_number 0
    await supabase.from("day_submissions").upsert({
      user_id: userId,
      program_id: slug,
      day_number: 0,
      submitted_at: new Date().toISOString(),
    }, { onConflict: "user_id,program_id,day_number" });
    // Save name if entered
    if (accountabilityName.trim()) {
      await supabase.from("profiles")
        .update({ accountability_name: accountabilityName.trim() })
        .eq("id", userId);
    }
    // Reload page — checkAccess will now find the record and go to authorized
    window.location.reload();
  };

  const handleAccountabilityShare = () => {
    const shareText = "I'm starting a 14-day creative thinking practice. Thought you should know.";
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent("doing something for my thinking")}&body=${encodeURIComponent(shareText)}`;
    }
  };

  if (status === "accountability") {
    return (
      <div style={{
        minHeight: "100vh", background: "#FAF7F0",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
        animation: "accFadeIn 0.5s ease forwards",
      }}>
        <style>{`@keyframes accFadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          <p style={{
            fontFamily: "'Codec Pro',sans-serif", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#FF9090", marginBottom: 16,
          }}>14 DAYS</p>
          <h1 style={{
            fontFamily: "'Codec Pro',sans-serif", fontSize: 42, fontWeight: 700,
            color: "#000332", letterSpacing: "-0.02em", lineHeight: 1.1,
            marginBottom: 16,
          }}>tell one person you&rsquo;re doing this.</h1>
          <p style={{
            fontFamily: "'Codec Pro',sans-serif", fontSize: 17, fontWeight: 400,
            color: "#000332", opacity: 0.72, lineHeight: 1.65,
            maxWidth: 400, margin: "0 auto",
          }}>The research on accountability is pretty clear: saying it out loud to someone changes your follow-through. This is that step.</p>

          <div style={{
            height: 1, background: "rgba(0,3,50,0.1)",
            margin: "32px 0",
          }} />

          <p style={{
            fontFamily: "'Codec Pro',sans-serif", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#000332", opacity: 0.5, marginBottom: 14,
          }}>WHO COMES TO MIND?</p>

          <input
            type="text"
            value={accountabilityName}
            onChange={(e) => setAccountabilityName(e.target.value)}
            placeholder={'a name, or just "someone I know"'}
            style={{
              width: "100%", padding: "16px 20px",
              border: "1.5px solid rgba(0,3,50,0.18)",
              borderRadius: 10, background: "#FAF7F0",
              fontFamily: "'Codec Pro',sans-serif", fontSize: 16,
              color: "#000332", outline: "none",
            }}
          />

          <p style={{
            fontFamily: "'Codec Pro',sans-serif", fontSize: 13,
            fontStyle: "italic", color: "#000332", opacity: 0.45,
            marginTop: 12, lineHeight: 1.6,
          }}>&ldquo;hey, I&rsquo;m doing a 14-day creative thinking thing. just wanted to say it out loud to someone.&rdquo;</p>

          <button
            onClick={() => {
              setAccountabilityChecked(!accountabilityChecked);
              if (!accountabilityChecked) handleAccountabilityShare();
            }}
            style={{
              width: "100%", marginTop: 20,
              padding: "16px 20px",
              background: accountabilityChecked ? "#000332" : "#FAF7F0",
              border: "1.5px solid rgba(0,3,50,0.18)",
              borderRadius: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 14,
              textAlign: "left",
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              border: accountabilityChecked ? "none" : "1.5px solid rgba(0,3,50,0.2)",
              background: accountabilityChecked ? "#FF9090" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 14,
            }}>{accountabilityChecked ? "✓" : ""}</div>
            <div>
              <div style={{
                fontFamily: "'Codec Pro',sans-serif", fontSize: 15, fontWeight: 400,
                color: accountabilityChecked ? "#FAF7F0" : "#000332",
              }}>I&rsquo;ll tell someone today</div>
              <div style={{
                fontFamily: "'Codec Pro',sans-serif", fontSize: 12, fontWeight: 300,
                color: accountabilityChecked ? "rgba(250,247,240,0.55)" : "rgba(0,3,50,0.45)",
                marginTop: 2,
              }}>tap to send a note, or just commit to saying it</div>
            </div>
          </button>

          <button
            onClick={dismissAccountability}
            style={{
              width: "100%", marginTop: 20,
              padding: 17, borderRadius: 100,
              background: "#000332", color: "#FAF7F0",
              border: "none", fontFamily: "'Codec Pro',sans-serif",
              fontSize: 16, fontWeight: 500, cursor: "pointer",
            }}
          >start day 1</button>

          <button
            onClick={dismissAccountability}
            style={{
              marginTop: 14, background: "none", border: "none",
              fontFamily: "'Codec Pro',sans-serif", fontSize: 14,
              color: "rgba(0,3,50,0.6)", cursor: "pointer",
            }}
          >skip for now</button>
        </div>
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
          track not found.
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
