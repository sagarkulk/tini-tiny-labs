import React from "react";
import { Link } from "react-router-dom";
import "../components/styles/App.Home.css";

export default function Home() {
	return (
		<div className="homeWrap">
			<h1 className="homeTitle">Let's Practice</h1>
			<p className="homeSubtitle">
				Learn, solve, and play — anytime, anywhere.
			</p>

			<Link
				to="/Homework/Mathematics"
				className="primaryBtn homeBtn"
				aria-label="Mathematics"
				title="Mathematics"
			>
				<div className="btnText">
					<span>Mathematics</span>
					<span className="btnSub">(Optional time assessment mode)</span>
				</div>
			</Link>

			<Link
				to="/Homework/WordScramble"
				className="primaryBtn homeBtn"
				aria-label="Word Scramble"
				title="Word Scramble"
			>
				<div className="btnText">
					<span>Word Scramble</span>
					<span className="btnSub">(Vocabulary & memory game)</span>
				</div>
			</Link>
		</div>
	);
}
