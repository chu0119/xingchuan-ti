// 将 assets/icon.svg 渲染为各尺寸 PNG，输出到 public/icons/（WXT 会把 public/ 拷到产物根）。
// 运行：node scripts/build-icons.mjs
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets/icon.svg');
const outDir = path.join(root, 'public/icons');

fs.mkdirSync(outDir, { recursive: true });
const svg = fs.readFileSync(svgPath);

for (const size of [16, 32, 48, 128]) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(outDir, `${size}.png`), png);
  console.log(`✓ icons/${size}.png`);
}
console.log('图标生成完成');
