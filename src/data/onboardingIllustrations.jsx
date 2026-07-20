import React from "react";

function Frame({ title, subtitle, children }) {
    return (
        <div
            style={{
                marginTop: 12,
                marginBottom: 10,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background:
                    "radial-gradient(120% 140% at 20% 0%, rgba(37, 99, 235, 0.12), rgba(99, 102, 241, 0.06) 55%, rgba(255,255,255,0) 100%)",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#0f172a",
                            letterSpacing: 0.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {title}
                    </div>
                    {subtitle ? (
                        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(15, 23, 42, 0.55)" }}>{subtitle}</div>
                    ) : null}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(37, 99, 235, 0.9)" }} aria-hidden="true">
                    ✦
                </div>
            </div>
            <div
                style={{
                    height: 130,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 10,
                }}
                aria-hidden="true"
            >
                {children}
            </div>
        </div>
    );
}

function Svg({ children, viewBox = "0 0 320 160" }) {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            focusable="false"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="ebTourGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2563eb" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#6366f1" stopOpacity="0.9" />
                </linearGradient>
                <filter id="ebTourSoft" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" />
                </filter>
            </defs>
            {children}
        </svg>
    );
}

export const CUSTOMER_TOUR_ILLUSTRATIONS = {
    welcome: (
        <Frame title="Welcome" subtitle="A quick guided tour">
            <Svg>
                <circle cx="70" cy="46" r="18" fill="url(#ebTourGradient)" />
                <circle cx="70" cy="46" r="28" fill="url(#ebTourGradient)" opacity="0.18" filter="url(#ebTourSoft)" />
                <path
                    d="M70 62c10 0 18-8 18-18S80 26 70 26 52 34 52 44s8 18 18 18z"
                    fill="#ffffff"
                    opacity="0.2"
                />
                <path
                    d="M70 36c-5.5 0-10 4.5-10 10 0 7.5 10 18 10 18s10-10.5 10-18c0-5.5-4.5-10-10-10zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
                    fill="#ffffff"
                />

                <path
                    d="M92 88c30-38 60-50 100-38 34 10 50 34 82 26"
                    fill="none"
                    stroke="url(#ebTourGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="10 10"
                    opacity="0.65"
                />

                <rect x="186" y="86" width="110" height="44" rx="12" fill="#ffffff" opacity="0.95" />
                <rect x="198" y="98" width="78" height="8" rx="4" fill="#e2e8f0" />
                <rect x="198" y="112" width="58" height="8" rx="4" fill="#cbd5e1" />
                <circle cx="292" cy="108" r="10" fill="url(#ebTourGradient)" />
            </Svg>
        </Frame>
    ),

    tabs: (
        <Frame title="Navigation" subtitle="Create vs track">
            <Svg>
                <rect x="44" y="36" width="232" height="88" rx="18" fill="#ffffff" opacity="0.95" />
                <rect x="62" y="54" width="110" height="34" rx="14" fill="url(#ebTourGradient)" />
                <rect x="178" y="54" width="98" height="34" rx="14" fill="#e2e8f0" />
                <rect x="70" y="64" width="70" height="6" rx="3" fill="#ffffff" opacity="0.92" />
                <rect x="194" y="64" width="62" height="6" rx="3" fill="#94a3b8" />
                <rect x="62" y="98" width="188" height="10" rx="5" fill="#e2e8f0" />
            </Svg>
        </Frame>
    ),

    category: (
        <Frame title="Category" subtitle="Sets pricing + templates">
            <Svg>
                <rect x="56" y="36" width="208" height="88" rx="18" fill="#ffffff" opacity="0.95" />
                <rect x="74" y="54" width="74" height="26" rx="13" fill="#e2e8f0" />
                <rect x="152" y="54" width="92" height="26" rx="13" fill="url(#ebTourGradient)" />
                <rect x="74" y="86" width="56" height="10" rx="5" fill="#cbd5e1" />
                <rect x="134" y="86" width="110" height="10" rx="5" fill="#e2e8f0" />
                <circle cx="202" cy="68" r="6" fill="#ffffff" opacity="0.9" />
            </Svg>
        </Frame>
    ),

    template: (
        <Frame title="Template" subtitle="A starting outline">
            <Svg>
                <rect x="98" y="26" width="124" height="116" rx="18" fill="#ffffff" opacity="0.95" />
                <rect x="116" y="48" width="88" height="10" rx="5" fill="#cbd5e1" />
                <rect x="116" y="68" width="72" height="10" rx="5" fill="#e2e8f0" />
                <rect x="116" y="88" width="84" height="10" rx="5" fill="#e2e8f0" />
                <rect x="116" y="108" width="62" height="10" rx="5" fill="#e2e8f0" />
                <circle cx="214" cy="44" r="16" fill="url(#ebTourGradient)" opacity="0.92" />
                <path d="M214 35l2.4 6.3 6.6 0.2-5.2 4 1.8 6.4-5.6-3.6-5.6 3.6 1.8-6.4-5.2-4 6.6-0.2z" fill="#ffffff" />
            </Svg>
        </Frame>
    ),

    tiers: (
        <Frame title="Priority level" subtitle="Standard • Priority • Premium">
            <Svg>
                <rect x="48" y="46" width="72" height="70" rx="16" fill="#e2e8f0" />
                <rect x="124" y="36" width="72" height="80" rx="16" fill="url(#ebTourGradient)" opacity="0.92" />
                <rect x="200" y="54" width="72" height="62" rx="16" fill="#e2e8f0" />
                <rect x="62" y="104" width="44" height="8" rx="4" fill="#94a3b8" opacity="0.75" />
                <rect x="140" y="100" width="44" height="8" rx="4" fill="#ffffff" opacity="0.9" />
                <rect x="216" y="104" width="44" height="8" rx="4" fill="#94a3b8" opacity="0.75" />
            </Svg>
        </Frame>
    ),

    checkout: (
        <Frame title="Checkout" subtitle="Review & pay when ready">
            <Svg>
                <rect x="62" y="42" width="196" height="80" rx="18" fill="#ffffff" opacity="0.95" />
                <rect x="78" y="60" width="92" height="12" rx="6" fill="#e2e8f0" />
                <rect x="78" y="80" width="150" height="12" rx="6" fill="#cbd5e1" />
                <rect x="78" y="100" width="110" height="10" rx="5" fill="#e2e8f0" />
                <rect x="188" y="94" width="58" height="22" rx="11" fill="url(#ebTourGradient)" opacity="0.92" />
                <path d="M208 105h18" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                <circle cx="246" cy="56" r="14" fill="url(#ebTourGradient)" opacity="0.22" filter="url(#ebTourSoft)" />
            </Svg>
        </Frame>
    ),

    proof: (
        <Frame title="Proof" subtitle="Receipt • photo • delivery confirmation">
            <Svg>
                <path
                    d="M160 30c28 0 54 10 54 10v40c0 36-26 54-54 64-28-10-54-28-54-64V40s26-10 54-10z"
                    fill="url(#ebTourGradient)"
                    opacity="0.92"
                />
                <path
                    d="M140 82l14 14 30-34"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </Frame>
    ),

    tracking: (
        <Frame title="Tracking" subtitle="See updates in My Errands">
            <Svg>
                <rect x="76" y="32" width="168" height="96" rx="18" fill="#ffffff" opacity="0.95" />
                <circle cx="98" cy="58" r="10" fill="url(#ebTourGradient)" opacity="0.92" />
                <rect x="116" y="52" width="104" height="12" rx="6" fill="#e2e8f0" />
                <circle cx="98" cy="88" r="10" fill="#e2e8f0" />
                <rect x="116" y="82" width="92" height="12" rx="6" fill="#cbd5e1" />
                <circle cx="98" cy="118" r="10" fill="#e2e8f0" />
                <rect x="116" y="112" width="78" height="12" rx="6" fill="#e2e8f0" />
            </Svg>
        </Frame>
    ),
};
