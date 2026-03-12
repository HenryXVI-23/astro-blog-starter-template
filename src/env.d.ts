type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

interface Env {
	WAITLIST_PROVIDER?: string;
	WAITLIST_KIT_API_KEY?: string;
	WAITLIST_KIT_FORM_ID?: string;
	WAITLIST_KIT_TAG_ID?: string;
	WAITLIST_KIT_SEQUENCE_ID?: string;
	WAITLIST_BUTTONDOWN_API_KEY?: string;
	WAITLIST_BUTTONDOWN_TAGS?: string;
	WAITLIST_WEBHOOK_URL?: string;
	WAITLIST_WEBHOOK_BEARER_TOKEN?: string;
	ALLOWED_ORIGINS?: string;
	TURNSTILE_SECRET_KEY?: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
