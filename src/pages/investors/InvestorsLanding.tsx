import { useEffect } from "react";
import { ArrowRight, Download, FileText } from "lucide-react";

import { motion } from "framer-motion";

// Ensure Tailwind utilities + existing global CSS are available on this route.
// This route can render without RootApp, which normally lazy-loads global styles.
import "../../tailwind.css";
import "../../index.css";

const PUBLIC_ASSET_BASE = process.env.PUBLIC_URL || "";

const deckUrl = `${PUBLIC_ASSET_BASE}/investors/deck.html`;
const pdfUrl = `${PUBLIC_ASSET_BASE}/document-md/INVESTOR_DECK_ERRANDBRIDGE.pdf`;
const imageBase = `${PUBLIC_ASSET_BASE}/investors/image/INVESTOR_DECK_ERRANDBRIDGE`;

type ProofCard = {
	label: string;
	src: string;
	alt: string;
	description: string;
};

const proofCards: ProofCard[] = [
	{
		label: "Demand capture",
		src: `${imageBase}/landing-mobile-hero.jpeg`,
		alt: "ErrandBridge landing page on mobile",
		description: "The trust-first homepage sets the value proposition before the customer even starts the errand.",
	},
	{
		label: "Secure payment",
		src: `${imageBase}/customer-pay-securely-2026-07-14.jpeg`,
		alt: "Secure payment screen",
		description: "Current in-flow checkout shows pricing, review context, and policy acknowledgement before confirmation.",
	},
	{
		label: "Confirmation + tracking",
		src: `${imageBase}/customer-submitted.jpeg`,
		alt: "Errand submitted confirmation screen",
		description: "Customers receive a reference, matching feedback, and a clear next-step record immediately after submission.",
	},
	{
		label: "Monitoring",
		src: `${imageBase}/monitoring-performance-full.png`,
		alt: "Monitoring dashboard performance and latency view",
		description: "Operational oversight across throughput, latency, and reliability keeps the service investably controlled.",
	},
];

export default function InvestorsLanding() {
	useEffect(() => {
		try {
			document.title = "ErrandBridge Investors";
		} catch {
			// ignore
		}
	}, []);

	return (
		<div className="min-h-[100dvh] bg-slate-950 text-white">
			<div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
				<motion.header
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, ease: "easeOut" }}
					className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur sm:p-10"
				>
					<div className="grid gap-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
									<FileText className="h-5 w-5 text-sky-200" />
								</div>
								<div className="leading-tight">
									<div className="text-sm font-semibold text-white/75">Investor portal</div>
									<div className="text-xl font-extrabold tracking-tight">ErrandBridge</div>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-3">
								<a
									href={deckUrl}
									className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-[0_10px_30px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
								>
									Open Investor Deck <ArrowRight className="h-4 w-4" />
								</a>
								<a
									href={pdfUrl}
									download
									className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/90 transition hover:bg-white/10"
								>
									Download PDF <Download className="h-4 w-4" />
								</a>
							</div>
						</div>

						<p className="max-w-2xl text-base leading-relaxed text-white/80">
							ErrandBridge helps you get real world tasks done back home without being there.
							 Live tracking, proof of completion, and verified operators reduce anxiety and disputes.
						</p>
					</div>
				</motion.header>

				<section className="mt-10 grid gap-5">
					<h2 className="text-lg font-extrabold tracking-tight">Product proof</h2>
					<p className="max-w-3xl text-sm leading-relaxed text-white/70">
						Four current screens that show the operating model: demand capture, payment, confirmation, and monitoring.
					</p>

					<div className="grid gap-5 md:grid-cols-2">
						{proofCards.map((card) => (
							<div
								key={card.label}
								className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
							>
								<div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
									<div className="text-sm font-extrabold text-white">{card.label}</div>
									<div className="text-xs font-semibold text-white/55">ErrandBridge</div>
								</div>
								<div className="bg-gradient-to-b from-slate-900/10 to-slate-950/30 p-5">
									<div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
										<img
											src={card.src}
											alt={card.alt}
											loading="lazy"
											className="h-auto w-full object-contain"
										/>
									</div>
									<p className="mt-4 text-sm font-semibold leading-relaxed text-white/70">
										{card.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</section>

				<footer className="mt-12 border-t border-white/10 pt-8 text-sm text-white/60">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="font-semibold">ErrandBridge</div>
						<div className="flex flex-wrap items-center gap-3">
							<a className="hover:text-white" href={deckUrl}>
								Open deck
							</a>
							<a className="hover:text-white" href={pdfUrl}>
								PDF
							</a>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}
