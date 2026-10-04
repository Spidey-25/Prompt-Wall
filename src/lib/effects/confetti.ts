/**
 * Confetti & Visual JS Library Effects Utility
 * Provides lightweight HTML5 Canvas confetti bursts and particle visual effects
 * for security approvals, threat block celebrations, and test suite completions.
 */

export function triggerConfetti(options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
}) {
  if (typeof window === "undefined") return;

  const count = options?.particleCount ?? 60;
  const spread = options?.spread ?? 70;
  const originX = options?.origin?.x ?? 0.5;
  const originY = options?.origin?.y ?? 0.5;
  const colors = options?.colors ?? [
    "#EF4444", // Safe green
    "#DC2626", // PromptWall red
    "#F87171", // Accent gold
    "#3B82F6", // Accent blue
    "#EC4899", // Vivid pink
  ];

  // Try importing canvas-confetti dynamically if available
  import("canvas-confetti")
    .then((confettiModule) => {
      const confetti = confettiModule.default || confettiModule;
      confetti({
        particleCount: count,
        spread: spread,
        origin: { x: originX, y: originY },
        colors: colors,
        disableForReducedMotion: true,
      });
    })
    .catch(() => {
      // Custom lightweight fallback canvas confetti engine
      createCustomCanvasConfetti(count, originX, originY, colors);
    });
}

/**
 * Custom standalone HTML5 Canvas Confetti Burst Engine
 * Used when canvas-confetti package is loading or fallback needed.
 */
function createCustomCanvasConfetti(
  count: number,
  originX: number,
  originY: number,
  colors: string[]
) {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const startX = originX * window.innerWidth;
  const startY = originY * window.innerHeight;

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    vRot: number;
    alpha: number;
  }

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
    const speed = Math.random() * 8 + 4;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      alpha: 1,
    });
  }

  let animationFrame: number;
  const startTime = Date.now();

  const render = () => {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeCount = 0;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.vx *= 0.98; // friction
      p.rotation += p.vRot;
      p.alpha = Math.max(0, 1 - elapsed / 1800);

      if (p.alpha > 0) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      }
    });

    if (activeCount > 0 && elapsed < 2000) {
      animationFrame = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrame);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  };

  render();
}

/**
 * Trigger threat alert particle effect (Red/Red warning pulse)
 */
export function triggerThreatAlertEffect() {
  triggerConfetti({
    particleCount: 40,
    spread: 90,
    origin: { x: 0.5, y: 0.4 },
    colors: ["#EF4444", "#F87171", "#DC2626", "#DC2626"],
  });
}
