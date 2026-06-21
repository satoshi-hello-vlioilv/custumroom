import * as THREE from 'three';
import { MAX_ANISO } from './scene.js';
import { shade } from './util.js';

function makeWoodTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const base = '#caa46d';
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  const planks = 7, ph = 512 / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    ctx.fillStyle = shade(base, 0.9 + Math.random() * 0.2);
    ctx.fillRect(0, y, 512, ph - 2);
    // seam
    ctx.fillStyle = 'rgba(74,48,22,0.4)'; ctx.fillRect(0, y + ph - 2, 512, 2);
    ctx.fillStyle = 'rgba(255,240,210,0.18)'; ctx.fillRect(0, y, 512, 1);
    // grain
    for (let g = 0; g < 16; g++) {
      ctx.strokeStyle = `rgba(110,72,34,${0.03 + Math.random()*0.06})`;
      ctx.lineWidth = 1; ctx.beginPath();
      const gy = y + Math.random() * ph;
      ctx.moveTo(0, gy);
      for (let x = 0; x <= 512; x += 24) ctx.lineTo(x, gy + Math.sin(x*0.05+g)*1.8 + (Math.random()-0.5)*1.6);
      ctx.stroke();
    }
    // knot
    if (Math.random() < 0.55) {
      const kx = Math.random()*512, ky = y + ph*0.5, r = 4 + Math.random()*5;
      const grd = ctx.createRadialGradient(kx, ky, 1, kx, ky, r);
      grd.addColorStop(0, 'rgba(82,50,22,0.55)'); grd.addColorStop(1, 'rgba(82,50,22,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(kx, ky, r, 0, 7); ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeWallTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3ece0'; ctx.fillRect(0, 0, 256, 256);
  // soft vertical streaks + grain
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(${Math.random()<0.5?210:255},${200+Math.random()*40|0},${180+Math.random()*40|0},0.05)`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 1, 1 + Math.random()*3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeNoiseTexture() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 170 + Math.random()*70;
    img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeRugTexture(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = hex; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = shade(hex, 1.35); ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, 224, 224);
  ctx.strokeStyle = shade(hex, 0.78); ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, 188, 188);
  // subtle weave
  for (let i = 0; i < 256; i += 6) {
    ctx.strokeStyle = `rgba(0,0,0,0.04)`; ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,256); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeConcreteTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  // base concrete gray
  ctx.fillStyle = '#9ca3a8'; ctx.fillRect(0, 0, s, s);
  // noise / aggregate
  for (let i = 0; i < 18000; i++) {
    const v = Math.random();
    ctx.fillStyle = `rgba(${v < 0.5 ? 80 : 200},${v < 0.5 ? 85 : 205},${v < 0.5 ? 90 : 210},${0.03 + Math.random()*0.06})`;
    ctx.fillRect(Math.random()*s, Math.random()*s, 1 + Math.random()*2, 1 + Math.random()*2);
  }
  // expansion joint grid (every 128px)
  ctx.strokeStyle = 'rgba(50,55,60,0.55)'; ctx.lineWidth = 2;
  for (let i = 128; i < s; i += 128) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
  }
  // joint highlight
  ctx.strokeStyle = 'rgba(180,185,190,0.3)'; ctx.lineWidth = 1;
  for (let i = 128; i < s; i += 128) {
    ctx.beginPath(); ctx.moveTo(i+1, 0); ctx.lineTo(i+1, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i+1); ctx.lineTo(s, i+1); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeTileTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  const tiles = 4, ts = s / tiles, grout = 6;
  ctx.fillStyle = '#3c4654'; ctx.fillRect(0, 0, s, s); // grout color
  for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
    const x = i*ts + grout/2, y = j*ts + grout/2, w = ts - grout;
    const shade = 0.94 + Math.random()*0.1;
    const g = ctx.createLinearGradient(x, y, x+w, y+w);
    g.addColorStop(0, `rgba(${238*shade|0},${240*shade|0},${243*shade|0},1)`);
    g.addColorStop(1, `rgba(${214*shade|0},${219*shade|0},${225*shade|0},1)`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, w);
    // subtle speckle
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(120,128,140,${Math.random()*0.05})`;
      ctx.fillRect(x + Math.random()*w, y + Math.random()*w, 1, 1);
    }
    // sheen highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, w, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeMarbleTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f2ee'; ctx.fillRect(0, 0, s, s);
  // soft cloudy base
  for (let i = 0; i < 40; i++) {
    const x = Math.random()*s, y = Math.random()*s, r = 60 + Math.random()*120;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(210,208,202,${0.04 + Math.random()*0.05})`);
    g.addColorStop(1, 'rgba(210,208,202,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  // veins
  for (let v = 0; v < 14; v++) {
    ctx.strokeStyle = `rgba(${90+Math.random()*40|0},${90+Math.random()*40|0},${95+Math.random()*40|0},${0.18+Math.random()*0.25})`;
    ctx.lineWidth = 0.6 + Math.random()*2;
    ctx.beginPath();
    let x = Math.random()*s, y = Math.random()*s; ctx.moveTo(x, y);
    const steps = 8 + Math.random()*10;
    for (let i = 0; i < steps; i++) { x += (Math.random()-0.5)*90; y += (Math.random()-0.5)*90; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeCarpetTexture() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9c2b4'; ctx.fillRect(0, 0, s, s);
  // dense fiber speckle
  for (let i = 0; i < 26000; i++) {
    const v = 180 + Math.random()*55;
    ctx.fillStyle = `rgba(${v},${v-6},${v-18},${0.12 + Math.random()*0.18})`;
    ctx.fillRect(Math.random()*s, Math.random()*s, 1, 1 + Math.random()*1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeTatamiTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cdbf86'; ctx.fillRect(0, 0, s, s);
  const mats = 2, ms = s / mats;
  for (let i = 0; i < mats; i++) for (let j = 0; j < mats; j++) {
    const x = i*ms, y = j*ms;
    // alternate weave direction per mat for the classic checker look
    const horizontal = (i + j) % 2 === 0;
    ctx.save(); ctx.beginPath(); ctx.rect(x+4, y+4, ms-8, ms-8); ctx.clip();
    ctx.strokeStyle = 'rgba(150,135,80,0.4)'; ctx.lineWidth = 1;
    for (let k = 0; k < ms; k += 4) {
      ctx.beginPath();
      if (horizontal) { ctx.moveTo(x, y+k); ctx.lineTo(x+ms, y+k); }
      else { ctx.moveTo(x+k, y); ctx.lineTo(x+k, y+ms); }
      ctx.stroke();
    }
    ctx.restore();
    // dark cloth border (heri)
    ctx.fillStyle = '#2f3a2a';
    ctx.fillRect(x+2, y+2, ms-4, 5); ctx.fillRect(x+2, y+ms-7, ms-4, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makeBrickTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#caa593'; ctx.fillRect(0, 0, s, s); // mortar
  const rows = 8, bh = s / rows, bw = s / 4;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw / 2);
    for (let b = -1; b < 4; b++) {
      const x = b*bw + offset + 4, y = r*bh + 4, w = bw - 8, h = bh - 8;
      const base = [178, 92, 72];
      const f = 0.85 + Math.random()*0.3;
      ctx.fillStyle = `rgb(${base[0]*f|0},${base[1]*f|0},${base[2]*f|0})`;
      ctx.fillRect(x, y, w, h);
      // speckle on each brick
      for (let k = 0; k < 30; k++) {
        ctx.fillStyle = `rgba(${60+Math.random()*40|0},30,20,${Math.random()*0.12})`;
        ctx.fillRect(x + Math.random()*w, y + Math.random()*h, 1.5, 1.5);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

function makePanelTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e9e2d4'; ctx.fillRect(0, 0, s, s);
  // vertical wainscot panels
  const panels = 4, pw = s / panels;
  for (let i = 0; i < panels; i++) {
    const x = i*pw;
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x + pw - 3, 0, 3, s);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 2, 0, 2, s);
    // inset rectangle
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 14, 40, pw - 30, s - 80);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 16, 42, pw - 34, s - 84);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

// 玄関タイル (三和土風): warm gray-beige stone tiles, small square pattern + grout
function makeGenkanTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  const tiles = 6, ts = s / tiles, grout = 4;
  ctx.fillStyle = '#b8ad9b'; ctx.fillRect(0, 0, s, s); // grout
  for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
    const x = i*ts + grout/2, y = j*ts + grout/2, w = ts - grout;
    const f = 0.92 + Math.random()*0.14;
    ctx.fillStyle = `rgb(${0xdd*f|0},${0xd6*f|0},${0xc8*f|0})`;
    ctx.fillRect(x, y, w, w);
    // stone speckle
    for (let k = 0; k < 55; k++) {
      const v = Math.random();
      ctx.fillStyle = `rgba(${v<0.5?120:230},${v<0.5?112:222},${v<0.5?98:205},${0.05+Math.random()*0.12})`;
      ctx.fillRect(x + Math.random()*w, y + Math.random()*w, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x, y, w, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

// 土: brown earth, irregular speckles + small pebbles
function makeDirtTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a6a47'; ctx.fillRect(0, 0, s, s);
  // mottled darker/lighter earth
  for (let i = 0; i < 600; i++) {
    const x = Math.random()*s, y = Math.random()*s, r = 4 + Math.random()*30;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    const dark = Math.random() < 0.5;
    g.addColorStop(0, `rgba(${dark?90:170},${dark?68:135},${dark?44:95},${0.05+Math.random()*0.12})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  // pebbles
  for (let i = 0; i < 120; i++) {
    const x = Math.random()*s, y = Math.random()*s, r = 1.5 + Math.random()*3.5;
    const v = 130 + Math.random()*80;
    ctx.fillStyle = `rgba(${v},${v-18},${v-40},0.6)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

// 草 (wild grass): varied green blades / noise, uneven, darker patches
function makeGrassTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5f8a44'; ctx.fillRect(0, 0, s, s);
  // darker/lighter patches
  for (let i = 0; i < 140; i++) {
    const x = Math.random()*s, y = Math.random()*s, r = 20 + Math.random()*60;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    const dark = Math.random() < 0.5;
    g.addColorStop(0, `rgba(${dark?60:120},${dark?100:150},${dark?40:80},${0.06+Math.random()*0.10})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  // blades
  for (let i = 0; i < 4200; i++) {
    const x = Math.random()*s, y = Math.random()*s, len = 3 + Math.random()*7;
    const g = 110 + Math.random()*70;
    ctx.strokeStyle = `rgba(${40+Math.random()*40|0},${g},${30+Math.random()*40|0},${0.4+Math.random()*0.4})`;
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random()-0.5)*3, y - len); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

// 芝生 (manicured lawn): even green with subtle mowing stripes
function makeLawnTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6fa050'; ctx.fillRect(0, 0, s, s);
  // mowing stripes (alternating horizontal bands)
  const bands = 8, bh = s / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = (i % 2 === 0) ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, i*bh, s, bh);
  }
  // fine even blade noise
  for (let i = 0; i < 6000; i++) {
    const x = Math.random()*s, y = Math.random()*s;
    const g = 140 + Math.random()*50;
    ctx.fillStyle = `rgba(${60+Math.random()*30|0},${g},${50+Math.random()*30|0},${0.18+Math.random()*0.2})`;
    ctx.fillRect(x, y, 1, 1 + Math.random()*1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

// ヘリンボーンパーケット (herringbone parquet)
function makeParquetTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(0, 0, s, s);
  const pw = 80, ph = 24; // plank cell
  const colors = ['#b07840','#8c5e2a','#c49050','#9a6835','#d4a868'];
  for (let row = -2; row < s/ph + 2; row++) {
    for (let col = -2; col < s/pw + 2; col++) {
      const even = (row + col) % 2 === 0;
      ctx.save();
      const cx = col * pw + (even ? 0 : ph), cy = row * ph;
      ctx.translate(cx + pw/2, cy + ph/2);
      ctx.rotate(even ? 0 : Math.PI/2);
      const cl = colors[Math.abs(row * 7 + col * 3) % colors.length];
      const f = 0.92 + Math.random()*0.14;
      ctx.fillStyle = shade(cl, f);
      ctx.fillRect(-pw/2 + 1, -ph/2 + 1, pw - 2, ph - 2);
      // grain lines
      for (let g = 0; g < 5; g++) {
        ctx.strokeStyle = `rgba(60,30,10,${0.04+Math.random()*0.05})`;
        ctx.lineWidth = 0.5; ctx.beginPath();
        const gy = -ph/2 + 3 + g * (ph - 4)/4;
        ctx.moveTo(-pw/2 + 1, gy); ctx.lineTo(pw/2 - 1, gy + (Math.random()-0.5)*2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,220,160,0.08)'; ctx.fillRect(-pw/2+1, -ph/2+1, pw-2, 2);
      ctx.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
// ダーク木目フローリング
function makeDarkWoodTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  const base = '#3a2414';
  ctx.fillStyle = base; ctx.fillRect(0, 0, s, s);
  const planks = 6, ph = s / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    const f = 0.88 + Math.random()*0.24;
    ctx.fillStyle = shade(base, f); ctx.fillRect(0, y, s, ph - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, y + ph - 2, s, 2);
    ctx.fillStyle = 'rgba(200,160,100,0.10)'; ctx.fillRect(0, y, s, 1);
    for (let g = 0; g < 20; g++) {
      ctx.strokeStyle = `rgba(${100+Math.random()*40|0},${60+Math.random()*30|0},${20+Math.random()*20|0},${0.04+Math.random()*0.07})`;
      ctx.lineWidth = 1; ctx.beginPath();
      const gy = y + Math.random()*ph;
      ctx.moveTo(0, gy);
      for (let x = 0; x <= s; x += 20) ctx.lineTo(x, gy + Math.sin(x*0.04+g)*2 + (Math.random()-0.5)*1.5);
      ctx.stroke();
    }
    if (Math.random() < 0.4) {
      const kx = Math.random()*s, ky = y + ph*0.5, r = 5+Math.random()*8;
      const gr = ctx.createRadialGradient(kx,ky,1,kx,ky,r);
      gr.addColorStop(0,'rgba(30,15,5,0.6)'); gr.addColorStop(1,'rgba(30,15,5,0)');
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(kx,ky,r,0,7); ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
// ゴム床 (工場用クッション床)
function makeRubberTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#252525'; ctx.fillRect(0, 0, s, s);
  // raised dot pattern
  const sp = 24;
  for (let x = sp/2; x < s; x += sp) for (let y = sp/2; y < s; y += sp) {
    const gr = ctx.createRadialGradient(x,y,1,x,y,sp/2-2);
    gr.addColorStop(0,'rgba(80,80,80,0.7)'); gr.addColorStop(0.5,'rgba(50,50,50,0.4)'); gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x,y,sp/2-2,0,7); ctx.fill();
  }
  for (let i=0; i<200; i++) {
    const v = 35+Math.random()*20;
    ctx.fillStyle = `rgba(${v},${v},${v},0.3)`;
    ctx.fillRect(Math.random()*s, Math.random()*s, 1+Math.random()*2, 1+Math.random()*2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
// 縞鋼板 (チェッカープレート)
function makeCheckerPlateTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#707880'; ctx.fillRect(0, 0, s, s);
  // diagonal raised ribs
  const sp = 28;
  for (let d = -s; d < s*2; d += sp) {
    ctx.save();
    ctx.strokeStyle = 'rgba(180,190,200,0.7)'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + s, s); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(d+2, 0); ctx.lineTo(d + s+2, s); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,45,50,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(d+9, 0); ctx.lineTo(d + s+9, s); ctx.stroke();
    ctx.restore();
  }
  for (let d = s*2; d > -s; d -= sp) {
    ctx.strokeStyle = 'rgba(160,170,180,0.3)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - s, s); ctx.stroke();
  }
  // base metal noise
  for (let i=0; i<3000; i++) {
    const v=160+Math.random()*60;
    ctx.fillStyle = `rgba(${v},${v+5},${v+8},0.04)`;
    ctx.fillRect(Math.random()*s, Math.random()*s, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
// エポキシ塗床 (工場グリーン)
function makeEpoxyTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a7040'; ctx.fillRect(0, 0, s, s);
  // very subtle aggregate sparkle
  for (let i=0; i<4000; i++) {
    const v = Math.random();
    ctx.fillStyle = `rgba(${v<0.3?200:60},${v<0.3?230:100},${v<0.3?210:50},${0.04+Math.random()*0.06})`;
    ctx.fillRect(Math.random()*s, Math.random()*s, 1, 1);
  }
  // expansion joints
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3;
  for (let i=128; i<s; i+=128) {
    ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(s,i); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  for (let i=128; i<s; i+=128) {
    ctx.beginPath(); ctx.moveTo(i+2,0); ctx.lineTo(i+2,s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i+2); ctx.lineTo(s,i+2); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
// テラコッタ六角タイル
function makeTerracottaTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a5a3a'; ctx.fillRect(0, 0, s, s);
  const r = 36, h = r * Math.sqrt(3);
  for (let row = -1; row < s/h + 1; row++) {
    for (let col = -1; col < s/(r*1.5) + 1; col++) {
      const cx = col * r * 3 + (row % 2) * r * 1.5;
      const cy = row * h;
      const f = 0.88 + Math.random()*0.22;
      const colors = ['#c8724a','#d4845a','#b8623c','#e09068','#aa5230'];
      ctx.fillStyle = shade(colors[Math.abs(row*5+col*3)%colors.length], f);
      ctx.beginPath();
      for (let i=0; i<6; i++) {
        const a = Math.PI/6 + i*Math.PI/3;
        i===0 ? ctx.moveTo(cx+Math.cos(a)*(r-2), cy+Math.sin(a)*(r-2)) : ctx.lineTo(cx+Math.cos(a)*(r-2), cy+Math.sin(a)*(r-2));
      }
      ctx.closePath(); ctx.fill();
      // highlight
      ctx.fillStyle = 'rgba(255,200,150,0.07)';
      ctx.beginPath();
      for (let i=0; i<6; i++) { const a=Math.PI/6+i*Math.PI/3; i===0?ctx.moveTo(cx+Math.cos(a)*(r-2),cy+Math.sin(a)*(r-2)-1):ctx.lineTo(cx+Math.cos(a)*(r-2),cy+Math.sin(a)*(r-2)-1); }
      ctx.closePath(); ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
// 石畳
function makeStoneTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a7270'; ctx.fillRect(0, 0, s, s);
  const stones = [];
  for (let i=0; i<80; i++) {
    stones.push({ x: Math.random()*s, y: Math.random()*s, rx: 22+Math.random()*28, ry: 16+Math.random()*22, a: Math.random()*Math.PI });
  }
  stones.forEach(st => {
    const f = 0.82+Math.random()*0.28;
    const base = 165+Math.random()*40;
    ctx.save();
    ctx.translate(st.x,st.y); ctx.rotate(st.a);
    ctx.fillStyle = `rgb(${base*f|0},${(base-8)*f|0},${(base-15)*f|0})`;
    ctx.beginPath(); ctx.ellipse(0,0,st.rx-2,st.ry-2,0,0,Math.PI*2); ctx.fill();
    // texture speckles
    for (let k=0; k<30; k++) {
      const v=Math.random()<0.5?0.7:1.3;
      ctx.fillStyle=`rgba(${base*v|0},${base*v|0},${base*v|0},0.08)`;
      ctx.fillRect((Math.random()-0.5)*st.rx*1.5,(Math.random()-0.5)*st.ry*1.5,1.5,1.5);
    }
    // top highlight
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(0,-st.ry*0.25,st.rx*0.6,st.ry*0.25,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

const woodTex = makeWoodTexture();
const concreteTex = makeConcreteTexture();
const wallTexSrc = makeWallTexture();
const noiseTex = makeNoiseTexture();
const tileTex = makeTileTexture();
const marbleTex = makeMarbleTexture();
const carpetTex = makeCarpetTexture();
const tatamiTex = makeTatamiTexture();
const brickTex = makeBrickTexture();
const panelTex = makePanelTexture();
const genkanTex = makeGenkanTexture();
const dirtTex = makeDirtTexture();
const grassTex = makeGrassTexture();
const lawnTex = makeLawnTexture();
const parquetTex = makeParquetTexture();
const darkWoodTex = makeDarkWoodTexture();
const rubberTex = makeRubberTexture();
const checkerTex = makeCheckerPlateTexture();
const epoxyTex = makeEpoxyTexture();
const terracottaTex = makeTerracottaTexture();
const stoneTex = makeStoneTexture();

const FLOOR_TYPES = {
  wood:          { name: '木目フローリング',  tex: woodTex,      color: 0xffffff, rough: 0.72, metal: 0.02, per: 2.2 },
  parquet:       { name: 'ヘリンボーン',      tex: parquetTex,   color: 0xffffff, rough: 0.65, metal: 0.02, per: 1.8 },
  dark_wood:     { name: 'ダーク木目',        tex: darkWoodTex,  color: 0xffffff, rough: 0.68, metal: 0.02, per: 2.2 },
  concrete:      { name: 'コンクリート',      tex: concreteTex,  color: 0xb0b8bc, rough: 0.92, metal: 0.04, per: 2.2 },
  tile:          { name: 'タイル',            tex: tileTex,      color: 0xffffff, rough: 0.35, metal: 0.05, per: 1.5 },
  marble:        { name: '大理石',            tex: marbleTex,    color: 0xffffff, rough: 0.18, metal: 0.06, per: 3.0 },
  carpet:        { name: 'カーペット',        tex: carpetTex,    color: 0xc9c2b4, rough: 0.98, metal: 0.0,  per: 1.2 },
  tatami:        { name: '畳',                tex: tatamiTex,    color: 0xffffff, rough: 0.85, metal: 0.0,  per: 0.9 },
  genkan:        { name: '玄関タイル',        tex: genkanTex,    color: 0xffffff, rough: 0.55, metal: 0.03, per: 1.0 },
  terracotta:    { name: 'テラコッタタイル',  tex: terracottaTex,color: 0xffffff, rough: 0.75, metal: 0.0,  per: 1.2 },
  stone:         { name: '石畳',              tex: stoneTex,     color: 0xffffff, rough: 0.88, metal: 0.0,  per: 2.0 },
  rubber:        { name: 'ゴム床',            tex: rubberTex,    color: 0x808080, rough: 0.95, metal: 0.0,  per: 1.0 },
  checker_plate: { name: '縞鋼板',            tex: checkerTex,   color: 0xaaaaaa, rough: 0.55, metal: 0.5,  per: 1.5 },
  epoxy:         { name: 'エポキシ塗床',      tex: epoxyTex,     color: 0xffffff, rough: 0.25, metal: 0.08, per: 3.0 },
  dirt:          { name: '土',                tex: dirtTex,      color: 0xffffff, rough: 1.0,  metal: 0.0,  per: 2.0 },
  grass:         { name: '草',                tex: grassTex,     color: 0xffffff, rough: 1.0,  metal: 0.0,  per: 1.5 },
  lawn:          { name: '芝生',              tex: lawnTex,      color: 0xffffff, rough: 0.98, metal: 0.0,  per: 1.8 },
};
const WALL_TYPES = {
  cream:    { name: 'クリーム壁紙',  tex: wallTexSrc, color: 0xfbf6ec, rough: 0.95, metal: 0.0 },
  white:    { name: 'ホワイト',      tex: wallTexSrc, color: 0xf7f7f5, rough: 0.9,  metal: 0.0 },
  navy:     { name: 'ネイビー',      tex: wallTexSrc, color: 0x3c4a63, rough: 0.9,  metal: 0.0 },
  sage:     { name: 'セージグリーン', tex: wallTexSrc, color: 0x8a9a7b, rough: 0.9,  metal: 0.0 },
  panel:    { name: '腰壁パネル',    tex: panelTex,   color: 0xffffff, rough: 0.85, metal: 0.0 },
  brick:    { name: 'レンガ',        tex: brickTex,   color: 0xffffff, rough: 0.92, metal: 0.0 },
  concrete: { name: '打ちっぱなし',   tex: concreteTex, color: 0xc2c6ca, rough: 0.95, metal: 0.02 },
  wood:     { name: '木目パネル',    tex: woodTex,    color: 0xcaa46d, rough: 0.7,  metal: 0.02 },
  charcoal: { name: 'チャコール',    tex: wallTexSrc, color: 0x44474c, rough: 0.88, metal: 0.0 },
  terracotta:{ name: 'テラコッタ',   tex: wallTexSrc, color: 0xc08457, rough: 0.92, metal: 0.0 },
  mint:     { name: 'ミントグリーン', tex: wallTexSrc, color: 0xa9d4c2, rough: 0.9,  metal: 0.0 },
  blush:    { name: 'ブラッシュピンク',tex: wallTexSrc, color: 0xe6c4c0, rough: 0.9,  metal: 0.0 },
  mustard:  { name: 'マスタード',    tex: wallTexSrc, color: 0xc8a64b, rough: 0.9,  metal: 0.0 },
  tile:     { name: 'タイル壁',      tex: tileTex,    color: 0xffffff, rough: 0.4,  metal: 0.05 },
  marble:   { name: '大理石壁',      tex: marbleTex,  color: 0xffffff, rough: 0.2,  metal: 0.05 },
};

export { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES };
