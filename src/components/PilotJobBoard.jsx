/**
 * Pilot Job Board
 * Shows available errands that pilots can accept
 * Allows pilots to view, filter, and accept delivery jobs
 */

import { useCallback, useEffect, useState } from "react";
import "./PilotJobBoard.css";

const getEndingLocation = (job) => {
	const raw = job?.dropoff_location || job?.delivery_location || "";
	return String(raw || "").trim();
};

const formatEndingLocation = (job) => getEndingLocation(job) || "Not provided";

const PilotJobBoard = ({
	apiBaseUrl,
	token,
	pilotId,
	onJobAccepted,
	currentStatus,
}) => {
	const [availableJobs, setAvailableJobs] = useState([]);
	const [acceptedJob, setAcceptedJob] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [sortBy, setSortBy] = useState("amount");

	const fetchAvailableJobs = useCallback(async () => {
		try {
			if (!apiBaseUrl) {
				setAvailableJobs([]);
				setError("Pilot API is not configured yet.");
				return;
			}
			if (!token) {
				setAvailableJobs([]);
				setError("Sign in to view available jobs.");
				return;
			}
			setLoading(true);
			const response = await fetch(
				`${apiBaseUrl}/api/v1/pilots/available-jobs?limit=20`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.status === 204 || response.status === 404) {
				setAvailableJobs([]);
				setError(null);
				return;
			}

			if (!response.ok) throw new Error("Failed to fetch jobs");
			const data = await response.json();
			setAvailableJobs(data.errands || []);
			setError(null);
		} catch (err) {
			setError(err.message);
			console.error("Error fetching jobs:", err);
		} finally {
			setLoading(false);
		}
	}, [apiBaseUrl, token]);

	// Fetch available errands
	useEffect(() => {
		fetchAvailableJobs();
		const interval = setInterval(fetchAvailableJobs, 30000); // Refresh every 30 seconds
		return () => clearInterval(interval);
	}, [fetchAvailableJobs]);

	const handleAcceptJob = async (errandId) => {
		try {
			setLoading(true);
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/assign-job`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					errand_id: errandId,
					pilot_id: pilotId,
				}),
			});

			if (!response.ok) throw new Error("Failed to accept job");
			const job = await response.json();
			setAcceptedJob(job);
			onJobAccepted(job);
			await fetchAvailableJobs();
		} catch (err) {
			setError(err.message);
			console.error("Error accepting job:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDeclineJob = (errandId) => {
		setAvailableJobs(availableJobs.filter((job) => job.id !== errandId));
	};

	const filteredJobs = [...availableJobs].sort((a, b) => {
		if (sortBy === "amount") return (b.amount || 0) - (a.amount || 0);
		if (sortBy === "distance")
			return (a.distance_km || 0) - (b.distance_km || 0);
		if (sortBy === "rating")
			return (b.customer_rating || 0) - (a.customer_rating || 0);
		return 0;
	});

	if (currentStatus === "in_progress" && acceptedJob) {
		return (
			<div className="pilot-job-board active-delivery">
				<div className="active-job-card">
					<div className="job-header">
						<h2>🚗 Active Errand</h2>
						<span className="status-badge in-progress">In Progress</span>
					</div>
					<div className="job-details">
						<div className="detail-row">
							<span className="label">Customer:</span>
							<span className="value">{acceptedJob.customer_name}</span>
						</div>
						<div className="detail-row">
							<span className="label">From:</span>
							<span className="value">{acceptedJob.pickup_location}</span>
						</div>
						<div className="detail-row">
							<span className="label">To:</span>
							<span className="value">{formatEndingLocation(acceptedJob)}</span>
						</div>
						<div className="detail-row">
							<span className="label">Amount:</span>
							<span className="value amount">₦{acceptedJob.amount}</span>
						</div>
						<div className="detail-row">
							<span className="label">Distance:</span>
							<span className="value">
								{acceptedJob.distance_km || "N/A"} km
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="pilot-job-board">
			<div className="job-board-header">
				<h1>📋 Available Errands</h1>
				<div className="header-controls">
					<button
						type="button"
						className="refresh-btn"
						onClick={fetchAvailableJobs}
						disabled={loading}
					>
						{loading ? "⏳ Refreshing..." : "🔄 Refresh"}
					</button>
				</div>
			</div>

			{error && (
				<div className="error-message">
					<span>⚠️ {error}</span>
					<button type="button" onClick={() => setError(null)}>
						Dismiss
					</button>
				</div>
			)}

			<div className="filters-section">
				<div className="filter-group">
					<label htmlFor="pilot-sort-by">Sort by:</label>
					<select
						id="pilot-sort-by"
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
					>
						<option value="amount">💰 Highest Pay</option>
						<option value="distance">📍 Shortest Distance</option>
						<option value="rating">⭐ Highest Customer Rating</option>
					</select>
				</div>
			</div>

			{loading && availableJobs.length === 0 ? (
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading available jobs...</p>
				</div>
			) : availableJobs.length === 0 ? (
				<div className="empty-state">
					<p>😴 No jobs available right now</p>
					<p className="subtitle">Check back in a few minutes!</p>
				</div>
			) : (
				<div className="jobs-list">
					{filteredJobs.map((job) => (
						<div key={job.id} className="job-card">
							<div className="job-card-header">
								<div className="customer-info">
									<h3>{job.customer_name}</h3>
									{job.customer_rating && (
										<span className="rating">
											⭐ {job.customer_rating.toFixed(1)}
										</span>
									)}
								</div>
								<span className="amount">₦{job.amount}</span>
							</div>

							<div className="job-locations">
								<div className="location">
									<span className="label">📍 Pickup:</span>
									<span className="text">{job.pickup_location}</span>
								</div>
								<div className="location">
									<span className="label">🏁 Ending location:</span>
									<span className="text">{formatEndingLocation(job)}</span>
								</div>
							</div>

							<div className="job-meta">
								{job.distance_km && (
									<div className="meta-item">
										<span className="icon">📏</span>
										<span>{job.distance_km} km</span>
									</div>
								)}
								{job.estimated_time && (
									<div className="meta-item">
										<span className="icon">⏱️</span>
										<span>{job.estimated_time} mins</span>
									</div>
								)}
								{job.item_description && (
									<div className="meta-item">
										<span className="icon">📦</span>
										<span>{job.item_description}</span>
									</div>
								)}
							</div>

							{job.special_instructions && (
								<div className="instructions">
									<p>
										<strong>ℹ️ Notes:</strong> {job.special_instructions}
									</p>
								</div>
							)}

							<div className="job-actions">
								<button
									type="button"
									className="accept-btn"
									onClick={() => handleAcceptJob(job.id)}
									disabled={loading}
								>
									✅ Accept Job
								</button>
								<button
									type="button"
									className="decline-btn"
									onClick={() => handleDeclineJob(job.id)}
								>
									❌ Pass
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<div className="job-board-footer">
				<p className="total-jobs">
					Showing {filteredJobs.length} of {availableJobs.length} available
					deliveries
				</p>
			</div>
		</div>
	);
};

export default PilotJobBoard;
