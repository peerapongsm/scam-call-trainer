import type { Score } from "./scoring";

export interface ShareCardData {
  score: Score;
  scenarioTitle: string;
  siteUrl: string;
}

const GRADE_EMOJI: Record<Score["grade"], string> = {
  caught: "🚨",
  "narrow-escape": "😮‍💨",
  "close-call": "😅",
  scammed: "😱",
};

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  const W = 1080;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";

  ctx.font = "160px sans-serif";
  ctx.fillText(GRADE_EMOJI[data.score.grade], W / 2, 260);

  ctx.font = "bold 96px sans-serif";
  ctx.fillText(data.score.gradeLabel.replace(/\s*\p{Emoji}+$/u, ""), W / 2, 420);

  ctx.font = "56px sans-serif";
  ctx.fillStyle = "#fbbf24";
  if (data.score.grade === "scammed") {
    ctx.fillText("โดนสายโจรจำลองหลอกเข้าให้แล้ว", W / 2, 540);
  } else {
    ctx.fillText(`จับโจรได้ใน ${data.score.seconds} วินาที`, W / 2, 540);
  }

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "44px sans-serif";
  ctx.fillText(`สาย: ${data.scenarioTitle}`, W / 2, 640);
  ctx.fillText(
    `จับพิรุธได้ ${data.score.caught.length} จุด · ${data.score.points} คะแนน`,
    W / 2,
    710,
  );

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, H - 180, W, 180);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("📱 สายโจรจำลอง — คุณจะรอดไหม?", W / 2, H - 100);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "36px sans-serif";
  ctx.fillText(data.siteUrl, W / 2, H - 40);
}

export async function shareCard(data: ShareCardData): Promise<void> {
  const canvas = document.createElement("canvas");
  drawShareCard(canvas, data);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return;
  const file = new File([blob], "scam-call-result.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "สายโจรจำลอง" });
      return;
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scam-call-result.png";
  a.click();
  URL.revokeObjectURL(a.href);
}
