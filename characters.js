window.CHARACTERS = window.CHARACTERS || [];

const CHAR_FOLDERS = [
  "momokappa"
];

CHAR_FOLDERS.forEach(folder => {
  document.write(`<script src="characters/${folder}/data.js"><\/script>`);
});
