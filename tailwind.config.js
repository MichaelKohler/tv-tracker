import defaultTheme from "tailwindcss/defaultTheme";

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      colors: {
        mk: "#1F3352",
        "mk-secondary": "#23395B",
        "mk-tertiary": "#3A4D6A",
        "mk-text": "#2F2F2F",
        "mklight-100": "#F2FAFF",
        "mklight-300": "#9AD6F5",
        mkerror: "#FF7575",
        "mkerror-muted": "#FFB2B2",
        mkwarning: "#FFDD00",
        "mkwarning-muted": "#FFEA00",
      },
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
