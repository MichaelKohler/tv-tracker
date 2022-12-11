const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Raleway", ...defaultTheme.fontFamily.sans],
        title: ["Dosis", ...defaultTheme.fontFamily.sans],
      },
      grayscale: {
        80: "80%",
      },
      height: {
        128: "32rem",
      },
    },
  },
  plugins: [],
};
