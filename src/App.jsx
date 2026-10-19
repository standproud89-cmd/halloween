import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, Ghost } from "lucide-react";

/* ---------- Design tokens (from GnB CYJ Jr. hexagon identity) ---------- */
const C = {
  purple: "#9B4FC9",
  blue: "#2E7FE3",
  red: "#F0472E",
  orange: "#F5A623",
  black: "#1C1C1E",
  gray: "#9A9A9E",
  bg: "#FFFFFF",
  surface: "#F7F7F8",
  border: "#E7E7EA",
  ink: "#1C1C1E",
  sub: "#6B6B70",
  // Halloween event theme
  hbg: "#000000",
  hcard: "#18171a",
  hred: "#FF3131",
  hborder: "#5a1010",
};


/* ================= Halloween Escape Room — 4인 협동 버전 ================= */
// 오프닝 영상 위에 흐르는 미션 안내 (영상 재생 시간 기준, 초)
const HW_BRIEF = [
  { from: 6.5, to: 12.6, lines: ["이제 이 저주 받은 곳에서 탈출하려면", "미션을 성공하고, 자물쇠를 열어야 한다."] },
  { from: 13.2, to: 19.0, lines: ["주어진 시간 동안 저주를 풀지 못한다면,", "너희들은 이곳에서 나갈 수 없다."], danger: true },
  { from: 19.6, to: 25.0, lines: ["그럼 모두 힘을 합쳐", "주어진 미션을 모두 성공하고,", "봉인된 상자를 열어라."], last: true },
  { from: 25.5, to: 29.7, lines: ["자, 이제 시작이다."], last: true, big: true },
];
const HW_GATE_PAUSE = 5.0; // 문이 활짝 열린 뒤 멈추는 시점(초)
const HW_INTRO_VIDEO = `${import.meta.env.BASE_URL}halloween-intro.mp4`;
const HW_FAIL_VIDEO = `${import.meta.env.BASE_URL}halloween-fail.mp4`;
const HW_BGM = `${import.meta.env.BASE_URL}halloween-bgm.mp3`;
const HW_TIME_LIMIT = 300; // 전체 제한 시간(초) = 5분
const HW_PLAYERS = [
  { name: "보라", color: "#B26BE8", dot: "🟣" },
  { name: "파랑", color: "#4C9BFF", dot: "🔵" },
  { name: "주황", color: "#FFB13B", dot: "🟠" },
  { name: "초록", color: "#3DDC84", dot: "🟢" },
];
const HW_LANE_W = 320;
const HW_ARENA_W = HW_LANE_W * 4; // 1280 (손도장 스테이지)
const HW_GAME_W = 1328; // 5개 미션 게임 화면 폭 (TV 16:9에 꽉 차도록)
const HW_ARENA_H = 470;
const HW_STAGES = [
  { id: "hands", label: "손도장의 문" },
  { id: "piano", label: "피아노 타일" },
  { id: "puzzle", label: "도형 퍼즐" },
  { id: "memory", label: "카드 짝 맞추기" },
  { id: "skull", label: "해골 두더지" },
  { id: "candy", label: "사탕 받기" },
];
const HW_PASSWORD = "860"; // 성공 시 보여줄 자물쇠 비밀번호
const HW_LOCKS = HW_STAGES.length - 1; // 자물쇠 = 손도장 이후 5개 미션

function fmtClock(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function useInterval(cb, ms) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

/* 4개 레인(플레이어 구역)이 있는 공용 무대 */
function HwArena({ arenaRef, children, height = HW_ARENA_H, eerie = false }) {
  return (
    <div
      ref={arenaRef}
      className="relative mx-auto rounded-3xl overflow-hidden"
      style={{
        width: HW_ARENA_W,
        height,
        backgroundColor: eerie ? "#050303" : C.hcard,
        backgroundImage: eerie ? "radial-gradient(ellipse at 50% 35%, rgba(90,10,10,.28) 0%, rgba(0,0,0,0) 65%)" : undefined,
        border: `2px solid ${eerie ? "#2b0e0e" : C.hborder}`,
        touchAction: "none",
      }}
    >
      {HW_PLAYERS.map((p, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{
            left: i * HW_LANE_W,
            width: HW_LANE_W,
            background: eerie ? "linear-gradient(180deg, transparent 55%, rgba(110,0,0,.16))" : `linear-gradient(180deg, ${p.color}22, ${p.color}08 60%, transparent)`,
            borderLeft: i === 0 ? "none" : eerie ? "1px solid #2b0e0e" : `2px dashed ${C.hborder}`,
          }}
        >
          {eerie ? null : (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-black text-lg"
            style={{ backgroundColor: `${p.color}33`, color: p.color, border: `2px solid ${p.color}` }}
          >
            {p.dot} {p.name}
          </div>
          )}
        </div>
      ))}
      {children}
    </div>
  );
}

function HwInstruction({ icon, title, text, eerie = false }) {
  if (eerie) return (
    <div className="text-center mb-4">
      <p style={{ color: "#c4161c", fontFamily: "'East Sea Dokdo', 'Nanum Brush Script', serif", fontSize: 64, lineHeight: 1.05, letterSpacing: "0.06em", textShadow: "0 0 18px #7a0000" }}>{title}</p>
      <p className="text-2xl" style={{ color: "#d4262c", textShadow: "0 0 10px #5a0000" }}>{text}</p>
    </div>
  );
  return (
    <div className="text-center mb-4">
      <p className="font-black text-4xl mb-1" style={{ color: C.hred }}>{icon} {title}</p>
      <p className="text-2xl" style={{ color: "#c9c9cc" }}>{text}</p>
    </div>
  );
}

/* 피 묻은 손도장 (직접 그린 SVG) — pressed 면 선명하게 번지고 피가 더 흘러내림 */
function HwBloodHand({ pressed }) {
  const fill = pressed ? "#c4161c" : "#5e0d11";
  const drips = [
    { x: 78, w: 7, h: 38, d: 0 }, { x: 96, w: 6, h: 62, d: 0.08 }, { x: 112, w: 8, h: 30, d: 0.03 },
    { x: 128, w: 6, h: 50, d: 0.12 }, { x: 64, w: 5, h: 22, d: 0.05 },
  ];
  return (
    <svg viewBox="0 0 220 270" width="206" height="250" style={{ overflow: "visible", filter: pressed ? "drop-shadow(0 0 10px #7a0000)" : "none", transition: "filter .15s" }}>
      <g fill={fill} style={{ transition: "fill .15s" }}>
        <rect x="40" y="38" width="22" height="66" rx="11" transform="rotate(-18 51 104)" />
        <rect x="74" y="14" width="24" height="86" rx="12" transform="rotate(-5 86 100)" />
        <rect x="108" y="12" width="24" height="88" rx="12" transform="rotate(5 120 100)" />
        <rect x="140" y="34" width="22" height="70" rx="11" transform="rotate(18 151 104)" />
        <path d="M46 126 C44 104 70 98 100 100 C130 98 158 104 160 128 C168 148 172 168 160 186 C150 202 128 206 104 206 C78 206 56 200 48 184 C40 166 42 146 46 126 Z" />
        <rect x="150" y="118" width="22" height="64" rx="11" transform="rotate(62 161 150) translate(18 -6)" />
        {drips.map((d, i) => (
          <g key={i} style={{ transformOrigin: `${d.x + d.w / 2}px 200px`, transform: `scaleY(${pressed ? 1.45 : 1})`, transition: `transform ${0.5 + d.d * 3}s ease-out ${d.d}s` }}>
            <rect x={d.x} y="198" width={d.w} height={d.h} rx={d.w / 2} />
            <circle cx={d.x + d.w / 2} cy={198 + d.h} r={d.w / 2 + 1.4} />
          </g>
        ))}
        <circle cx="52" cy="214" r="3" /><circle cx="150" cy="222" r="2.5" /><circle cx="36" cy="170" r="2.5" />
      </g>
      <g stroke="#000" strokeOpacity=".35" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M58 70 l8 3 M84 56 h16 M116 54 h16 M148 72 l-8 3" />
        <path d="M70 140 C 90 132 120 132 142 140" />
      </g>
    </svg>
  );
}

/* ---------- Stage 1: 손도장의 문 (4명이 동시에 꾹) ---------- */
function StageHands({ level, onClear }) {
  const need = level === "hard" ? 5000 : 3000;
  const down = useRef([new Set(), new Set(), new Set(), new Set()]);
  const holdRef = useRef(0);
  const doneRef = useRef(false);
  const [pressed, setPressed] = useState([false, false, false, false]);
  const [hold, setHold] = useState(0);
  const sync = () => setPressed(down.current.map((s) => s.size > 0));
  const onDown = (i, e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    down.current[i].add(e.pointerId);
    sync();
  };
  const onUp = (i, e) => {
    down.current[i].delete(e.pointerId);
    sync();
  };

  useInterval(() => {
    if (doneRef.current) return;
    const all = down.current.every((s) => s.size > 0);
    holdRef.current = all ? holdRef.current + 50 : 0;
    setHold(holdRef.current);
    if (holdRef.current >= need) {
      doneRef.current = true;
      onClear();
    }
  }, 50);

  const cnt = pressed.filter(Boolean).length;
  const pct = Math.min(100, (hold / need) * 100);
  return (
    <>
      <HwInstruction
        eerie icon="" title="손도장의 문"
        text={`네 사람이 동시에 자기 손도장 위에 손을 얹고 ${need / 1000}초 동안 떼지 마세요.`}
      />
      <HwArena eerie>
        {HW_PLAYERS.map((p, i) => (
          <div
            key={i}
            onPointerDown={(e) => onDown(i, e)}
            onPointerUp={(e) => onUp(i, e)}
            onPointerCancel={(e) => onUp(i, e)}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: i * HW_LANE_W + (HW_LANE_W - 240) / 2,
              top: 100,
              width: 240,
              height: 260,
              borderRadius: 40,
              touchAction: "none",
              backgroundColor: "transparent",
              backgroundImage: pressed[i] ? "radial-gradient(ellipse at 50% 45%, rgba(170,0,0,.38) 0%, rgba(0,0,0,0) 70%)" : "none",
              border: "none",
              transition: "background-image .3s",
            }}
          >
            <HwBloodHand pressed={pressed[i]} />
          </div>
        ))}
        <div className="absolute left-10 right-10 bottom-8">
          <div className="text-center text-2xl mb-3" style={{ color: cnt === 4 ? "#e23a3a" : "#7d7777", letterSpacing: "0.04em", fontFamily: "'Pretendard', sans-serif", fontWeight: 700 }}>
            {cnt === 4 ? `봉인이 풀리고 있다… ${(hold / 1000).toFixed(1)}초` : "\u00a0"}
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#140808", border: "1px solid #3a1212" }}>
            <div className="h-full" style={{ width: `${pct}%`, backgroundColor: "#a30f14", boxShadow: "0 0 10px #a30f14", transition: "width .05s linear" }} />
          </div>
        </div>
      </HwArena>
    </>
  );
}

/* ---------- 미션 게임 (별도 HTML을 iframe으로 불러와 종료 시 별 개수를 받음) ---------- */
function StageGame({ id, onFinish }) {
  const [h, setH] = useState(620);
  const ref = useRef(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const on = (e) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const d = e.data || {};
      if (d.hw === "h" && d.h) setH(d.h);
      if (d.hw === "done") finishRef.current(d.stars || 0);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const map = typeof window !== "undefined" ? window.__HW_SRCDOC : null;
  const src = map && map[id] ? { srcDoc: map[id] } : { src: `${import.meta.env.BASE_URL}halloween-games/${id}.html?embed=1` };
  return (
    <div className="mx-auto overflow-hidden" style={{ width: HW_GAME_W, borderRadius: 24, border: "2px solid #2b0e0e", backgroundColor: "#000" }}>
      <iframe ref={ref} title={id} allow="autoplay" {...src}
        style={{ width: HW_GAME_W, height: h, border: 0, display: "block", backgroundColor: "#000", touchAction: "none" }} />
    </div>
  );
}

/* 영상 화면: 브라우저 창 전체를 덮고(16:9 영상을 cover로 확대), 안내 글자는 같은 배율로 맞춤 */
function HwFullBleed({ children }) {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const s = Math.max(vp.w / 1152, vp.h / 648);
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#000", overflow: "hidden", zIndex: 50,
      fontFamily: "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 1152, height: 648, transform: `translate(-50%, -50%) scale(${s})` }}>
        {children}
      </div>
    </div>
  );
}

function HalloweenEvent({ onPhase }) {
  const [phase, setPhase] = useState("gate"); // gate | cinema | intro | playing | success | fail
  useEffect(() => { if (onPhase) onPhase(phase); }, [phase, onPhase]);
  const [cinemaSeen, setCinemaSeen] = useState(false);
  const cinemaSeenRef = useRef(false);
  const videoRef = useRef(null);
  const [gateReady, setGateReady] = useState(false);
  const [briefIdx, setBriefIdx] = useState(-1);
  const level = "easy"; // 난이도는 하나로 고정
  const [stageIdx, setStageIdx] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [clearOk, setClearOk] = useState(true);
  const [opened, setOpened] = useState(Array(HW_LOCKS).fill(false));
  const openedRef = useRef(Array(HW_LOCKS).fill(false));
  const [failWhy, setFailWhy] = useState("time");
  const [failEnded, setFailEnded] = useState(false);
  useEffect(() => { if (phase !== "fail") setFailEnded(false); }, [phase]);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState(null);
  const [runKey, setRunKey] = useState(0);
  const stageRef = useRef(0);
  const clearedRef = useRef(false);
  const clearTimerRef = useRef(null);
  const toastTimerRef = useRef(null);

  const hAudioCtxRef = useRef(null);
  const getHAudioCtx = () => {
    if (!hAudioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      hAudioCtxRef.current = new AC();
    }
    return hAudioCtxRef.current;
  };
  const hTone = (freq, start, duration, type = "sine", peakVol = 0.2) => {
    try {
      const c = getHAudioCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + start);
      gain.gain.setValueAtTime(0, c.currentTime + start);
      gain.gain.linearRampToValueAtTime(peakVol, c.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime + start);
      osc.stop(c.currentTime + start + duration + 0.05);
    } catch { /* audio is best-effort */ }
  };
  const playCorrectSound = () => {
    hTone(988, 0, 0.08, "square", 0.15);
    hTone(1319, 0.06, 0.08, "square", 0.15);
    hTone(1568, 0.12, 0.18, "square", 0.15);
  };
  const playWrongSound = () => hTone(180, 0, 0.35, "sawtooth", 0.18);
  const sfx = useMemo(() => ({
    tick: () => hTone(520, 0, 0.1, "square", 0.12),
    go: () => { hTone(1040, 0, 0.12, "square", 0.18); hTone(1560, 0.08, 0.2, "square", 0.18); },
    tap: () => hTone(820, 0, 0.06, "triangle", 0.15),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const notify = useCallback((type, text) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, text, key: Math.random() });
    if (type === "correct") playCorrectSound();
    else playWrongSound();
    toastTimerRef.current = setTimeout(() => setToast(null), 1100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 배경음 ----
  const bgmStopRef = useRef(null);
  const startLoop = (seq, vol, type, gap, dur) => {
    const c = getHAudioCtx();
    c.resume().catch(() => {});
    let running = true;
    let i = 0;
    const step = () => {
      if (!running) return;
      hTone(seq[i % seq.length], 0, dur, type, vol);
      i++;
      setTimeout(step, typeof gap === "function" ? gap(i) : gap);
    };
    step();
    return () => { running = false; };
  };
  // 오프닝 이후 대기 화면: 낮은 드론 + 가끔 들리는 불협 고음 (무서운 분위기)
  const startAmbientBGM = () => {
    const c = getHAudioCtx();
    c.resume().catch(() => {});
    let running = true;
    const tick = () => {
      if (!running) return;
      hTone(55, 0, 4.2, "sine", 0.22);
      hTone(58.3, 0, 4.2, "sine", 0.16);
      if (Math.random() < 0.45) hTone(740 + Math.random() * 500, 1 + Math.random() * 2, 2.2, "sine", 0.025);
      setTimeout(tick, 3600);
    };
    tick();
    return () => { running = false; };
  };
  // 배경음악: 제공받은 mp3를 처음부터 끝까지 반복 재생
  // (브라우저가 자동재생을 막으면 첫 터치/클릭 때 바로 시작)
  const bgmAudioRef = useRef(null);
  useEffect(() => {
    const a = new Audio(HW_BGM);
    a.loop = true;
    a.volume = 0.55;
    bgmAudioRef.current = a;
    const tryPlay = () => { const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); };
    tryPlay();
    const onDown = () => { if (a.paused) tryPlay(); };
    window.addEventListener("pointerdown", onDown, true);
    return () => { window.removeEventListener("pointerdown", onDown, true); a.pause(); bgmAudioRef.current = null; };
  }, []);
  useEffect(() => {
    const a = bgmAudioRef.current;
    if (!a) return;
    if (phase === "fail") { a.pause(); return; } // 실패 영상은 자체 사운드만
    if (a.paused) { const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); }
    a.volume = phase === "playing" && stageIdx === 1 ? 0.35 : 0.55; // 피아노 타일(자체 음)만 조금 낮춤
  }, [phase, stageIdx]);

  // ---- 제한 시간 ----
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === "playing" && elapsed >= HW_TIME_LIMIT) {
      clearTimeout(clearTimerRef.current);
      setFailWhy("time");
      setPhase("fail");
    }
  }, [elapsed, phase]);
  useEffect(() => () => { clearTimeout(clearTimerRef.current); clearTimeout(toastTimerRef.current); }, []);

  const startGame = () => {
    clearTimeout(clearTimerRef.current);
    stageRef.current = 0;
    clearedRef.current = false;
    openedRef.current = Array(HW_LOCKS).fill(false);
    setOpened(openedRef.current);
    setStageIdx(0);
    setCleared(false);
    setElapsed(0);
    setToast(null);
    setRunKey((k) => k + 1);
    setPhase("playing");
  };

  // ok=false: 미션 실패(별 0개) → 자물쇠가 열리지 않고 다음 미션으로
  const clearStage = useCallback((ok = true) => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    const si = stageRef.current;
    if (si >= 1) {
      openedRef.current = openedRef.current.map((v, k) => (k === si - 1 ? ok : v));
      setOpened(openedRef.current);
    }
    setClearOk(ok);
    setCleared(true);
    if (ok) playCorrectSound();
    clearTimerRef.current = setTimeout(() => {
      if (stageRef.current >= HW_STAGES.length - 1) {
        if (openedRef.current.every(Boolean)) setPhase("success");
        else { setFailWhy("locks"); setPhase("fail"); }
      } else {
        stageRef.current += 1;
        setStageIdx(stageRef.current);
      }
      clearedRef.current = false;
      setCleared(false);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const finishGame = useCallback((stars) => clearStage(stars >= 1), [clearStage]);

  // ---- 오프닝 영상 ----
  const autoStartRef = useRef(false);
  const startGameRef = useRef(null);
  const finishCinema = useCallback(() => {
    cinemaSeenRef.current = true;
    setCinemaSeen(true);
    if (autoStartRef.current) {
      autoStartRef.current = false;
      if (startGameRef.current) { startGameRef.current(); return; }
    }
    setPhase("intro");
  }, []);
  // ---- 키오스크 모드: 스마트TV에서 여러 명이 마구 눌러도 방탈출 외 기능이 작동하지 않도록 ----
  useEffect(() => {
    const block = (e) => { if (e.cancelable) e.preventDefault(); };
    const evs = ["contextmenu", "dblclick", "selectstart", "dragstart", "gesturestart", "gesturechange", "gestureend"];
    evs.forEach((n) => document.addEventListener(n, block, { capture: true, passive: false }));
    const onWheel = (e) => { if (e.ctrlKey) block(e); };
    const onTouchMove = (e) => block(e); // 핀치 확대·당겨서 새로고침·스와이프 이동 차단
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0", "s", "p", "u", "a", "f"].includes(k)) block(e);
      if (e.altKey && (k === "arrowleft" || k === "arrowright")) block(e); // 뒤로/앞으로 가기
    };
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    document.addEventListener("keydown", onKey, true);
    // 뒤로가기 버튼으로 페이지가 나가지 않도록 기록 1칸 추가
    try { window.history.pushState({ hw: 1 }, ""); } catch { /* ignore */ }
    const onPop = () => { try { window.history.pushState({ hw: 1 }, ""); } catch { /* ignore */ } };
    window.addEventListener("popstate", onPop);
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overscrollBehavior, body.style.overscrollBehavior, body.style.touchAction];
    html.style.overscrollBehavior = "none"; body.style.overscrollBehavior = "none"; body.style.touchAction = "none";
    return () => {
      evs.forEach((n) => document.removeEventListener(n, block, { capture: true }));
      document.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("popstate", onPop);
      html.style.overscrollBehavior = prev[0]; body.style.overscrollBehavior = prev[1]; body.style.touchAction = prev[2];
    };
  }, []);
  // 완전 처음(문이 열리는 시작 화면)으로 되돌아가기
  const goHome = () => {
    autoStartRef.current = false; cinemaSeenRef.current = false;
    setCinemaSeen(false); setGateReady(false); setPhase("gate");
  };
  // 문이 열린 화면에서 "탈출 시작" → 영상 이어서 재생 → 끝나면 바로 게임 시작
  const beginFromGate = () => {
    // 전체화면으로 전환해 주소창·탭 등 브라우저 UI를 숨김 (지원 안 되면 무시)
    try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); } catch { /* ignore */ }
    autoStartRef.current = true; startCinema();
  };
  const startCinema = () => {
    const v = videoRef.current;
    if (!v) { finishCinema(); return; }
    try { getHAudioCtx().resume().catch(() => {}); } catch { /* ignore */ }
    // 게이트에서 멈춘 지점부터 이어서 재생, 다시보기는 처음부터
    if (phase !== "gate") v.currentTime = 0;
    else if (v.currentTime < HW_GATE_PAUSE - 0.3) v.currentTime = HW_GATE_PAUSE;
    v.muted = false;
    v.volume = 0.5; // 발자국 등 영상 효과음을 줄여 배경음악이 잘 들리게
    setPhase("cinema");
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => finishCinema());
  };
  // 게이트: 무음 자동재생으로 문이 열리는 장면을 보여주고 HW_GATE_PAUSE에서 멈춤
  const onVideoTime = () => {
    const v = videoRef.current;
    if (phase === "gate" && v && !gateReady && v.currentTime >= HW_GATE_PAUSE) {
      v.pause(); // 되감지 않고 그 자리에서 멈춤 (재생 이어갈 때 끊김 방지)
      setGateReady(true);
    }
  };
  // 문이 열린 지점에서 프레임 단위로 정확히 멈춤 (timeupdate는 0.25초 간격이라 늦게 멈추고 되감기가 필요했음)
  useEffect(() => {
    if (phase !== "gate" || gateReady) return undefined;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && !v.paused && v.currentTime >= HW_GATE_PAUSE - 0.04) {
        v.pause();
        setGateReady(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, gateReady]);
  const onVideoCanPlay = () => {
    const v = videoRef.current;
    if (!v || phase !== "gate" || cinemaSeenRef.current || gateReady || v.currentTime > 0.5 || !v.paused) return;
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {
      // 자동재생이 막히면 문 열린 장면으로 바로 이동
      try { v.currentTime = HW_GATE_PAUSE; } catch { /* ignore */ }
      setGateReady(true);
    });
  };
  const skipCinema = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      if (v.duration) v.currentTime = Math.max(0, v.duration - 0.05);
    }
    finishCinema();
  };
  const onVideoMeta = () => {
    const v = videoRef.current;
    if (v && cinemaSeenRef.current && v.duration) v.currentTime = Math.max(0, v.duration - 0.05);
  };

  // 오프닝 재생 중 영상 시간에 맞춰 안내 문구 전환
  useEffect(() => {
    if (phase !== "cinema") { setBriefIdx(-1); return undefined; }
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        const t = v.currentTime;
        const i = HW_BRIEF.findIndex((b) => t >= b.from && t < b.to);
        setBriefIdx((prev) => (prev === i ? prev : i));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);


  // 미리보기 전용: 화면 바로가기 (window.__HW_PREVIEW 가 켜진 페이지에서만 동작)
  if (typeof window !== "undefined" && window.__HW_PREVIEW) {
    window.__hwJump = (t) => {
      clearTimeout(clearTimerRef.current);
      setToast(null);
      const seekMain = (sec) => {
        let n = 0;
        const iv = setInterval(() => {
          const v = videoRef.current; n += 1;
          if (v && v.readyState >= 1) {
            clearInterval(iv);
            try { v.muted = false; v.currentTime = sec < 0 ? Math.max(0, (v.duration || 25) + sec) : sec; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } catch { /* ignore */ }
          } else if (n > 60) clearInterval(iv);
        }, 100);
      };
      if (t === "menu") { autoStartRef.current = false; cinemaSeenRef.current = false; setCinemaSeen(false); setGateReady(false); setPhase("gate"); return; }
      if (t === "brief" || t === "finale") {
        autoStartRef.current = true; cinemaSeenRef.current = false; setCinemaSeen(false); setGateReady(false);
        setPhase("cinema"); seekMain(t === "brief" ? 5.2 : 24.8); return;
      }
      if (t === "success" || t === "fail") { setPhase(t); return; }
      const idx = t === "clear" ? 1 : Number(t);
      stageRef.current = idx; clearedRef.current = false;
      openedRef.current = Array(HW_LOCKS).fill(false); setOpened(openedRef.current); setClearOk(true);
      setStageIdx(idx); setCleared(t === "clear"); setElapsed(0); setRunKey((k) => k + 1); setPhase("playing");
    };
  }
  startGameRef.current = startGame;
  const remaining = Math.max(0, HW_TIME_LIMIT - elapsed);
  const stageProps = { level, onClear: clearStage, notify, sfx };

  return (
    <div
      style={{ backgroundColor: C.hbg, userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none", WebkitTapHighlightColor: "transparent", overscrollBehavior: "none" }}
      className="w-full block hw-root"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={phase === "playing" ? (stageIdx >= 1 ? "mx-auto px-3 py-2" : "mx-auto px-6 py-6") : (phase === "gate" || phase === "cinema" || phase === "intro" || phase === "fail") ? "mx-auto" : "mx-auto px-6 py-6"} style={{ width: phase === "playing" ? (stageIdx >= 1 ? HW_GAME_W + 24 : HW_ARENA_W + 48) : (phase === "gate" || phase === "cinema" || phase === "intro" || phase === "fail") ? 1152 : undefined, maxWidth: phase === "playing" ? undefined : 1152 }}>
        {(phase === "gate" || phase === "cinema" || phase === "intro") && createPortal(
          <HwFullBleed><div
            className="relative overflow-hidden mx-auto"
            style={{ width: 1152, height: 648, backgroundColor: "#000" }}
          >
            <video
              ref={videoRef}
              src={HW_INTRO_VIDEO}
              playsInline
              muted
              preload="auto"
              onTimeUpdate={onVideoTime}
              onCanPlay={onVideoCanPlay}
              onEnded={finishCinema}
              onError={finishCinema}
              onLoadedMetadata={onVideoMeta}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: "contain", filter: phase === "intro" ? "brightness(.7)" : "none" }}
            />

            {phase === "cinema" && (
              <div className="absolute inset-x-0 bottom-0 pointer-events-none"
                style={{ height: 320, background: "linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,0) 100%)" }}>
                {HW_BRIEF.map((b, i) => (
                  <div key={i} className="absolute inset-x-0 text-center px-10"
                    style={{
                      bottom: 96, opacity: briefIdx === i ? 1 : 0,
                      transform: briefIdx === i ? "translateY(0)" : "translateY(10px)",
                      transition: "opacity .9s ease, transform .9s ease",
                      fontFamily: "'East Sea Dokdo', 'Nanum Brush Script', 'Pretendard', serif",
                      fontSize: b.big ? 110 : 54, lineHeight: 1.15, letterSpacing: "0.04em",
                      color: "#e0282d", // 안내문 전체 같은 빨간색
                      textShadow: "0 0 14px #70000099, 2px 3px 0 #0a0000, 0 0 3px #000",
                    }}>
                    {b.lines.map((ln, k) => <div key={k}>{ln}</div>)}
                  </div>
                ))}
              </div>
            )}


            {(phase === "intro" || phase === "gate") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10"
                style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,.15) 0%, rgba(0,0,0,.78) 100%)",
                  opacity: phase === "gate" && !gateReady ? 0 : 1, transition: "opacity .9s", pointerEvents: phase === "gate" && !gateReady ? "none" : "auto" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p className="font-bold tracking-[0.55em] text-base mb-4" style={{ color: "#9a9a9e", paddingLeft: "0.55em" }}>4 PLAYERS</p>
                  <h2 className="font-black mb-5 hw-flicker"
                    style={{ fontFamily: "'Cinzel', 'Pretendard', serif", fontSize: 70, lineHeight: 1.05, color: C.hred, textShadow: `0 0 28px ${C.hred}99, 0 0 60px ${C.hred}44` }}>
                    Haunted Classroom<br />Escape
                  </h2>
                  <p className="text-xl mb-8" style={{ color: "#b5b5ba" }}>
                    제한 시간 <b style={{ color: C.hred }}>5분</b>
                  </p>

                  <button onClick={phase === "gate" ? beginFromGate : startGame}
                    className="px-14 py-5 rounded-full font-black text-3xl flex items-center gap-3 mx-auto"
                    style={{ backgroundColor: C.hred, color: "#0b0b0d", boxShadow: `0 0 40px ${C.hred}66` }}>
                    <Ghost size={32} /> 탈출 시작
                  </button>

                  {phase === "intro" && (
                    <div>
                      <button onClick={startCinema} className="mt-3 text-base font-bold" style={{ color: "#7a7a80" }}>
                        ▶ 오프닝 다시 보기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div></HwFullBleed>, document.body)}

        {phase === "playing" && (
          <div className="relative" key={runKey}>
            <div className="grid items-center mb-3" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
              <span className="text-2xl font-black" style={{ color: "#c9c9cc" }}>
                
              </span>
              <div className="flex items-center gap-2" aria-label="진행 상황">
                {HW_STAGES.slice(1).map((s, i) => {
                  const cur = i === stageIdx - 1;
                  const done = opened[i];
                  const missed = !done && (i < stageIdx - 1 || (cur && cleared));
                  return (
                    <div key={i} className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                      style={{ border: `3px solid ${done ? "#8a1a1f" : cur ? C.hred : C.hborder}`, backgroundColor: done ? "#2a0a0c" : C.hcard, opacity: done ? 0.75 : missed ? 0.4 : 1 }}>
                      {done ? "🔓" : "🔒"}
                    </div>
                  );
                })}
              </div>
              <span className="text-4xl font-black tabular-nums"
                style={{ justifySelf: "end", color: remaining <= 30 ? C.hred : "#c9c9cc", animation: remaining <= 30 ? "pulseGlow 1s ease-in-out infinite" : "none" }}>
                ⏱ {fmtClock(remaining)}
              </span>
            </div>

            {stageIdx === 0 && <StageHands key="s0" {...stageProps} />}
            {stageIdx >= 1 && <StageGame key={`g${stageIdx}`} id={HW_STAGES[stageIdx].id} onFinish={finishGame} />}

          </div>
        )}

        {phase === "success" && (
          <div className="text-center py-10">
            <p style={{ fontFamily: "'East Sea Dokdo', 'Nanum Brush Script', 'Pretendard', serif", fontSize: 72, lineHeight: 1.1, color: "#ff3a3a", textShadow: "0 0 26px #b00000" }}>
              봉인이 풀렸다.
            </p>
            <p className="mt-3 mb-8" style={{ fontFamily: "'East Sea Dokdo', 'Nanum Brush Script', 'Pretendard', serif", fontSize: 58, color: "#d4262c", textShadow: "0 0 20px #7a0000" }}>뒤에 있는 자물쇠를 풀어라.</p>
            <div className="flex items-center justify-center gap-6 mb-12">
              {HW_PASSWORD.split("").map((d, i) => (
                <div key={i} className="flex items-center justify-center font-black"
                  style={{ width: 200, height: 260, borderRadius: 28, backgroundColor: "#0a0505", border: "3px solid #8a1a1f",
                    boxShadow: "0 0 50px #7a000066, inset 0 0 40px #2a0000", color: "#ff3a3a", fontSize: 190, lineHeight: 1,
                    fontFamily: "'Cinzel', 'Pretendard', serif", textShadow: "0 0 30px #e00000, 0 0 70px #a00000" }}>
                  {d}
                </div>
              ))}
            </div>
            <button onClick={goHome}
              className="px-8 py-3 rounded-full font-bold text-lg"
              style={{ backgroundColor: "transparent", color: "#5a4d4d", border: "1px solid #2b0e0e" }}>
              처음 화면
            </button>
          </div>
        )}

        {phase === "fail" && createPortal(
          <HwFullBleed><div
            className="relative overflow-hidden mx-auto"
            style={{ width: 1152, height: 648, backgroundColor: "#000" }}
          >
            <video
              key="failvideo"
              src={HW_FAIL_VIDEO}
              autoPlay
              playsInline
              preload="auto"
              onEnded={() => setFailEnded(true)}
              onError={() => setFailEnded(true)}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: "contain" }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 pb-24 transition-opacity duration-1000"
              style={{ opacity: failEnded ? 1 : 0, pointerEvents: failEnded ? "auto" : "none" }}>
              <p className="text-center" style={{ fontFamily: "'East Sea Dokdo', 'Nanum Brush Script', 'Pretendard', serif", fontSize: 58, lineHeight: 1.25, color: "#d4262c", textShadow: "0 0 22px #7a0000" }}>
                저주는 풀리지 않았다.<br />너희들은 이 곳에서 나갈 수 없다.
              </p>
              <button onClick={goHome}
                className="px-10 py-4 rounded-full font-black text-2xl"
                style={{ backgroundColor: "#8a1a1f", color: "#fff" }}>
                처음으로 돌아가기
              </button>
            </div>
          </div></HwFullBleed>, document.body)}
      </div>

      {toast && (
        <div key={toast.key}
          className={`fixed inset-0 flex items-center justify-center pointer-events-none ${toast.type === "wrong" ? "hw-glitch" : ""}`}
          style={{ zIndex: 9999 }}>
          <div className="font-black text-4xl sm:text-5xl px-12 py-8 rounded-3xl flex items-center gap-4"
            style={{
              backgroundColor: toast.type === "correct" ? "#4a0d11" : "#1c0809",
              color: toast.type === "correct" ? "#ffd9d4" : "#a89c9c",
              border: `3px solid ${toast.type === "correct" ? "#b3181e" : "#4a1a1a"}`,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              animation: "toastPop 1.1s ease forwards",
            }}>
            {toast.text}
          </div>
        </div>
      )}

      <style>{`
        .hw-root, .hw-root * {
          -webkit-tap-highlight-color: transparent;
          -webkit-user-select: none;
          user-select: none;
          overscroll-behavior: none;
        }
        .hw-fog-wrap{ position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:0; }
        .hw-fog-layer{
          position:absolute; width:200%; height:100%; top:0;
          background:linear-gradient(90deg, transparent, rgba(200,200,210,0.06) 40%, rgba(200,200,210,0.1) 50%, rgba(200,200,210,0.06) 60%, transparent);
          animation: hwDriftFog 10s linear infinite;
        }
        .hw-fog-l2{ animation-duration:15s; opacity:0.6; top:15%; }
        @keyframes hwFinaleText{ 0%{ opacity:0; transform:scale(1.07); } 20%{ opacity:1; transform:scale(1); } 75%{ opacity:1; } 100%{ opacity:0; } }
        @keyframes hwTremble{ 0%{ transform:translate(0,0); } 25%{ transform:translate(-3px,2px); } 50%{ transform:translate(3px,-2px); } 75%{ transform:translate(-2px,-2px); } 100%{ transform:translate(0,0); } }
        @keyframes hwFlame{ 0%{ transform:scale(1,1) rotate(-2deg); } 100%{ transform:scale(.92,1.08) rotate(2deg); } }
        @keyframes hwFloat{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-10px); } }
        @keyframes hwFinaleIn{ from{ opacity:0; transform:scale(1.06); } to{ opacity:1; transform:scale(1); } }
        @keyframes hwDriftFog{ from{ transform:translateX(-50%); } to{ transform:translateX(0%); } }
        .hw-drip{
          position:absolute; top:0; width:5px; border-radius:0 0 4px 4px; background:${C.hred};
          animation-name: hwDripFall; animation-timing-function: linear; animation-iteration-count: infinite;
          z-index:0; pointer-events:none;
        }
        @keyframes hwDripFall{
          0%{ height:0; top:0; opacity:0.9; }
          70%{ height:120px; opacity:0.7; }
          100%{ height:120px; top:480px; opacity:0; }
        }
        .hw-flicker{ animation: hwFlicker 4s infinite; }
        .hw-breathe{ animation: hwBreathe 2.2s ease-in-out infinite; }
        @keyframes hwBreathe{ 0%,100%{ opacity:.45; } 50%{ opacity:1; } }
        @keyframes hwFlicker{
          0%,19%,21%,23%,80%,100%{ opacity:1; }
          20%,22%,79%{ opacity:0.3; }
          50%{ opacity:0.88; }
        }
        .hw-glitch{ animation: hwGlitchShake 0.12s 4; }
        @keyframes hwGlitchShake{
          0%{ transform:translate(0,0); }
          25%{ transform:translate(-3px,2px); }
          50%{ transform:translate(3px,-2px); }
          75%{ transform:translate(-2px,-2px); }
          100%{ transform:translate(0,0); }
        }
        @keyframes pulseGlow { 0%,100%{ text-shadow:0 0 0 rgba(240,71,46,0); } 50%{ text-shadow:0 0 14px rgba(240,71,46,.7); } }
        @keyframes toastPop {
          0% { opacity: 0; transform: scale(0.8); }
          15% { opacity: 1; transform: scale(1.05); }
          25% { transform: scale(1); }
          75% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}

/* ================= 화면에 꽉 차게 자동 축소하는 래퍼 (스크롤 방지) ================= */
function FitToScreen({ children, maxScale = 1 }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recalc = () => {
      if (!outerRef.current || !innerRef.current) return;
      const availH = outerRef.current.clientHeight;
      const availW = outerRef.current.clientWidth;
      innerRef.current.style.transform = "scale(1)";
      const naturalH = innerRef.current.scrollHeight;
      const naturalW = innerRef.current.scrollWidth;
      if (!naturalH || !naturalW) return;
      const s = Math.min(maxScale, availH / naturalH, availW / naturalW);
      setScale(s);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", recalc);
    return () => { ro.disconnect(); window.removeEventListener("resize", recalc); };
  }, [children, maxScale]);

  return (
    <div ref={outerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
        {children}
      </div>
    </div>
  );
}

/* ================= App (할로윈 방탈출 단독 실행) ================= */
export default function App() {
  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: C.hbg, fontFamily: "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}>
      <FitToScreen maxScale={2}>
        <HalloweenEvent />
      </FitToScreen>
    </div>
  );
}
