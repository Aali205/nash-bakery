// Blocks copying, cutting and dragging text or images out of the page.
// (CSS in style.css already stops text from being selected.)
const editable = (el) => el?.closest?.('input, textarea, [contenteditable="true"]');
['copy', 'cut', 'dragstart', 'selectstart'].forEach((type) =>
  document.addEventListener(type, (e) => { if (!editable(e.target)) e.preventDefault(); }));
