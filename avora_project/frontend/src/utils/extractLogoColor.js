/**
 * Dynamically extract the dominant brand color from a bank's official logo
 * and compute an authentic luxury dark-card gradient with zero hardcoding.
 */

const colorCache = new Map();

export const extractBrandGradient = (imageSrc) => {
  return new Promise((resolve) => {
    if (!imageSrc) return resolve(null);
    if (colorCache.has(imageSrc)) {
      return resolve(colorCache.get(imageSrc));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let maxSat = 0;
        let bestR = 11, bestG = 30, bestB = 63; // Default Avora navy base

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Filter out transparent, near-white, or near-black pixels
          if (a < 180) continue;
          if (r > 235 && g > 235 && b > 235) continue;
          if (r < 25 && g < 25 && b < 25) continue;

          // Saturation metric: difference between highest and lowest color channels
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max - min;

          if (sat > maxSat) {
            maxSat = sat;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        // If no vivid color found (pure monochrome / white logo), return default
        if (maxSat < 18) {
          return resolve(null);
        }

        // Compute deep, luxury gradient shades from the extracted dominant color
        const darkR = Math.max(2, Math.round(bestR * 0.22));
        const darkG = Math.max(4, Math.round(bestG * 0.22));
        const darkB = Math.max(8, Math.round(bestB * 0.22));

        const midR = Math.max(5, Math.round(bestR * 0.60));
        const midG = Math.max(10, Math.round(bestG * 0.60));
        const midB = Math.max(20, Math.round(bestB * 0.60));

        const accentR = Math.min(255, Math.round(bestR * 1.35 + 40));
        const accentG = Math.min(255, Math.round(bestG * 1.35 + 40));
        const accentB = Math.min(255, Math.round(bestB * 1.35 + 40));

        const theme = {
          gradient: `linear-gradient(135deg, rgb(${darkR}, ${darkG}, ${darkB}) 0%, rgb(${midR}, ${midG}, ${midB}) 55%, rgb(${bestR}, ${bestG}, ${bestB}) 100%)`,
          accent: `rgb(${accentR}, ${accentG}, ${accentB})`,
          glow: `rgba(${bestR}, ${bestG}, ${bestB}, 0.35)`,
        };

        colorCache.set(imageSrc, theme);
        resolve(theme);
      } catch (err) {
        console.warn('[extractBrandGradient] Canvas error:', err?.message);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
  });
};

