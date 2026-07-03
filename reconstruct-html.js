import { loadImage } from '@napi-rs/canvas';
import { performOcr } from './src/ocr-service.js';
import fs from 'fs';

async function run() {
  const imagePath = 'test-image-2.jpg';
  
  if (!fs.existsSync(imagePath)) {
    console.error(`Error: File ${imagePath} not found in the workspace.`);
    return;
  }

  // 1. Get original image dimensions using napi-rs canvas
  console.log(`Loading image ${imagePath}...`);
  const img = await loadImage(imagePath);
  const width = img.width;
  const height = img.height;
  console.log(`Image dimensions: ${width}x${height}px`);

  // 2. Perform PaddleOCR and layout extraction
  console.log('Running PaddleOCR on image...');
  const ocrResult = await performOcr(imagePath);
  console.log(`OCR Complete. Detected ${ocrResult.lines.length} layout lines.`);

  // 3. Construct HTML containing absolute-positioned elements
  let html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rekonstruksi OCR - test-image-2.jpg</title>
    <style>
        body {
            margin: 0;
            padding: 30px;
            background-color: #0f172a;
            color: #f1f5f9;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .header {
            margin-bottom: 20px;
            text-align: center;
        }
        .controls {
            margin-bottom: 25px;
            display: flex;
            gap: 15px;
        }
        button {
            padding: 10px 20px;
            border: 1px solid #334155;
            border-radius: 6px;
            background-color: #1e293b;
            color: #f1f5f9;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        button:hover {
            background-color: #334155;
            border-color: #475569;
        }
        button.active {
            background-color: #3b82f6;
            border-color: #3b82f6;
        }
        .container {
            position: relative;
            width: ${width}px;
            height: ${height}px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            overflow: hidden;
        }
        .background-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('${imagePath}');
            background-size: 100% 100%;
            opacity: 0.45;
            transition: opacity 0.3s;
            pointer-events: none;
            z-index: 1;
        }
        .text-overlay {
            position: absolute;
            border: 1px dashed rgba(239, 68, 68, 0.3);
            color: #000000;
            display: flex;
            align-items: center;
            font-family: monospace, sans-serif;
            white-space: nowrap;
            box-sizing: border-box;
            background-color: rgba(253, 224, 71, 0.08);
            z-index: 2;
            cursor: pointer;
            line-height: 1;
            transition: background-color 0.2s, border-color 0.2s;
        }
        .text-overlay:hover {
            background-color: rgba(253, 224, 71, 0.35);
            border-color: rgba(239, 68, 68, 0.8);
            z-index: 10;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PaddleOCR Layout Reconstruction</h1>
        <p>Original Dimensions: <b>${width}x${height}px</b> | Detected Lines: <b>${ocrResult.lines.length}</b></p>
    </div>
    
    <div class="controls">
        <button id="btn-bg" class="active" onclick="toggleBackground()">Toggle Background Image (45%)</button>
        <button id="btn-border" class="active" onclick="toggleBorders()">Toggle Text Borders</button>
    </div>
    
    <div class="container">
        <div id="bg-img" class="background-image"></div>
`;

  // Place absolute positioned overlay for each detected text line
  ocrResult.lines.forEach((line) => {
    const { x, y, width: w, height: h } = line.box;
    
    // Estimate font size based on bounding box height
    const fontSize = Math.max(8, Math.round(h * 0.75));
    
    const escapedText = line.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
      
    html += `        <div class="text-overlay" style="left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; font-size: ${fontSize}px;" title="Text: ${escapedText}\nBox: x:${x}, y:${y}, w:${w}, h:${h}">
            ${escapedText}
        </div>\n`;
  });

  html += `    </div>

    <script>
        function toggleBackground() {
            const bg = document.getElementById('bg-img');
            const btn = document.getElementById('btn-bg');
            if (bg.style.opacity === '0') {
                bg.style.opacity = '0.45';
                btn.classList.add('active');
            } else {
                bg.style.opacity = '0';
                btn.classList.remove('active');
            }
        }
        function toggleBorders() {
            const btn = document.getElementById('btn-border');
            const overlays = document.querySelectorAll('.text-overlay');
            const hasBorders = btn.classList.contains('active');
            
            overlays.forEach(el => {
                if (hasBorders) {
                    el.style.border = 'none';
                    el.style.backgroundColor = 'transparent';
                } else {
                    el.style.border = '1px dashed rgba(239, 68, 68, 0.3)';
                    el.style.backgroundColor = 'rgba(253, 224, 71, 0.08)';
                }
            });
            
            if (hasBorders) {
                btn.classList.remove('active');
            } else {
                btn.classList.add('active');
            }
        }
    </script>
</body>
</html>`;

  fs.writeFileSync('reconstruction.html', html);
  console.log('\n================================================================');
  console.log('SUCCESS: HTML reconstruction saved as "reconstruction.html"');
  console.log('================================================================\n');
}

run().catch(console.error);
