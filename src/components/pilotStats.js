export const normalizePilotStats = (stats = {}) => {
    const totalCompleted = Number(stats.totalDeliveries ?? stats.totalErrands ?? 0);
    const completedToday = Number(stats.completedToday ?? stats.todayDeliveries ?? 0);
    const earnings = Number(stats.earnings ?? 0);
    const rawRating = stats.rating;
    const rating =
        rawRating === null || rawRating === undefined || rawRating === ""
            ? NaN
            : Number(rawRating);

    return {
        ...stats,
        totalDeliveries: Number.isFinite(totalCompleted) ? totalCompleted : 0,
        totalErrands: Number.isFinite(totalCompleted) ? totalCompleted : 0,
        completedToday: Number.isFinite(completedToday) ? completedToday : 0,
        todayDeliveries: Number.isFinite(completedToday) ? completedToday : 0,
        earnings: Number.isFinite(earnings) ? earnings : 0,
        rating: Number.isFinite(rating) ? rating : 4.8,
    };
};