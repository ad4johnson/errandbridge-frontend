import { useEffect, useMemo, useRef, useState } from "react";

import ModalPortal from "./ModalPortal";
import { acquireBodyScrollLock } from "../utils/scrollLock";
import ErrandChatPanel from "./ErrandChatPanel";
import AssignedPilotTrustCard from "./AssignedPilotTrustCard";
import "./DetailsModal.css";

const DetailsModal = ({
	detailsModal,
	isMobile,
	onClose,
	onPreviewFileUrl,
	documentsUploadedCount,
	uploadedFiles,
	hasUploadedFiles,
	buildDescriptionItems,
	formatEventLabel,
	formatStatusLabel,
	activeTrackingInfo,
	trackingAllowed,
	onOpenTracking,
	refreshTrackingStatus,
	apiBaseUrl,
	authToken,
}) => {
	const isOpen = Boolean(detailsModal?.open);
	const panelRef = useRef(null);
	const [callStatus, setCallStatus] = useState(null);
	const [isCalling, setIsCalling] = useState(false);

	const formatLocalDateTime = (value) => {
		if (!value) return "";
		try {
			const parsed = new Date(value);
			if (Number.isNaN(parsed.getTime())) return String(value);
			return parsed.toLocaleString();
		} catch {
			return String(value);
		}
	};

	const buildTimingLabel = (errand) => {
		if (!errand) return "ASAP";
		const dateRaw =
			errand?.pickupTimeSlotDate ||
			errand?.pickup_time_slot_date ||
			errand?.pickupTimeSlotStart ||
			errand?.pickup_time_slot_start ||
			errand?.pickupTimeSlotEnd ||
			errand?.pickup_time_slot_end ||
			null;
		const date = dateRaw ? new Date(dateRaw) : null;
		const hasDate = date && !Number.isNaN(date.getTime());
		const dateLabel = hasDate
			? date.toLocaleDateString(undefined, {
				weekday: "short",
				month: "short",
				day: "2-digit",
			})
			: "";

		const startRaw = errand?.pickupTimeSlotStart || errand?.pickup_time_slot_start;
		const endRaw = errand?.pickupTimeSlotEnd || errand?.pickup_time_slot_end;
		const toTime = (iso) => {
			if (!iso) return "";
			try {
				const parsed = new Date(iso);
				if (Number.isNaN(parsed.getTime())) return "";
				return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
			} catch {
				return "";
			}
		};
		const startLabel = toTime(startRaw);
		const endLabel = toTime(endRaw);
		const timeLabel = [startLabel, endLabel].filter(Boolean).join(" - ");
		const combined = [dateLabel, timeLabel].filter(Boolean).join(" • ");
		return combined || (hasDate ? date.toLocaleDateString() : "ASAP");
	};

	const parseKeyValueLine = (line) => {
		const raw = String(line || "").trim();
		if (!raw) return null;
		const idx = raw.indexOf(":");
		if (idx > 0 && idx < Math.min(48, raw.length - 1)) {
			const key = raw.slice(0, idx).trim();
			const value = raw.slice(idx + 1).trim();
			if (key && value) return { key, value, raw };
		}
		return { key: "", value: raw, raw };
	};

	const normalizeStatusKey = (value) => {
		if (!value) return "";
		return String(value).trim().toLowerCase().replace(/\s+/g, "_");
	};

	const progressSequence = useMemo(
		() => ["accepted", "in_progress", "picked_up", "delivered", "completed"],
		[],
	);

	const derivedProgressStatusKey = useMemo(() => {
		const errand = detailsModal?.errand;
		if (!errand) return "";
		const history = Array.isArray(errand.history) ? errand.history : [];
		const hasCancelledHistory = history.some((entry) => {
			const typeRaw =
				entry?.eventType || entry?.event_type || entry?.type || entry?.action || "";
			const type = String(typeRaw).toLowerCase();
			const newStatus = normalizeStatusKey(entry?.newStatus || entry?.new_status);
			const oldStatus = normalizeStatusKey(entry?.oldStatus || entry?.old_status);
			return type.includes("cancel") || newStatus === "cancelled" || oldStatus === "cancelled";
		});
		if (normalizeStatusKey(errand.status) === "cancelled" || hasCancelledHistory) {
			const best = { key: "", idx: -1 };
			const considerProgress = (candidate) => {
				const key = normalizeStatusKey(candidate);
				const idx = progressSequence.indexOf(key);
				if (idx >= 0 && idx > best.idx) {
					best.key = key;
					best.idx = idx;
				}
			};
			history.forEach((entry) => {
				if (entry?.synthetic) return;
				considerProgress(entry?.newStatus || entry?.new_status);
				considerProgress(entry?.oldStatus || entry?.old_status);
			});
			return best.key;
		}
		const best = { key: normalizeStatusKey(errand.status), idx: -1 };

		const consider = (candidate) => {
			const key = normalizeStatusKey(candidate);
			if (!key) return;
			const idx = progressSequence.indexOf(key);
			if (idx >= 0 && idx > best.idx) {
				best.key = key;
				best.idx = idx;
			}
		};

		history.forEach((entry) => {
			if (!entry) return;
			consider(entry.newStatus || entry.new_status);
			consider(entry.oldStatus || entry.old_status);
			const typeRaw =
				entry.eventType || entry.event_type || entry.type || entry.action || "";
			const type = String(typeRaw).toLowerCase();
			if (!type) return;
			if (type.includes("accept")) consider("accepted");
			if (type.includes("started")) consider("in_progress");
			if (type.includes("picked_up") || type.includes("pickup"))
				consider("picked_up");
			if (type.includes("delivered")) consider("delivered");
			if (type.includes("completed")) consider("completed");
		});

		return best.idx >= 0 ? best.key : normalizeStatusKey(errand.status);
	}, [detailsModal?.errand, progressSequence]);

	const effectiveStatusKey = useMemo(() => {
		const errand = detailsModal?.errand;
		if (!errand) return "";
		const direct = normalizeStatusKey(errand.status);
		const history = Array.isArray(errand.history) ? errand.history : [];
		const hasCancelledHistory = history.some((entry) => {
			const typeRaw =
				entry?.eventType || entry?.event_type || entry?.type || entry?.action || "";
			const type = String(typeRaw).toLowerCase();
			const newStatus = normalizeStatusKey(entry?.newStatus || entry?.new_status);
			const oldStatus = normalizeStatusKey(entry?.oldStatus || entry?.old_status);
			return type.includes("cancel") || newStatus === "cancelled" || oldStatus === "cancelled";
		});
		if (direct === "cancelled" || hasCancelledHistory) return "cancelled";
		return derivedProgressStatusKey || direct;
	}, [derivedProgressStatusKey, detailsModal?.errand]);

	const actualHistoryEntries = useMemo(() => {
		const history = Array.isArray(detailsModal?.errand?.history)
			? detailsModal.errand.history
			: [];
		return history.filter((entry) => !entry?.synthetic);
	}, [detailsModal?.errand?.history]);

	const closedReasonLabel = effectiveStatusKey === "cancelled" ? "cancelled" : "completed";

	const communicationLocked = useMemo(() => {
		return ["delivered", "completed", "cancelled"].includes(effectiveStatusKey);
	}, [effectiveStatusKey]);

	const trackingRefreshLocked = useMemo(() => {
		return ["completed", "cancelled"].includes(effectiveStatusKey);
	}, [effectiveStatusKey]);

	const trackingMapLocked = useMemo(() => {
		return ["completed", "accepted", "cancelled"].includes(
			effectiveStatusKey,
		);
	}, [effectiveStatusKey]);

	const liveMapAllowed = Boolean(trackingAllowed) && !trackingMapLocked;

	const viewportWidth =
		typeof window !== "undefined" ? window.innerWidth : 1200;
	const viewportHeight =
		typeof window !== "undefined" ? window.innerHeight : 800;
	const isMobileSheet =
		typeof isMobile === "boolean" ? isMobile : viewportWidth < 768;

	const shouldAnchor = detailsModal?.anchorMode === "anchor" && !isMobileSheet;
	const anchorRect = shouldAnchor ? detailsModal?.anchorRect : null;
	const modalWidth = Math.min(560, viewportWidth - 32);
	const anchorLeft = anchorRect ? anchorRect.left : null;
	const anchorTop = anchorRect ? anchorRect.top : null;
	const anchoredWidth = anchorRect
		? Math.min(modalWidth, anchorRect.width)
		: modalWidth;
	const isAnchorVisible = anchorRect
		? anchorRect.top >= 16 && anchorRect.bottom <= viewportHeight - 16
		: false;
	const anchoredLeft = anchorRect
		? Math.min(Math.max(anchorLeft, 16), viewportWidth - anchoredWidth - 16)
		: null;
	const anchoredTop = anchorRect
		? Math.min(Math.max(anchorTop, 16), viewportHeight - 32)
		: null;

	const isAnchored = Boolean(anchorRect && isAnchorVisible && !isMobileSheet);
	const headerTitle = detailsModal?.transparency
		? "Documents"
		: "Errand details";
	const resetKey = useMemo(() => {
		if (detailsModal?.transparency) return "transparency";
		return String(detailsModal?.errand?.id ?? detailsModal?.errandId ?? "");
	}, [detailsModal?.errand?.id, detailsModal?.errandId, detailsModal?.transparency]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const release = acquireBodyScrollLock();
		return release;
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return undefined;
		// Ensure modal content always starts at the top when opening or switching targets.
		if (!panelRef.current) return;
		const id = window.requestAnimationFrame(() => {
			if (panelRef.current) panelRef.current.scrollTop = 0;
		});
		return () => window.cancelAnimationFrame(id);
	}, [isOpen, resetKey]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const onKeyDown = (event) => {
			if (event.key === "Escape") onClose?.();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const progressStatusKey =
		effectiveStatusKey === "cancelled"
			? progressSequence.includes(derivedProgressStatusKey)
				? derivedProgressStatusKey
				: ""
			: derivedProgressStatusKey;

	return (
		<ModalPortal>
			<div
				className="ebDetailsOverlay"
				style={{ alignItems: isMobileSheet ? "stretch" : "center", padding: isMobileSheet ? 0 : 20 }}
			>
				<button
					type="button"
					aria-label="Close details"
					onClick={onClose}
					className="ebDetailsBackdrop"
				/>
				<div
					className={`ebDetailsPanel${isMobileSheet ? " is-mobile" : ""}`}
					style={{
						width: isMobileSheet
							? "100vw"
							: isAnchored
								? anchoredWidth
								: "min(820px, calc(100vw - 40px))",
						maxWidth: isMobileSheet ? "100vw" : isAnchored ? anchoredWidth : 820,
						left: isMobileSheet ? 0 : isAnchored ? anchoredLeft : "50%",
						top: isMobileSheet ? 0 : isAnchored ? anchoredTop : "50%",
						right: isMobileSheet ? 0 : "auto",
						bottom: isMobileSheet ? 0 : "auto",
						transform:
							isMobileSheet || isAnchored ? "none" : "translate(-50%, -50%)",
						height: isMobileSheet ? "100dvh" : "auto",
						maxHeight: isMobileSheet
							? "100dvh"
							: anchorRect
								? "calc(100vh - 32px)"
								: "min(86vh, 900px)",
						animation: isMobileSheet
							? "ebDetailsSheetUp 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both"
							: isAnchored
								? "ebDetailsAnchorIn 160ms ease-out both"
								: "ebDetailsPopIn 180ms ease-out both",
					}}
				>
					<div className="ebDetailsHeader">
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="ebDetailsClose"
						>
							✕
						</button>
						<div className="ebDetailsTitle" aria-label={headerTitle}>
							{headerTitle}
						</div>
						<div aria-hidden="true" />
					</div>

					<div
						ref={panelRef}
						className={`ebDetailsBody${isMobileSheet ? " is-mobile" : ""}`}
					>
						{detailsModal.transparency ? (
							<>
								<div className="ebDetailsStack">
									<section className="ebDetailsSection ebDetailsSection--cool">
										<div className="ebDetailsSectionHeader">
											<div className="ebDetailsSectionIcon" aria-hidden="true">
												📎
											</div>
											<div className="ebDetailsSectionKicker">Documents</div>
										</div>
										<div className="ebDetailsMuted">
											All uploaded files{documentsUploadedCount > 0 ? ` (${documentsUploadedCount})` : ""}.
											{documentsUploadedCount > 0
												? ` Showing ${uploadedFiles.length} of ${documentsUploadedCount}.`
												: ""}
										</div>
									</section>

									{hasUploadedFiles ? (
										<section className="ebDetailsSection">
											<div className="ebDetailsSubmissionList">
												{uploadedFiles.map((f) => (
													<button
														key={f.id}
														type="button"
														onClick={() => {
															if (typeof onPreviewFileUrl === "function") {
																onPreviewFileUrl(f.url, f.filename);
																return;
															}
															window.location.href = f.url;
														}}
														className="ebDetailsBtn"
														style={{ justifyContent: "flex-start" }}
													>
														<span aria-hidden="true">📎</span>
														<span style={{ fontWeight: 900 }}>{f.filename}</span>
													</button>
												))}
											</div>
										</section>
									) : documentsUploadedCount > 0 ? (
										<section className="ebDetailsSection ebDetailsSection--warm">
											<div className="ebDetailsMuted">
												Documents are syncing. Refresh in a moment to view details.
											</div>
										</section>
									) : (
										<section className="ebDetailsSection">
											<div className="ebDetailsMuted">No files uploaded yet.</div>
										</section>
									)}
								</div>
							</>
						) : detailsModal.errand ? (
							<>
								{(() => {
									const errand = detailsModal.errand;
									const statusLabel =
										typeof formatStatusLabel === "function"
											? formatStatusLabel(effectiveStatusKey || errand.status)
											: String(effectiveStatusKey || errand.status || "");
									const overviewTiles = [
										{ label: "Reference", value: errand.referenceNumber || "-" },
										{ label: "Title", value: errand.title || "Errand request" },
										{ label: "Starting point", value: errand.pickupLocation || "-" },
										{
											label: "Ending point",
											value: String(errand.dropoffLocation || "").trim()
												? errand.dropoffLocation
												: "Not provided",
										},
										{ label: "Timing", value: buildTimingLabel(errand) },
										{ label: "Status", value: statusLabel, ariaLabel: `Status: ${statusLabel}` },
									];
									const submissionLinesRaw = [errand.note, errand.description]
										.filter(Boolean)
										.flatMap((text) =>
											(typeof buildDescriptionItems === "function"
												? buildDescriptionItems(text)
												: [String(text)])
										)
										.map((line) => String(line || "").trim())
										.filter(Boolean);

									const statusKey = normalizeStatusKey(effectiveStatusKey || errand.status);
									const statusHints = {
										submitted: "Operator assignment in progress",
										pending: "Operator assignment in progress",
										assigned: "Operator assigned",
										in_progress: "Operator working on your errand",
										picked_up: "Proof capture in progress",
										delivered: "Proof delivered",
										completed: "Completed",
										cancelled: "Cancelled",
									};
									const derivedHint = statusHints[statusKey] || "";
									const submissionRows = submissionLinesRaw
										.map(parseKeyValueLine)
										.filter(Boolean);
									if (derivedHint) {
										submissionRows.unshift({ key: "", value: derivedHint, raw: derivedHint });
									}

									return (
										<div className="ebDetailsStack">
											<section className="ebDetailsSection ebDetailsSection--cool">
												<div className="ebDetailsSectionHeader">
													<div className="ebDetailsSectionIcon" aria-hidden="true">
														📋
													</div>
													<div className="ebDetailsSectionKicker">Reference overview</div>
												</div>
												<div className="ebDetailsOverviewGrid">
													{overviewTiles.map((tile) => (
														<div
															key={tile.label}
															className="ebDetailsTile"
															aria-label={tile.ariaLabel}
														>
															<div className="ebDetailsTileLabel">{tile.label}</div>
															<div className="ebDetailsTileValue">{tile.value}</div>
														</div>
													))}
												</div>
												<div className="ebDetailsSrOnly">Status: {statusLabel}</div>
												<div className="ebDetailsSrOnly">Created: {formatLocalDateTime(errand.createdAt)}</div>
											</section>

											<AssignedPilotTrustCard trust={errand.assignedPilotTrust} />

											<section className="ebDetailsSection ebDetailsSection--warm">
												<div className="ebDetailsSectionHeader">
													<div className="ebDetailsSectionIcon" aria-hidden="true">
														🧾
													</div>
													<div className="ebDetailsSectionKicker">Submission details</div>
												</div>
												<div className="ebDetailsSubmissionList">
													{submissionRows.length > 0 ? (
														submissionRows.map((row, index) => (
															<div
																key={`${row.raw}-${index}`}
																className={`ebDetailsSubmissionLine${row.key ? "" : " ebDetailsSubmissionSolo"}`}
														>
																{row.key ? (
																	<>
																		<div className="ebDetailsSubmissionKey">{row.key}</div>
																		<div className="ebDetailsSubmissionValue">{row.value}</div>
																	</>
																) : (
																	<div className="ebDetailsSubmissionValue">{row.value}</div>
																)}
															</div>
														))
													) : (
														<div className="ebDetailsMuted">No submission details provided.</div>
													)}
												</div>
											</section>

											<div className="ebDetailsActionsRow">
												<button
													type="button"
													onClick={async () => {
														if (communicationLocked) return;
														if (!authToken || !errand?.id) return;
														setCallStatus(null);
														setIsCalling(true);
														try {
															const res = await fetch(
																`${apiBaseUrl}/voice/call/start?errand_id=${errand.id}`,
																{
																	method: "POST",
																	headers: { Authorization: `Bearer ${authToken}` },
																},
															);
															const payload = await res.json().catch(() => ({}));
															if (!res.ok) {
																throw new Error(
																	payload.detail || "Unable to start masked call",
																);
															}
															setCallStatus(
																"Call started. You and the pilot will receive a masked call shortly.",
															);
														} catch (err) {
															console.error("Unable to start masked call", err);
															setCallStatus(err.message || "Unable to start masked call.");
														} finally {
															setIsCalling(false);
														}
													}}
													className="ebDetailsBtn ebDetailsBtn--indigo"
													disabled={isCalling || communicationLocked}
													title={
														communicationLocked
															? `Calls are unavailable after this errand is ${closedReasonLabel}.`
															: "Call pilot via ErrandBridge"
													}
												>
													{communicationLocked
														? "📞 Call unavailable"
														: isCalling
															? "Calling…"
															: "📞 Call pilot via ErrandBridge"}
												</button>
											</div>
											{!communicationLocked ? (
												<div className="ebDetailsMuted" style={{ marginTop: 8 }}>
													Calls are routed through ErrandBridge and recorded for internal audit, data compliance, and protection.
												</div>
											) : null}
											{communicationLocked ? (
												<div className="ebDetailsMuted">
													Chat and calling are disabled because this errand is already {closedReasonLabel}.
												</div>
											) : null}
											{callStatus ? (
												<div
													className="ebDetailsMuted"
													style={{ color: callStatus.toLowerCase().includes("call started") ? "#166534" : "#991b1b" }}
												>
													{callStatus}
												</div>
											) : null}

											<div className="ebDetailsCard">
												<ErrandChatPanel
													errandId={errand.id}
													apiBaseUrl={apiBaseUrl}
													token={authToken}
													title="💬 Chat with pilot"
													smartQuickReplies
													disabled={communicationLocked}
													disabledMessage={`Chat is unavailable because this errand is already ${closedReasonLabel}.`}
												/>
											</div>

											{actualHistoryEntries.length > 0 ? (
												<section className="ebDetailsCard">
													<div className="ebDetailsSectionHeader" style={{ marginBottom: 10 }}>
														<div className="ebDetailsSectionIcon" aria-hidden="true">🕘</div>
														<div className="ebDetailsSectionKicker">History</div>
													</div>
													<ul className="ebDetailsHistoryList">
														{actualHistoryEntries.map((h, index) => (
															<li
																key={`${h?.eventType || "event"}-${h?.createdAt || "no_time"}-${normalizeStatusKey(h?.newStatus || h?.oldStatus) || "no_status"}-${index}`}
																style={{ marginBottom: 8, color: "rgba(15, 23, 42, 0.92)" }}
															>
																<span style={{ fontWeight: 900 }}>
																	{formatEventLabel(h.eventType)}
																</span>
																{(h.oldStatus || h.newStatus) ? (
																	<span style={{ marginLeft: 8, color: "rgba(100, 116, 139, 0.96)" }}>
																		({formatStatusLabel(h.oldStatus)} → {formatStatusLabel(h.newStatus || h.oldStatus)})
																	</span>
																) : null}
																{h.createdAt ? (
																	<span style={{ marginLeft: 8, color: "rgba(37, 99, 235, 0.92)", fontWeight: 800 }}>
																		{formatLocalDateTime(h.createdAt)}
																	</span>
																) : null}
															</li>
														))}
													</ul>
												</section>
											) : null}

											<div className="ebDetailsPills">
												{progressSequence.map((step) => {
													const currentStatus = progressStatusKey;
													const currentIdx = progressSequence.indexOf(currentStatus);
													const stepIdx = progressSequence.indexOf(step);
													const isActive = currentStatus === step;
													const isDone =
														currentIdx >= 0 && stepIdx >= 0 && currentIdx > stepIdx;
													return (
														<span
															key={`detail-step-${step}`}
															className={`ebDetailsPill${isActive ? " is-active" : isDone ? " is-done" : ""}`}
														>
															{typeof formatStatusLabel === "function"
																? formatStatusLabel(step)
																: step.replace("_", " ")}
														</span>
													);
												})}
											</div>

											<div className="ebDetailsCard">
												<div className="ebDetailsSectionHeader" style={{ marginBottom: 10 }}>
													<div className="ebDetailsSectionIcon" aria-hidden="true">📡</div>
													<div className="ebDetailsSectionKicker">Live tracking</div>
												</div>
												{activeTrackingInfo?.loading ? (
													<div className="ebDetailsMuted">Checking tracking availability...</div>
												) : null}
												{activeTrackingInfo?.error ? (
													<div className="ebDetailsMuted" style={{ color: "#b91c1c" }}>
														{activeTrackingInfo.error}
													</div>
												) : null}
												<div className="ebDetailsMuted" style={{ marginBottom: 10 }}>
													Steps: {typeof formatStatusLabel === "function"
														? `${formatStatusLabel("accepted")} → ${formatStatusLabel("in_progress")} → ${formatStatusLabel("picked_up")} → ${formatStatusLabel("delivered")} → ${formatStatusLabel("completed")}`
														: "Accepted → In progress → Picked up → Delivered → Completed"}
												</div>
												<button
													type="button"
													onClick={() => {
														if (trackingRefreshLocked) return;
														refreshTrackingStatus(errand.id);
													}}
													disabled={trackingRefreshLocked}
													title={
														trackingRefreshLocked
															? `Tracking updates are unavailable after this errand is ${closedReasonLabel}.`
															: "Refresh tracking status"
													}
													className="ebDetailsBtn"
												>
													🔄 Update Tracking
												</button>
												{trackingRefreshLocked ? (
													<div className="ebDetailsMuted" style={{ marginTop: 8 }}>
														Tracking updates are disabled because this errand is already {closedReasonLabel}.
													</div>
												) : null}
												{!activeTrackingInfo?.loading &&
													!activeTrackingInfo?.error &&
														(liveMapAllowed ? (
															<button
																type="button"
																onClick={onOpenTracking}
																className="ebDetailsBtn ebDetailsBtn--indigo"
																style={{ marginLeft: 10 }}
															>
																Open Live Tracking
															</button>
														) : trackingMapLocked ? (
															<>
																<button
																	type="button"
																	disabled
																	className="ebDetailsBtn ebDetailsBtn--indigo"
																	style={{ marginLeft: 10, opacity: 0.65, cursor: "not-allowed" }}
																	title={`Live tracking is unavailable after this errand is ${closedReasonLabel}.`}
																>
																	Open Live Tracking
																</button>
																<div className="ebDetailsMuted" style={{ marginTop: 10 }}>
																	Live map is disabled because this errand is already {closedReasonLabel}.
																</div>
															</>
														) : null)}
												{!activeTrackingInfo?.loading &&
													!activeTrackingInfo?.error &&
														!liveMapAllowed && !trackingMapLocked ? (
														<div className="ebDetailsMuted" style={{ marginTop: 10 }}>
														{activeTrackingInfo?.reason || "Tracking is not available yet."}
													</div>
													) : null}
											</div>
										</div>
									);
								})()}
							</>
						) : detailsModal.errandId ? (
							<>
								<section className="ebDetailsSection">
									<div className="ebDetailsSectionHeader">
										<div className="ebDetailsSectionIcon" aria-hidden="true">⏳</div>
										<div className="ebDetailsSectionKicker">Loading errand</div>
									</div>
									<div className="ebDetailsMuted">
										We’re fetching the details for errand <b>{String(detailsModal.errandId)}</b>. If this takes too long, go back and try again.
									</div>
								</section>
							</>
						) : null}
					</div>

					{isMobileSheet ? (
						<div className="ebDetailsFooter" role="group" aria-label="Details actions">
							<button type="button" className="ebDetailsFooterClose" onClick={onClose}>
								Close
							</button>
						</div>
					) : null}
				</div>
			</div>
		</ModalPortal>
	);
};

export default DetailsModal;
