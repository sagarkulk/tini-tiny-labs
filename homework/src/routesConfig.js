// src/routesConfig.js
import Home from "./components/Home";
import Mathematics from "./components/Mathematics";
import WordScramble from "./components/WordScramble";
import Feedback from "./components/Feedback";

export const routesConfig = [
	{
		path: "/homework",
		label: "Home",
		icon: "🏠",
		element: <Home />,
		showInSidebar: true,
		showInTopMenu: true,
		showInAppRoutes: true,
		showOnHome: false,
	},
	{
		path: "/homework/mathematics",
		label: "Mathematics",
		icon: "🧮",
		element: <Mathematics />,
		showInSidebar: true,
		showInTopMenu: true,
		showInAppRoutes: true,
		showOnHome: true,
		description: "(Optional time assessment mode)",
	},
	{
		path: "/homework/wordscramble",
		label: "Word Scramble",
		icon: "🔤",
		element: <WordScramble />,
		showInSidebar: true,
		showInTopMenu: true,
		showInAppRoutes: true,
		showOnHome: true,
		description: "(Vocabulary & memory game)",
	},
	{
		path: "/homework/feedback",
		label: "Feedback",
		icon: "💬",
		element: <Feedback />,
		showInSidebar: true,
		showInTopMenu: false,
		showInAppRoutes: true,
		showOnHome: false,
	}
];
