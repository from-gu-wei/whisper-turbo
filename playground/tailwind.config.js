/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                dark: "#131414",
                "pop-orange": "#f93c26",
            },
        },
    },
    plugins: [require("@tailwindcss/typography")],
};
