window.CHARACTERS = window.CHARACTERS || [];

const CHAR_FOLDERS = [
  "garizou",
  "momokappa",
  "tikappa",
  "kurobaneyatyoubee",
  "tunenari",
  "momokawaballade",
  "marcus",
  "rosmomokawaburaza",
  "rahanakappakonbineshon"
];

for (let i = 0; i < CHAR_FOLDERS.length; i++) {
  const folder = CHAR_FOLDERS[i];
  document.write('<script src="characters/' + folder + '/data.js"><\/script>');
}
