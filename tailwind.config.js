/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
	corePlugins: {
		// The app already has extensive global CSS; avoid Tailwind's reset impacting it.
		preflight: false,
	},
	theme: {
		extend: {},
	},
	plugins: [],
};
