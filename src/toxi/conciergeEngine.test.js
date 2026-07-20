import { createConciergeSession, stepConcierge } from "./conciergeEngine";

describe("toxi conciergeEngine", () => {
    test("becomes ready for a clean route + deadline + service type", () => {
        const session = createConciergeSession();
        const { session: next, turn } = stepConcierge(
            session,
            "Need to buy groceries for my family. Lagos Island to Ikeja by 12pm on Friday.",
        );

        expect(next.state.serviceType?.value).toMatch(/grocery/i);
        expect(next.state.pickupLocation?.value).toMatch(/lagos island/i);
        expect(next.state.dropoffLocation?.value).toMatch(/ikeja/i);
        expect(next.state.deadline?.value.toLowerCase()).toContain("friday");
        expect(next.state.deadline?.value.toLowerCase()).toContain("12pm");
        expect(turn.ready).toBe(true);
        expect(next.state.conversationStage).toBe("ready");
        expect(turn.assistantText.toLowerCase()).toContain("summary");
    });

    test("keeps airport transport intent separate from locations", () => {
        const session = createConciergeSession();
        const { session: next, turn } = stepConcierge(
            session,
            "I need to collect a friend at the airport in Lagos and drive him to Ibadan on Monday by 5pm.",
        );

        expect(next.state.serviceType?.value.toLowerCase()).toContain("airport");
        expect(next.state.serviceType?.value.toLowerCase()).toContain("pickup");
        expect(next.state.serviceType?.value.toLowerCase()).not.toBe("airport");
        expect(next.state.pickupLocation?.value.toLowerCase()).toContain("airport");
        expect(next.state.dropoffLocation?.value.toLowerCase()).toContain("ibadan");
        expect(next.state.deadline?.value.toLowerCase()).toContain("monday");
        expect(next.state.deadline?.value.toLowerCase()).toContain("5pm");
        expect(turn.ready).toBe(true);
    });

    test("handles partial airport pickup follow-ups without asking for the task again", () => {
        const session = createConciergeSession();
        const first = stepConcierge(session, "Pickup a friend at MMA Lagos.");

        expect(first.turn.ready).toBe(false);
        expect(first.session.state.serviceType?.value.toLowerCase()).toContain("pickup");
        expect(first.session.state.pickupLocation?.value.toLowerCase()).toContain("mma");
        expect(first.turn.assistantText.toLowerCase()).toContain("where should it end");
        expect(first.turn.assistantText.toLowerCase()).not.toContain("what needs to be handled");

        const second = stepConcierge(first.session, "Take him to Ibadan on Monday by 5pm.");
        expect(second.turn.ready).toBe(true);
        expect(second.session.state.dropoffLocation?.value.toLowerCase()).toContain("ibadan");
        expect(second.session.state.deadline?.value.toLowerCase()).toContain("monday");
    });

    test("asks only for missing essentials (anti-repetition guard)", () => {
        const session = createConciergeSession();
        const first = stepConcierge(session, "I need you to buy groceries.");
        expect(first.turn.ready).toBe(false);
            expect(first.turn.assistantText.toLowerCase()).toContain("where should it start");

        // Provide a deadline, but not route yet.
        const second = stepConcierge(first.session, "Tomorrow by 2pm.");
        expect(second.turn.ready).toBe(false);
            // Deterministic guard: it should ask for exactly the next required field.
        const secondText = second.turn.assistantText.toLowerCase();
            expect(secondText).toContain("where it should start");
            expect(secondText).not.toContain("when should it happen");

        // Now provide route; should become ready (and not ask deadline again).
        const third = stepConcierge(second.session, "From Lekki to Ikeja.");
        expect(third.turn.ready).toBe(true);
            expect(third.turn.assistantText.toLowerCase()).toContain("continue with the request");
    });

        test("asks for one next field at a time in priority order", () => {
            const session = createConciergeSession({
                pickupLocation: {
                    value: "Lekki",
                    confidence: "high",
                    source: "user",
                },
            });
            const first = stepConcierge(session, "It is a passport pickup.");

            expect(first.turn.ready).toBe(false);
            expect(first.turn.assistantText.toLowerCase()).toContain("where should it end");
            expect(first.turn.assistantText.toLowerCase()).not.toContain("when should it happen");

            const second = stepConcierge(first.session, "From Lekki to Ikeja.");
            expect(second.turn.assistantText.toLowerCase()).toContain("when should it happen");
        });

    test("can use AI extraction to fill required fields", () => {
        const session = createConciergeSession();
        const aiExtraction = {
            serviceType: { value: "courier / delivery", confidence: "medium", source: "inferred" },
            pickupLocation: { value: "Lekki", confidence: "medium", source: "inferred" },
            dropoffLocation: { value: "Ikeja", confidence: "medium", source: "inferred" },
            deadline: { value: "Tomorrow by 2pm", confidence: "medium", source: "inferred" },
        };

        const { session: next, turn } = stepConcierge(
            session,
            "Need help with something - can you handle it?",
            aiExtraction,
        );

        expect(next.state.pickupLocation?.value.toLowerCase()).toContain("lekki");
        expect(next.state.dropoffLocation?.value.toLowerCase()).toContain("ikeja");
        expect(next.state.deadline?.value.toLowerCase()).toContain("2pm");
        expect(turn.ready).toBe(true);
    });

    test("does not let AI override user-provided high-confidence fields", () => {
        const session = createConciergeSession();
        const aiExtraction = {
            pickupLocation: { value: "Victoria Island", confidence: "medium", source: "inferred" },
            dropoffLocation: { value: "Yaba", confidence: "medium", source: "inferred" },
        };

        const { session: next } = stepConcierge(session, "From Lekki to Ikeja.", aiExtraction);

        expect(next.state.pickupLocation?.value.toLowerCase()).toContain("lekki");
        expect(next.state.dropoffLocation?.value.toLowerCase()).toContain("ikeja");
        expect(next.state.pickupLocation?.confidence).toBe("high");
        expect(next.state.dropoffLocation?.confidence).toBe("high");
    });
    test("maps grocery, pharmacy, courier, and legal errands to the right service types", () => {
        const grocery = stepConcierge(
            createConciergeSession(),
            "Buy groceries from Ebeano Lekki to Ikoyi by 7pm today.",
        );
        expect(grocery.session.state.serviceType?.value.toLowerCase()).toContain("grocery");

        const pharmacy = stepConcierge(
            createConciergeSession(),
            "Pick up my prescription from MedPlus in Victoria Island and take it to Ikoyi by 6pm.",
        );
        expect(pharmacy.session.state.serviceType?.value.toLowerCase()).toContain("pharmacy");

        const courier = stepConcierge(
            createConciergeSession(),
            "Send a parcel from Yaba to Ikeja tomorrow by 10am.",
        );
        expect(courier.session.state.serviceType?.value.toLowerCase()).toContain("courier");

        const legal = stepConcierge(
            createConciergeSession(),
            "File a court affidavit from Lekki to the Lagos High Court registry by 9am Monday.",
        );
        expect(legal.session.state.serviceType?.value.toLowerCase()).toContain("legal");
    });
});
