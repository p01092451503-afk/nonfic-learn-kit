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
  studentLoginId?: string;
  branchName?: string;
  teamName?: string;
}

export const generateCertificateImage = async (data: CertificateData): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  // Landscape A4-ish proportions matching the reference design
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

  // ====== Layout constants ======
  const BRAND = "#0050A4";          // 메타엠 blue (matches metam-logo)
  const INK = "#0F172A";            // near-black
  const SUB = "#94A3B8";            // muted gray
  const HAIRLINE = "#E5E7EB";       // soft divider
  const PAD_X = 140;                // generous left/right padding

  // === Top: brand (left) + certificate number (right) ===
  ctx.textAlign = "left";
  ctx.font = "700 28px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = BRAND;
  ctx.letterSpacing = "2px";
  ctx.fillText("메타엠 EDUCATION", PAD_X, 200);
  ctx.letterSpacing = "0px";

  ctx.textAlign = "right";
  ctx.font = "400 20px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = SUB;
  ctx.letterSpacing = "3px";
  ctx.fillText("CERTIFICATE NO.", W - PAD_X, 195);
  ctx.letterSpacing = "0px";
  ctx.font = "600 26px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText(data.certificateNumber, W - PAD_X, 235);

  // === Title block ===
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "800 110px 'Noto Sans KR', sans-serif";
  ctx.fillText(data.titleText || "수료증", PAD_X, 410);

  ctx.font = "400 26px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = SUB;
  ctx.letterSpacing = "6px";
  ctx.fillText("CERTIFICATE OF COMPLETION", PAD_X, 460);
  ctx.letterSpacing = "0px";

  // === Description with left blue accent bar ===
  const descTop = 560;
  const descBottom = 690;
  ctx.fillStyle = "#DBEAFE";
  ctx.fillRect(PAD_X, descTop, 4, descBottom - descTop);

  const descCourse = data.courseName || "-";
  const descPlain = `위 사람은 `;
  const descPlain2 = `을(를) 성실히 이수하였기에`;
  const descPlain3 = `이 증서를 수여합니다.`;

  ctx.textAlign = "left";
  ctx.fillStyle = "#334155";
  ctx.font = "400 28px 'Noto Sans KR', sans-serif";

  // Line 1 — mixed weight: "위 사람은 [bold course] 을(를) 성실히 이수하였기에"
  let cursorX = PAD_X + 36;
  const line1Y = descTop + 50;
  ctx.fillText(descPlain, cursorX, line1Y);
  cursorX += ctx.measureText(descPlain).width;

  ctx.font = "700 28px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText(descCourse, cursorX, line1Y);
  cursorX += ctx.measureText(descCourse).width;

  ctx.font = "400 28px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText(descPlain2, cursorX, line1Y);

  // Line 2
  ctx.fillText(descPlain3, PAD_X + 36, line1Y + 50);

  // === Info grid: 2 cols x 3 rows ===
  const colGap = 80;
  const colW = (W - PAD_X * 2 - colGap) / 2;
  const leftX = PAD_X;
  const rightX = PAD_X + colW + colGap;
  const rowYs = [810, 920, 1030];

  const rows: Array<[[string, string], [string, string]]> = [
    [["이름", data.studentName || "-"], ["아이디", data.studentLoginId || data.studentEmail?.split("@")[0] || "-"]],
    [["소속 지사", data.branchName || "메타엠"], ["소속 팀", data.teamName || "-"]],
    [["과정명", data.courseName || "-"], ["수료 일자", data.issuedDate || "-"]],
  ];

  rows.forEach((row, i) => {
    const y = rowYs[i];
    [row[0], row[1]].forEach(([label, value], j) => {
      const x = j === 0 ? leftX : rightX;
      // Label
      ctx.font = "400 18px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = SUB;
      ctx.fillText(label, x, y - 38);
      // Value
      ctx.font = "700 28px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = INK;
      ctx.fillText(value, x, y);
      // Underline
      ctx.strokeStyle = HAIRLINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 18);
      ctx.lineTo(x + colW, y + 18);
      ctx.stroke();
    });
  });

  // === Issuer (small, bottom-left) ===
  if (data.issuerName) {
    ctx.font = "400 18px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = SUB;
    ctx.fillText("발급기관", PAD_X, H - 110);
    ctx.font = "600 22px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = INK;
    ctx.fillText(data.issuerName, PAD_X, H - 80);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 1.0);
  });
};

function drawDefaultBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Pure white card
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Soft outer frame shadow effect — a hairline border around the card
  ctx.strokeStyle = "#EEF2F6";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // Left brand accent bar (matches reference design)
  ctx.fillStyle = "#0050A4";
  ctx.fillRect(0, 0, 14, H);

  // Decorative concentric circles bottom-right (very faint, brand blue)
  const cx = W - 220;
  const cy = H - 180;
  ctx.strokeStyle = "rgba(0, 80, 164, 0.10)";
  ctx.lineWidth = 2;
  [320, 240, 160].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });
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

/**
 * Generate a PDF blob from certificate data (landscape A4, embedded PNG).
 */
export const generateCertificatePdf = async (data: CertificateData): Promise<Blob> => {
  const { jsPDF } = await import("jspdf");
  const pngBlob = await generateCertificateImage(data);
  const dataUrl: string = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(pngBlob);
  });
  // Landscape A4: 297mm x 210mm
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210);
  return pdf.output("blob");
};
