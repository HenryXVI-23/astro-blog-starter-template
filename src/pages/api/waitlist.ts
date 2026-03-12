import type { APIRoute } from "astro";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_FORM_FILL_MS = 2500;

type WaitlistPayload = {
	email?: string;
	company?: string;
	startedAt?: number | string;
	turnstileToken?: string;
};

type ProviderName = "kit" | "buttondown" | "webhook";

function json(status: number, body: Record<string, unknown>) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
		},
	});
}

function parsePayload(payload: WaitlistPayload) {
	const email = String(payload.email ?? "").trim().toLowerCase();
	const honeypot = String(payload.company ?? "").trim();
	const startedAt = Number(payload.startedAt);
	const turnstileToken = String(payload.turnstileToken ?? "").trim();

	return { email, honeypot, startedAt, turnstileToken };
}

function getAllowedOrigins(requestOrigin: string, configuredOrigins?: string) {
	const set = new Set<string>();
	set.add(requestOrigin);

	for (const raw of String(configuredOrigins ?? "").split(",")) {
		const origin = raw.trim();
		if (origin) set.add(origin);
	}

	return set;
}

function isValidEmail(email: string) {
	return email.length > 3 && email.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(email);
}

function splitCsv(value?: string): string[] {
	return String(value ?? "")
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}

function resolveProvider(env: Env): ProviderName {
	const configured = String(env.WAITLIST_PROVIDER ?? "").trim().toLowerCase();
	if (configured === "kit" || configured === "buttondown" || configured === "webhook") {
		return configured;
	}

	if (env.WAITLIST_KIT_API_KEY) return "kit";
	if (env.WAITLIST_BUTTONDOWN_API_KEY) return "buttondown";
	return "webhook";
}

async function verifyTurnstile(secret: string, token: string, ip?: string): Promise<boolean> {
	const formData = new FormData();
	formData.set("secret", secret);
	formData.set("response", token);
	if (ip) formData.set("remoteip", ip);

	const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		body: formData,
	});

	if (!response.ok) return false;
	const result = (await response.json()) as { success?: boolean };
	return result.success === true;
}

async function subscribeViaKit(
	email: string,
	env: Env,
	referrer: string,
): Promise<{ ok: boolean; status: number }> {
	const apiKey = String(env.WAITLIST_KIT_API_KEY ?? "").trim();
	if (!apiKey) return { ok: false, status: 503 };

	// Create or upsert subscriber.
	const subscriberResponse = await fetch("https://api.kit.com/v4/subscribers", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-kit-api-key": apiKey,
		},
		body: JSON.stringify({
			email_address: email,
			state: "active",
			referrer,
		}),
	});

	if (!subscriberResponse.ok) return { ok: false, status: 502 };

	const formId = String(env.WAITLIST_KIT_FORM_ID ?? "").trim();
	if (formId) {
		const formResponse = await fetch(`https://api.kit.com/v4/forms/${formId}/subscribers`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-kit-api-key": apiKey,
			},
			body: JSON.stringify({
				email_address: email,
				referrer,
			}),
		});

		if (!formResponse.ok) return { ok: false, status: 502 };
	}

	const tagId = String(env.WAITLIST_KIT_TAG_ID ?? "").trim();
	if (tagId) {
		const tagResponse = await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-kit-api-key": apiKey,
			},
			body: JSON.stringify({
				email_address: email,
			}),
		});

		if (!tagResponse.ok) return { ok: false, status: 502 };
	}

	const sequenceId = String(env.WAITLIST_KIT_SEQUENCE_ID ?? "").trim();
	if (sequenceId) {
		const sequenceResponse = await fetch(`https://api.kit.com/v4/sequences/${sequenceId}/subscribers`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-kit-api-key": apiKey,
			},
			body: JSON.stringify({
				email_address: email,
			}),
		});

		if (!sequenceResponse.ok) return { ok: false, status: 502 };
	}

	return { ok: true, status: 200 };
}

async function subscribeViaButtondown(email: string, env: Env): Promise<{ ok: boolean; status: number }> {
	const apiKey = String(env.WAITLIST_BUTTONDOWN_API_KEY ?? "").trim();
	if (!apiKey) return { ok: false, status: 503 };

	const tags = splitCsv(env.WAITLIST_BUTTONDOWN_TAGS);

	const response = await fetch("https://api.buttondown.com/v1/subscribers", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Token ${apiKey}`,
			"x-buttondown-collision-behavior": "add",
		},
		body: JSON.stringify({
			email_address: email,
			tags,
			metadata: {
				source: "unframed.report",
			},
		}),
	});

	if (!response.ok) return { ok: false, status: 502 };
	return { ok: true, status: 200 };
}

async function subscribeViaWebhook(email: string, env: Env): Promise<{ ok: boolean; status: number }> {
	const webhookURL = env.WAITLIST_WEBHOOK_URL;
	const webhookBearer = env.WAITLIST_WEBHOOK_BEARER_TOKEN;
	if (!webhookURL) return { ok: false, status: 503 };

	const response = await fetch(webhookURL, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...(webhookBearer ? { authorization: `Bearer ${webhookBearer}` } : {}),
		},
		body: JSON.stringify({
			email,
			source: "unframed.report",
			createdAt: new Date().toISOString(),
		}),
	});

	if (!response.ok) return { ok: false, status: 502 };
	return { ok: true, status: 200 };
}

export const POST: APIRoute = async ({ request, locals, clientAddress, url }) => {
	const env = locals.runtime.env;
	const provider = resolveProvider(env);
	const turnstileSecret = env.TURNSTILE_SECRET_KEY;
	const allowedOrigins = getAllowedOrigins(url.origin, env.ALLOWED_ORIGINS);

	const origin = request.headers.get("origin");
	if (origin && !allowedOrigins.has(origin)) {
		return json(403, { ok: false, message: "Origin not allowed." });
	}

	const contentType = request.headers.get("content-type") ?? "";
	let rawPayload: WaitlistPayload;

	try {
		if (contentType.includes("application/json")) {
			rawPayload = (await request.json()) as WaitlistPayload;
		} else {
			const formData = await request.formData();
			rawPayload = {
				email: String(formData.get("email") ?? ""),
				company: String(formData.get("company") ?? ""),
				startedAt: String(formData.get("startedAt") ?? ""),
				turnstileToken: String(formData.get("turnstileToken") ?? ""),
			};
		}
	} catch {
		return json(400, { ok: false, message: "Invalid request body." });
	}

	const { email, honeypot, startedAt, turnstileToken } = parsePayload(rawPayload);

	// Quietly accept likely bot submissions so the endpoint is harder to probe.
	if (honeypot) return json(200, { ok: true });

	if (!isValidEmail(email)) {
		return json(400, { ok: false, message: "Bitte eine gueltige E-Mail eingeben." });
	}

	if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FORM_FILL_MS) {
		return json(400, { ok: false, message: "Bitte Formular erneut absenden." });
	}

	if (turnstileSecret) {
		if (!turnstileToken) {
			return json(400, { ok: false, message: "Sicherheitscheck fehlt." });
		}

		const turnstileOk = await verifyTurnstile(turnstileSecret, turnstileToken, clientAddress);
		if (!turnstileOk) {
			return json(400, { ok: false, message: "Sicherheitscheck fehlgeschlagen." });
		}
	}

	try {
		let result: { ok: boolean; status: number };
		if (provider === "kit") {
			result = await subscribeViaKit(email, env, url.origin);
		} else if (provider === "buttondown") {
			result = await subscribeViaButtondown(email, env);
		} else {
			result = await subscribeViaWebhook(email, env);
		}

		if (!result.ok && result.status === 503) {
			return json(503, { ok: false, message: "Warteliste ist noch nicht aktiv." });
		}
		if (!result.ok) return json(502, { ok: false, message: "Eintrag aktuell nicht moeglich." });
	} catch {
		return json(502, { ok: false, message: "Eintrag aktuell nicht moeglich." });
	}

	return json(200, { ok: true, message: "Danke. Du stehst auf der Warteliste." });
};

export const GET: APIRoute = async () => {
	return json(405, { ok: false, message: "Method not allowed." });
};
