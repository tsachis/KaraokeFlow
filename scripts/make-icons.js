// Renders the KaraokeFlow icon set: three lyric lines, the middle one half "sung".
// Usage: npm i --no-save @resvg/resvg-js && node scripts/make-icons.js assets
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const out = process.argv[2];

function art({ scale, mono }) {
  const gray = mono ? '#FFFFFF' : '#4A4A4A';
  const sung = mono ? '#FFFFFF' : 'url(#sung)';
  return `
  <g transform="translate(512 512) scale(${scale})">
    <rect x="-150" y="-131" width="300" height="40" rx="20" fill="${gray}"/>
    <clipPath id="mid"><rect x="-230" y="-36" width="460" height="72" rx="36"/></clipPath>
    <g clip-path="url(#mid)">
      <rect x="-230" y="-36" width="460" height="72" fill="#FFFFFF"/>
      <rect x="-230" y="-36" width="${mono ? 460 : 290}" height="72" fill="${sung}"/>
    </g>
    <rect x="-170" y="91" width="340" height="40" rx="20" fill="${gray}"/>
  </g>`;
}

function svg({ background, scale, mono = false }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="sung" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#D946EF"/>
    </linearGradient>
  </defs>
  ${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
  ${scale ? art({ scale, mono }) : ''}
</svg>`;
}

function render(name, size, spec) {
  const png = new Resvg(svg(spec), { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(out, name), png);
}

// Adaptive-icon foregrounds must stay inside the central 66% safe zone.
render('android-icon-foreground.png', 1024, { scale: 1.2 });
render('android-icon-background.png', 1024, { background: '#000000' });
render('android-icon-monochrome.png', 1024, { scale: 1.2, mono: true });
render('icon.png', 1024, { background: '#000000', scale: 1.5 });
render('splash-icon.png', 1024, { scale: 1.2 });
render('favicon.png', 48, { background: '#000000', scale: 1.5 });
