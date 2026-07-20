/**
 * Optimized Pilot Job Board
 * Shows available errands clean version
 */
import { useCallback, useEffect, useState } from "react";
import "./PilotJobBoardOptimized.css";

const getEndingLocation = (job) => {
	const raw = job?.dropoff_location || job?.delivery_location || "";
	return String(raw || "").trim();
};

const formatEndingLocation = (job) => getEndingLocation(job) || "Not provided";

const PilotJobBoardOptimized = ({
	apiBaseUrl,
	token,
	pilotId,
	onJobAccepted,
}) => {
	const [availableJobs, setAvailableJobs] = useState([]);
	const [acceptedJob, setAcceptedJob] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const fetchAvailableJobs = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`${apiBaseUrl}/api/v1/pilots/available-jobs?status=submitted`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			setAvailableJobs(data.errands || []);
			setError(null);
		} catch (err) {
			console.error("Error fetching jobs:", err);
			setError(err.message || "Failed to fetch jobs");
		} finally {
			setLoading(false);
		}
	}, [apiBaseUrl, token]);

	useEffect(() => {
		fetchAvailableJobs();
		const interval = setInterval(() => {
			fetchAvailableJobs();
		}, 30000);
		return () => clearInterval(interval);
	}, [fetchAvailableJobs]);

	const handleAcceptJob = async (errandId) => {
		try {
			setLoading(true);
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/assign-job`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ errand_id: errandId, pilot_id: pilotId }),
			});
			if (response.ok) {
				const data = await response.json();
				setAcceptedJob(data.errand || data);
				onJobAccepted?.(data.errand || data);
			} else {
				setError("Failed to accept job");
			}
		} catch (err) {
			setError(`Error: ${err.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="pilot-dashboard-optimized">
			<div className="job-board-section">
				<div className="section-header">
					<h2>📋 Available Errands</h2>
					<button
						type="button"
						className="btn-refresh"
						onClick={fetchAvailableJobs}
						disabled={loading}
					>
						{loading ? "⏳ Loading..." : "🔄 Refresh"}
					</button>
				</div>

				{error && (
					<div className="alert alert-error">
						⚠️ {error}
						<button
							type="button"
							className="btn-dismiss"
							onClick={() => setError(null)}
						>
							Dismiss
						</button>
					</div>
				)}

				{loading && !availableJobs.length && (
					<div className="loading-state">
						<p>⏳ Loading...</p>
					</div>
				)}

				{!loading && availableJobs.length > 0 ? (
					<div className="jobs-list">
						{availableJobs.map((job) => (
							<div key={job.id} className="job-card">
								<div className="job-header">
									<div>
										<h3>{job.title}</h3>
										<p className="job-ref">ID: {job.reference_number}</p>
									</div>
									<div className="job-amount">₦{job.amount || 0}</div>
								</div>
								<p className="job-description">{job.description}</p>
								<div className="job-locations">
									<div className="location-item">
										<span className="label">📍 Pickup:</span>
										<span>{job.pickup_location}</span>
									</div>
									<div className="location-item">
										<span className="label">🏁 Ending location:</span>
										<span>{formatEndingLocation(job)}</span>
									</div>
								</div>
								<div className="job-meta">
									<span className="distance">
										📏{" "}
										{job.distance_km ? `${job.distance_km} km` : "Distance TBD"}
									</span>
									<span className="rating">
										⭐ {job.customer_rating || "New"}
									</span>
								</div>
								<button
									type="button"
									className="btn-accept-job"
									onClick={() => handleAcceptJob(job.id)}
									disabled={loading}
								>
									✅ Accept Job
								</button>
							</div>
						))}
					</div>
				) : (
					!loading && (
						<div className="empty-state">
							<p>😴 No jobs available</p>
							<p className="sub-text">Check back soon!</p>
						</div>
					)
				)}

				<p className="jobs-count">Showing {availableJobs.length} errands</p>
			</div>

			{acceptedJob && (
				<div className="active-errand-section">
					<div className="section-header">
						<h2>🚗 Active Errand</h2>
					</div>
					<div className="active-job-card">
						<h3>{acceptedJob.title}</h3>
						<p>{acceptedJob.description}</p>
						<div className="job-locations">
							<div className="location-item">
								<span className="label">📍 From:</span>
								<span>{acceptedJob.pickup_location}</span>
							</div>
							<div className="location-item">
								<span className="label">🏁 Ending:</span>
								<span>{formatEndingLocation(acceptedJob)}</span>
							</div>
						</div>
						<div className="errand-actions">
							<button type="button" className="btn-start">
								🚀 Start
							</button>
							<button type="button" className="btn-decline">
								❌ Decline
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default PilotJobBoardOptimized;
