import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";

import ErrandChatPanel from "./ErrandChatPanel";

describe("ErrandChatPanel", () => {
    beforeEach(() => {
        window.localStorage?.clear?.();
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ messages: [] }),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("keeps transcript visible but disables composing when locked", async () => {
        render(
            <ErrandChatPanel
                errandId={42}
                apiBaseUrl="https://example.com"
                token="token"
                disabled
                disabledMessage="Chat is unavailable because this errand is already completed."
                quickReplies={["I’m on the way"]}
            />,
        );

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        expect(
            screen.getByText(/chat is unavailable because this errand is already completed/i),
        ).toBeTruthy();
        expect(screen.getByPlaceholderText(/type a message/i).disabled).toBe(true);
        expect(screen.getByRole("button", { name: /send/i }).disabled).toBe(true);
        expect(screen.getByRole("button", { name: /i’m on the way/i }).disabled).toBe(true);
    });

    test("counts only real chat messages and keeps notices separate", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                messages: [
                    {
                        id: 7,
                        message: "On my way now",
                        mine: true,
                        sender_name: "Pilot",
                        created_at: "2026-04-10T19:00:00.000Z",
                    },
                ],
            }),
        });

        render(
            <ErrandChatPanel
                errandId={42}
                apiBaseUrl="https://example.com"
                token="token"
                variant="room"
                showHeader={false}
                systemMessages={[
                    "This chat is for errand coordination only.",
                    "Messages are visible to the client.",
                ]}
            />,
        );

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        // Fetch resolving does not guarantee React has committed the state update yet.
        // Wait for the derived count labels to render.
        expect(await screen.findByText("1 message")).toBeTruthy();
        // System notices include built-in compliance and security reminders.
        // HTTPS bases also include the encryption-in-transit notice.
        expect(await screen.findByText("5 notices")).toBeTruthy();
        expect(screen.queryByText("3 messages")).toBeNull();
    });

    test("uses the mobile-safe composer input class for the chat textarea", async () => {
        render(
            <ErrandChatPanel
                errandId={42}
                apiBaseUrl="https://example.com"
                token="token"
                variant="room"
                showHeader={false}
            />,
        );

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        expect(screen.getByRole("textbox")).toHaveClass(
            "errand-chat-composer__input",
        );
    });
});
