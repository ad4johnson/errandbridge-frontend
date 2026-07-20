/*
 * Jest setup for CRA.
 *
 * Purpose:
 * - Keep test output clean by mocking framer-motion animations.
 * - Prevent act(...) warnings triggered by animation timers / exit callbacks.
 */

jest.mock("framer-motion", () => {
	const React = require("react");

	const stripMotionProps = (props) => {
		// Avoid React DOM warnings about unknown attributes.
		// Keep this list small and additive.
		// eslint-disable-next-line no-unused-vars
		const {
			animate,
			initial,
			exit,
			transition,
			variants,
			whileHover,
			whileTap,
			whileInView,
			layout,
			layoutId,
			onAnimationComplete,
			...rest
		} = props || {};
		return rest;
	};

	const motion = new Proxy(
		{},
		{
			get: (_target, key) => {
				const tag = typeof key === "string" ? key : "div";
				return React.forwardRef(function MotionMock(props, ref) {
					const cleaned = stripMotionProps(props);
					return React.createElement(tag, { ...cleaned, ref }, props?.children);
				});
			},
		},
	);

	return {
		__esModule: true,
		AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
		motion,
	};
});

// JSDOM does not provide IntersectionObserver; a few components use it for
// visibility tracking. Provide a minimal mock to keep unit tests hermetic.
if (typeof global.IntersectionObserver === "undefined") {
	global.IntersectionObserver = class IntersectionObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
