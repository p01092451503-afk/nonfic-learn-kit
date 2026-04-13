/**
 * Generate a refined certificate image using Canvas API.
 */

interface CertificateData {
  studentName: string;
  studentEmail: string;
  courseName: string;
  issuedDate: string;
  certificateNumber: string;
  titleText: string;
  descText: string;
  issuerName: string;
  backgroundImageUrl?: string | null;
}

export const generateCertificateImage = async (data: CertificateData): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  const W = 1754;
  const H = 1240;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  if (data.backgroundImageUrl) {
    try {
      const img = await loadImage(data.backgroundImageUrl);
      ctx.drawImage(img, 0, 0, W, H);
    } catch {
      drawDefaultBackground(ctx, W, H);
    }
  } else {
    drawDefaultBackground(ctx, W, H);
  }

  const cx = W / 2;

  // === Title ===
  ctx.textAlign = "center";
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "300 64px 'Playfair Display', 'Noto Serif KR', serif";
  ctx.letterSpacing = "12px";
  ctx.fillText(data.titleText, cx, 240);
  ctx.letterSpacing = "0px";

  // Thin gold divider
  const grad = ctx.createLinearGradient(cx - 160, 0, cx + 160, 0);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.2, "#b8975a");
  grad.addColorStop(0.5, "#d4af6a");
  grad.addColorStop(0.8, "#b8975a");
  grad.addColorStop(1, "transparent");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 160, 275);
  ctx.lineTo(cx + 160, 275);
  ctx.stroke();

  // === Student Name ===
  ctx.fillStyle = "#111111";
  ctx.font = "600 48px 'Noto Sans KR', sans-serif";
  ctx.fillText(data.studentName, cx, 380);

  // Email / ID
  ctx.font = "300 20px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#888888";
  ctx.fillText(data.studentEmail, cx, 420);

  // === Description ===
  ctx.font = "300 24px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#555555";
  wrapText(ctx, data.descText, cx, 510, W - 400, 36);

  // === Course Name ===
  // Subtle background pill for course name
  const courseText = data.courseName;
  ctx.font = "500 30px 'Noto Sans KR', sans-serif";
  const courseWidth = ctx.measureText(courseText).width;
  const pillPadX = 40;
  const pillPadY = 14;
  const pillY = 640;

  ctx.fillStyle = "#f5f0e8";
  roundRect(ctx, cx - courseWidth / 2 - pillPadX, pillY - 24 - pillPadY, courseWidth + pillPadX * 2, 24 + pillPadY * 2, 8);
  ctx.fill();

  ctx.fillStyle = "#1a1a1a";
  ctx.fillText(courseText, cx, pillY);

  // === Date ===
  ctx.font = "300 20px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#999999";
  ctx.fillText(data.issuedDate, cx, 740);

  // === Certificate Number ===
  ctx.font = "300 16px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#bbbbbb";
  ctx.fillText(`No. ${data.certificateNumber}`, cx, 780);

  // === Issuer ===
  if (data.issuerName) {
    // Signature line first
    const lineGrad = ctx.createLinearGradient(cx - 100, 0, cx + 100, 0);
    lineGrad.addColorStop(0, "transparent");
    lineGrad.addColorStop(0.3, "#cccccc");
    lineGrad.addColorStop(0.7, "#cccccc");
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 100, 940);
    ctx.lineTo(cx + 100, 940);
    ctx.stroke();

    ctx.font = "400 26px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(data.issuerName, cx, 925);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 1.0);
  });
};

function drawDefaultBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Clean white/cream background
  ctx.fillStyle = "#fefcf8";
  ctx.fillRect(0, 0, W, H);

  // Outer border - thin dark line
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, W - 100, H - 100);

  // Inner border - subtle gold
  ctx.strokeStyle = "#d4c5a0";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(65, 65, W - 130, H - 130);

  // Corner accents - small L-shapes
  const cornerSize = 30;
  const offset = 50;
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;

  // Top-left
  drawCorner(ctx, offset, offset, cornerSize, 1, 1);
  // Top-right
  drawCorner(ctx, W - offset, offset, cornerSize, -1, 1);
  // Bottom-left
  drawCorner(ctx, offset, H - offset, cornerSize, 1, -1);
  // Bottom-right
  drawCorner(ctx, W - offset, H - offset, cornerSize, -1, -1);

  // Subtle watermark pattern - very light diagonal lines
  ctx.strokeStyle = "rgba(212, 197, 160, 0.08)";
  ctx.lineWidth = 1;
  for (let i = -H; i < W; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
}

function drawCorner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dx: number, dy: number) {
  ctx.beginPath();
  ctx.moveTo(x + dx * size, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + dy * size);
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split("");
  let line = "";
  let cy = y;
  for (const ch of words) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
