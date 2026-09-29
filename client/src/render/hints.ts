import type { HintIcon } from '@croma/shared';

/** Glifo do ícone de pista, centrado em (0,0), ~12px. */
export function drawHintGlyph(ctx: CanvasRenderingContext2D, icon: HintIcon, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (icon) {
    case 'inspect':
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(-1.5, -1.5, 4.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(1.8, 1.8);
      ctx.lineTo(5.2, 5.2);
      ctx.stroke();
      break;
    case 'interact':
      ctx.beginPath();
      ctx.moveTo(-4.5, 6);
      ctx.lineTo(-5.5, 0);
      ctx.lineTo(-4.2, -1);
      ctx.lineTo(-3, 1);
      ctx.lineTo(-3, -5);
      ctx.quadraticCurveTo(-2.2, -6.2, -1.4, -5);
      ctx.lineTo(-1.4, -1);
      ctx.lineTo(-1.2, -6.5);
      ctx.quadraticCurveTo(-0.3, -7.6, 0.6, -6.5);
      ctx.lineTo(0.6, -1);
      ctx.lineTo(1, -5.8);
      ctx.quadraticCurveTo(1.9, -6.9, 2.8, -5.8);
      ctx.lineTo(2.8, -0.5);
      ctx.lineTo(3.3, -3.8);
      ctx.quadraticCurveTo(4.2, -4.8, 5, -3.8);
      ctx.lineTo(4.6, 3);
      ctx.quadraticCurveTo(3.8, 6, 1.5, 6);
      ctx.closePath();
      ctx.fill();
      break;
    case 'document':
      ctx.beginPath();
      ctx.moveTo(-4.5, -6);
      ctx.lineTo(2, -6);
      ctx.lineTo(4.5, -3.5);
      ctx.lineTo(4.5, 6);
      ctx.lineTo(-4.5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2ece2';
      for (let i = 0; i < 3; i++) ctx.fillRect(-2.8, -2.2 + i * 2.6, 5.6, 1.1);
      break;
    case 'gear': {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? 6.4 : 4.6;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2ece2';
      ctx.beginPath();
      ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'alert':
      ctx.fillRect(-1.4, -6, 2.8, 8);
      ctx.fillRect(-1.4, 3.5, 2.8, 2.6);
      break;
  }
}

/** Balão branco com glifo (igual aos ícones de interação da referência). (x,y) = ponta da cauda. */
export function drawHintIcon(ctx: CanvasRenderingContext2D, x: number, y: number, icon: HintIcon, hidden: boolean, hover: boolean) {
  // quadrado escuro com borda âmbar acesa (como no tabuleiro de referência)
  const w = 32;
  const h = 30;
  const bx = x - w / 2;
  const by = y - h - 7;
  const r = 6;
  ctx.save();
  ctx.globalAlpha = hidden ? 0.6 : 1;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + w - r, by);
    ctx.quadraticCurveTo(bx + w, by, bx + w, by + r);
    ctx.lineTo(bx + w, by + h - r);
    ctx.quadraticCurveTo(bx + w, by + h, bx + w - r, by + h);
    ctx.lineTo(x + 5, by + h);
    ctx.lineTo(x, y - 1);
    ctx.lineTo(x - 5, by + h);
    ctx.lineTo(bx + r, by + h);
    ctx.quadraticCurveTo(bx, by + h, bx, by + h - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
  };
  shape();
  ctx.shadowColor = hidden ? 'rgba(0,0,0,0.6)' : hover ? 'rgba(255,200,110,0.95)' : 'rgba(255,186,90,0.6)';
  ctx.shadowBlur = hover ? 16 : 11;
  ctx.fillStyle = '#141211';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = hidden ? '#b3261e' : hover ? 'rgba(255,226,170,1)' : 'rgba(255,214,150,0.88)';
  if (hidden) ctx.setLineDash([3, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(x, by + h / 2);
  ctx.scale(1.3, 1.3);
  drawHintGlyph(ctx, icon, '#f4efe6');
  ctx.restore();
}
