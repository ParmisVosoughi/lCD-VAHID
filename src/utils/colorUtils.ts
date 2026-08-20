// List of valid CSS color keywords
const CSS_COLOR_KEYWORDS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
  'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
  'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon',
  'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
  'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick',
  'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
  'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo',
  'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue',
  'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey',
  'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
  'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
  'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
  'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
  'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite',
  'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
  'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink',
  'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue',
  'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver',
  'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue',
  'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke',
  'yellow', 'yellowgreen'
]);

// Approximate luminance values for CSS color keywords (0 = dark, 1 = light)
// Colors with luminance > 0.5 are considered "light" and need dark text
const COLOR_LUMINANCE: Record<string, number> = {
  aliceblue: 0.97, antiquewhite: 0.93, aqua: 0.79, aquamarine: 0.85, azure: 0.97,
  beige: 0.93, bisque: 0.91, black: 0, blanchedalmond: 0.93, blue: 0.07,
  blueviolet: 0.12, brown: 0.10, burlywood: 0.70, cadetblue: 0.35, chartreuse: 0.76,
  chocolate: 0.22, coral: 0.50, cornflowerblue: 0.45, cornsilk: 0.97, crimson: 0.16,
  cyan: 0.79, darkblue: 0.02, darkcyan: 0.20, darkgoldenrod: 0.30, darkgray: 0.40,
  darkgreen: 0.10, darkgrey: 0.40, darkkhaki: 0.57, darkmagenta: 0.11, darkolivegreen: 0.15,
  darkorange: 0.45, darkorchid: 0.16, darkred: 0.05, darksalmon: 0.53, darkseagreen: 0.52,
  darkslateblue: 0.08, darkslategray: 0.11, darkslategrey: 0.11, darkturquoise: 0.40,
  darkviolet: 0.10, deeppink: 0.24, deepskyblue: 0.52, dimgray: 0.15, dimgrey: 0.15,
  dodgerblue: 0.36, firebrick: 0.11, floralwhite: 0.98, forestgreen: 0.14, fuchsia: 0.28,
  gainsboro: 0.85, ghostwhite: 0.98, gold: 0.70, goldenrod: 0.47, gray: 0.22, green: 0.15,
  greenyellow: 0.85, grey: 0.22, honeydew: 0.98, hotpink: 0.47, indianred: 0.25, indigo: 0.03,
  ivory: 0.99, khaki: 0.79, lavender: 0.91, lavenderblush: 0.97, lawngreen: 0.74,
  lemonchiffon: 0.96, lightblue: 0.81, lightcoral: 0.52, lightcyan: 0.94,
  lightgoldenrodyellow: 0.94, lightgray: 0.75, lightgreen: 0.79, lightgrey: 0.75,
  lightpink: 0.79, lightsalmon: 0.68, lightseagreen: 0.35, lightskyblue: 0.76,
  lightslategray: 0.29, lightslategrey: 0.29, lightsteelblue: 0.71, lightyellow: 0.98,
  lime: 0.72, limegreen: 0.44, linen: 0.95, magenta: 0.28, maroon: 0.05,
  mediumaquamarine: 0.55, mediumblue: 0.04, mediumorchid: 0.27, mediumpurple: 0.30,
  mediumseagreen: 0.33, mediumslateblue: 0.22, mediumspringgreen: 0.63, mediumturquoise: 0.52,
  mediumvioletred: 0.14, midnightblue: 0.02, mintcream: 0.99, mistyrose: 0.94,
  moccasin: 0.89, navajowhite: 0.87, navy: 0.01, oldlace: 0.96, olive: 0.20, olivedrab: 0.24,
  orange: 0.55, orangered: 0.29, orchid: 0.45, palegoldenrod: 0.84, palegreen: 0.83,
  paleturquoise: 0.81, palevioletred: 0.40, papayawhip: 0.95, peachpuff: 0.88, peru: 0.38,
  pink: 0.84, plum: 0.59, powderblue: 0.81, purple: 0.06, rebeccapurple: 0.09, red: 0.21,
  rosybrown: 0.43, royalblue: 0.16, saddlebrown: 0.10, salmon: 0.50, sandybrown: 0.61,
  seagreen: 0.20, seashell: 0.97, sienna: 0.17, silver: 0.53, skyblue: 0.71, slateblue: 0.18,
  slategray: 0.20, slategrey: 0.20, snow: 0.99, springgreen: 0.65, steelblue: 0.24, tan: 0.68,
  teal: 0.17, thistle: 0.73, tomato: 0.38, turquoise: 0.59, violet: 0.52, wheat: 0.88,
  white: 1, whitesmoke: 0.96, yellow: 0.93, yellowgreen: 0.56
};

/**
 * Check if a string is a valid CSS color keyword
 */
export function isCssColorKeyword(name: string): boolean {
  return CSS_COLOR_KEYWORDS.has(name.toLowerCase().trim());
}

/**
 * Determine if a color is "light" (needs dark text) or "dark" (needs light text)
 */
export function isLightColor(colorName: string): boolean {
  const luminance = COLOR_LUMINANCE[colorName.toLowerCase().trim()];
  return luminance !== undefined && luminance > 0.5;
}

/**
 * Get dynamic styles for a CSS color keyword
 * Returns null if the name is not a valid CSS color
 */
export function getColorStyles(featureName: string): {
  backgroundColor: string;
  textColor: string;
  border?: string;
} | null {
  const normalizedName = featureName.toLowerCase().trim();
  
  if (!isCssColorKeyword(normalizedName)) {
    return null;
  }

  const isLight = isLightColor(normalizedName);
  const isWhite = normalizedName === 'white';

  return {
    backgroundColor: normalizedName,
    textColor: isLight ? 'black' : 'white',
    border: isWhite ? '1px solid black' : undefined,
  };
}
