/**
 * Generate a certificate PDF using Canvas API and convert to downloadable PDF-like image.
 * For simplicity, generates a high-quality image (PNG) that can be printed as a certificate.
 */

interface CertificateData {
  studentName: string;
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
  const W = 1754; // A4 landscape 150dpi
  const H = 1240;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Draw background
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

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 72px 'Noto Sans KR', sans-serif";
  ctx.fillText(data.titleText, W / 2, 260);

  // Decorative line
  ctx.strokeStyle = "#c9a96e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 295);
  ctx.lineTo(W / 2 + 200, 295);
  ctx.stroke();

  // Student name
  ctx.font = "bold 52px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#1a1a2e";
  ctx.fillText(data.studentName, W / 2, 420);

  // Description
  ctx.font = "28px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#333";
  wrapText(ctx, data.descText, W / 2, 510, W - 300, 40);

  // Course name
  ctx.font = "bold 36px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#1a1a2e";
  ctx.fillText(`[ ${data.courseName} ]`, W / 2, 650);

  // Date
  ctx.font = "24px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#555";
  ctx.fillText(data.issuedDate, W / 2, 780);

  // Certificate number
  ctx.font = "18px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText(`No. ${data.certificateNumber}`, W / 2, 830);

  // Issuer
  if (data.issuerName) {
    ctx.font = "30px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(data.issuerName, W / 2, 950);
    // Signature line
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, 970);
    ctx.lineTo(W / 2 + 120, 970);
    ctx.stroke();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 1.0);
  });
};

function drawDefaultBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Cream background
  ctx.fillStyle = "#fdf8f0";
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = "#c9a96e";
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = "#e8d5b0";
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 55, W - 110, H - 110);

  // Corner decorations
  const corners = [
    [70, 70],
    [W - 70, 70],
    [70, H - 70],
    [W - 70, H - 70],
  ];
  ctx.fillStyle = "#c9a96e";
  corners.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });
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
