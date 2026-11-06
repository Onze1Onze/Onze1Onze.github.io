// Separate drums keep every chamber visible and clickable, even at 60 rounds.
export function chamberPosition(index, capacity) {
  const group = Math.floor(index / 12);
  const count = Math.min(12, capacity - group * 12);
  const angle = (index % 12) / count * Math.PI * 2 - Math.PI / 2;
  const size = count <= 8 ? 22 : 14;
  return {group, x: 48 + Math.cos(angle) * 31, y: 48 + Math.sin(angle) * 31, size};
}
