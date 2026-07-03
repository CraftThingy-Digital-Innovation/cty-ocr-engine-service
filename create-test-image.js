import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

// Draw a simple white box with black text
const canvas = createCanvas(500, 200);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 500, 200);

ctx.fillStyle = '#111111';
ctx.font = 'bold 30px sans-serif';
ctx.fillText('PADDLEOCR TEST DENGAN NODE.JS', 30, 70);

ctx.fillStyle = '#444444';
ctx.font = '22px sans-serif';
ctx.fillText('Membaca teks dari gambar dan koordinat layout.', 30, 120);
ctx.fillText('Status: Berhasil Terdeteksi!', 30, 160);

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('test.png', buffer);
console.log('Created test.png successfully.');
