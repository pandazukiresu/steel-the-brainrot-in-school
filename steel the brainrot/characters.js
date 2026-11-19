window.CHARACTERS = window.CHARACTERS || [];

// ★キャラが増えたらこのリストにフォルダ名を1行足すだけ！
const CHAR_FOLDERS = [
  "momokappa",
  // "reimu",
  // "eirin",
];

// 各フォルダの data.js を自動読み込み
CHAR_FOLDERS.forEach(folder => {
  document.write(`<script src="characters/${folder}/data.js"><\/script>`);
});