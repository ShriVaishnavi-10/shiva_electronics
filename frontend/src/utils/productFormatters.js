export const formatProductSpecs = (specifications) => {
  if (!specifications || typeof specifications !== "object") return "";
  const parts = [];
  if (specifications.dimensions) parts.push(`📐 ${specifications.dimensions}`);
  if (specifications.color_finish) parts.push(`🎨 ${specifications.color_finish}`);
  if (specifications.material) parts.push(specifications.material);
  if (specifications.size_capacity) parts.push(specifications.size_capacity);
  if (specifications.ram || specifications.rom) {
    const mem = [
      specifications.ram ? `${specifications.ram} RAM` : "",
      specifications.rom ? `${specifications.rom} ROM` : "",
    ]
      .filter(Boolean)
      .join(" / ");
    if (mem) parts.push(`💾 ${mem}`);
  }
  if (specifications.model_number) parts.push(`Mod: ${specifications.model_number}`);
  if (specifications.energy_rating) parts.push(`⭐ ${specifications.energy_rating}`);
  if (specifications.warranty) parts.push(`🛡️ ${specifications.warranty}`);
  return parts.filter(Boolean).join(" • ");
};

export const parseArrayField = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_) {
      return [val.trim()].filter(Boolean);
    }
  }
  return [];
};

