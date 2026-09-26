// The encrypted invitation's scrambled look (Milestone 19): every letter becomes a code glyph; spaces and the rough
// shape of the words stay, so it reads as a real message that can't be read yet. `tick` shifts a few glyphs so it
// flickers; the same tick always gives the same text.
const GLYPHS = '#%&@*▲△◆◇■□●○▓▒░≡¤§';

export function scramble(str, tick = 0) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (/\s/.test(ch)) {
      out += ch;
      continue;
    }
    const k = (ch.charCodeAt(0) * 7 + i * 3 + (i % 11 === tick % 11 ? tick : 0)) % GLYPHS.length;
    out += GLYPHS[k];
  }
  return out;
}
