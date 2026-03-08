import { prefixMap } from '~/config/detail-sections';

/**
 * Regex to match entity codes like CP-005, CPS-001, ND-0001, DEP-0042, WF-001
 * Pattern: 1-4 uppercase letters, dash, 3-4 digits
 */
const CODE_REGEX = /\b([A-Z]{1,4})-(\d{3,4})\b/g;

export interface CodeLink {
	text: string;
	code: string;
	entityType: string;
	url: string;
}

/**
 * Parse a string and extract all entity code references.
 * Returns array of { text, code, entityType, url } for each match.
 */
export function extractCodeLinks(text: string): CodeLink[] {
	if (!text || typeof text !== 'string') return [];
	const links: CodeLink[] = [];
	let match;
	CODE_REGEX.lastIndex = 0;
	while ((match = CODE_REGEX.exec(text)) !== null) {
		const prefix = match[1];
		const entityType = prefixMap[prefix];
		if (entityType) {
			const code = match[0];
			links.push({
				text: code,
				code,
				entityType,
				url: `/knowledge/registries/${entityType}/${code}`,
			});
		}
	}
	return links;
}

/**
 * Check if a value looks like an entity code (PREFIX-NNN).
 * Returns the link URL if it matches, null otherwise.
 */
export function getCodeLinkUrl(value: string): string | null {
	if (!value || typeof value !== 'string') return null;
	const trimmed = value.trim();
	CODE_REGEX.lastIndex = 0;
	const match = CODE_REGEX.exec(trimmed);
	if (match && match[0] === trimmed) {
		const prefix = match[1];
		const entityType = prefixMap[prefix];
		if (entityType) {
			return `/knowledge/registries/${entityType}/${trimmed}`;
		}
	}
	return null;
}

/**
 * Split text into segments of plain text and code links.
 * Useful for rendering mixed text with clickable code references.
 */
export function splitTextWithLinks(text: string): Array<{ type: 'text'; value: string } | { type: 'link'; value: string; url: string }> {
	if (!text || typeof text !== 'string') return [{ type: 'text', value: text || '' }];

	const segments: Array<{ type: 'text'; value: string } | { type: 'link'; value: string; url: string }> = [];
	let lastIndex = 0;
	let match;

	CODE_REGEX.lastIndex = 0;
	while ((match = CODE_REGEX.exec(text)) !== null) {
		const prefix = match[1];
		const entityType = prefixMap[prefix];
		if (!entityType) continue;

		if (match.index > lastIndex) {
			segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
		}
		segments.push({
			type: 'link',
			value: match[0],
			url: `/knowledge/registries/${entityType}/${match[0]}`,
		});
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		segments.push({ type: 'text', value: text.slice(lastIndex) });
	}

	return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}
