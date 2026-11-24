function stripControlCharacters(value) {
  return Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159) ? " " : character;
    })
    .join("");
}

module.exports = { stripControlCharacters };
