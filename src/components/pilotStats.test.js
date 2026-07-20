import { normalizePilotStats } from "./pilotStats";

describe("normalizePilotStats", () => {
    test("preserves completed totals from the backend stats payload", () => {
        expect(
            normalizePilotStats({
                totalDeliveries: 10,
                completedToday: 2,
                earnings: 25000,
                rating: 4.7,
            }),
        ).toMatchObject({
            totalDeliveries: 10,
            totalErrands: 10,
            completedToday: 2,
            todayDeliveries: 2,
            earnings: 25000,
            rating: 4.7,
        });
    });

    test("supports the legacy totalErrands and todayDeliveries keys", () => {
        expect(
            normalizePilotStats({
                totalErrands: 4,
                todayDeliveries: 1,
                earnings: 5000,
                rating: null,
            }),
        ).toMatchObject({
            totalDeliveries: 4,
            totalErrands: 4,
            completedToday: 1,
            todayDeliveries: 1,
            earnings: 5000,
            rating: 4.8,
        });
    });
});