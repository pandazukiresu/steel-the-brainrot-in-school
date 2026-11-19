window.CHARACTERS = window.CHARACTERS || [];

const CHAR_FOLDERS = [
  "garizou",[cite: 1]
  "momokappa",[cite: 8]
  "tikappa",[cite: 6]
  "kurobaneyatyoubee",[cite: 4]
  "tunenari",[cite: 2]
  "momokawaballade",[cite: 3]
  "marcus",[cite: 7]
  "rosmomokawaburaza",[cite: 9]
  "rahanakappakonbineshon"[cite: 5]
];

CHAR_FOLDERS.forEach(folder => {
  document.write(`<script src="characters/${folder}/data.js"><\/script>`);
});