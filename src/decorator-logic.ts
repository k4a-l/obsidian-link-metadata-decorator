import { setIcon } from "obsidian";
import { DecorationClasses } from "./constants";
import type { DecorationRule } from "./settings";

export interface MatchedRule extends DecorationRule {
	dynamicCssClass?: string;
}

export interface MetadataInfo {
	tags: string[];
	frontmatter: Record<string, unknown>;
	basename: string;
}

export function findMatchingRules(
	rules: DecorationRule[],
	metadata: MetadataInfo,
): MatchedRule[] {
	const tags = metadata.tags || [];
	const frontmatter = metadata.frontmatter || {};
	const matches: MatchedRule[] = [];

	for (const rule of rules) {
		if (rule.target === "metadata") {
			// Advanced Script Evaluation
			// 1. Prepare Metadata Object
			const meta = {
				name: metadata.basename || "Untitled",
				frontmatter: frontmatter,
				tags: tags.map((t) => t.replace(/^#/, "")),
			};

			let script = rule.value.trim();
			// Remove surrounding backticks if present
			if (script.startsWith("`") && script.endsWith("`")) {
				script = script.slice(1, -1);
			}
			// Evaluate script
			// Expected format: (meta) => ({ ... }) or return { ... }
			// We can reuse evaluateDynamicString concept but we need object return.

			try {
				// eslint-disable-next-line no-new-func
				const func = new Function(`return ${script}`)();

				if (typeof func === "function") {
					const result = func(meta);

					if (result) {
						// Process Result
						// result: { before?: {icon, text}, after?: {icon, text}, classname? }

						const commonClass = result.classname || "";

						if (result.before) {
							matches.push({
								...rule,
								position: "before",
								icon: result.before.icon || "",
								text: result.before.text || "",
								dynamicCssClass: commonClass,
								cssClass: "", // Clear static
							});
						}

						if (result.after) {
							matches.push({
								...rule,
								position: "after",
								icon: result.after.icon || "",
								text: result.after.text || "",
								dynamicCssClass: commonClass,
								cssClass: "", // Clear static
							});
						}

						// If only classname is provided
						if (!result.before && !result.after && commonClass) {
							matches.push({
								...rule,
								position: "after", // Default position, doesn't matter for style-only
								icon: "",
								text: "",
								dynamicCssClass: commonClass,
								cssClass: "",
							});
						}
					}
				}
			} catch (e) {
				console.warn("LMD: Error evaluating metadata script", e);
			}
			continue; // Skip standard processing
		}

		const result = isRuleMatched(rule, tags, frontmatter);
		if (result.matched) {
			const matchedRule: MatchedRule = { ...rule };

			if (result.dynamicClass) {
				matchedRule.dynamicCssClass = result.dynamicClass;
			}

			// Evaluate dynamic Text and Icon if target is frontmatter
			if (rule.target === "frontmatter" && rule.key in frontmatter) {
				const propValue = frontmatter[rule.key];

				const dynamicText = evaluateDynamicString(rule.text, propValue);
				if (dynamicText !== null) matchedRule.text = dynamicText;

				const dynamicIcon = evaluateDynamicString(rule.icon, propValue);
				if (dynamicIcon !== null) matchedRule.icon = dynamicIcon;

				const dynamicCss = evaluateDynamicString(rule.cssClass, propValue);
				if (dynamicCss !== null) {
					// Merge with existing dynamic class from value match if any
					matchedRule.dynamicCssClass =
						(matchedRule.dynamicCssClass
							? `${matchedRule.dynamicCssClass} `
							: "") + dynamicCss;
					// Clear static cssClass so it's not applied as a literal class name
					matchedRule.cssClass = "";
				}
			}

			matches.push(matchedRule);
		}
	}
	return matches;
}

function evaluateDynamicString(source: string, value: unknown): string | null {
	const jsMatch = source.match(/^`(.+)`$/);
	if (!jsMatch) return null;

	try {
		const body = jsMatch[1];
		// eslint-disable-next-line no-new-func
		const func = new Function(`return ${body}`)();
		if (typeof func === "function") {
			const result = func(value);
			return String(result);
		}
	} catch (e) {
		console.warn("LMD: Error evaluating dynamic string", e);
	}
	return null;
}

function isRuleMatched(
	rule: DecorationRule,
	tags: string[],
	frontmatter: Record<string, unknown>,
): { matched: boolean; dynamicClass?: string } {
	if (rule.target === "tag") {
		const targetTag = rule.key.startsWith("#") ? rule.key : `#${rule.key}`;
		const matched = tags.some(
			(t) => t === targetTag || t.startsWith(`${targetTag}/`),
		);
		return { matched };
	}

	if (rule.target === "frontmatter") {
		if (rule.key in frontmatter) {
			const propValue = frontmatter[rule.key];

			// If rule.value is empty, treat as wildcard match (always applies if key exists)
			if (!rule.value) {
				return { matched: true };
			}

			// Check if rule.value is wrapped in backticks for JS evaluation
			const jsMatch = rule.value.match(/^`(.+)`$/);

			if (jsMatch) {
				try {
					const body = jsMatch[1];
					// eslint-disable-next-line no-new-func
					const func = new Function(`return ${body}`)();
					if (typeof func === "function") {
						const result = func(propValue);
						if (typeof result === "string" && result.length > 0) {
							return { matched: true, dynamicClass: result };
						}
						// Allow truthy values to match without class
						if (result) {
							return { matched: true };
						}
						return { matched: false };
					}
				} catch (e) {
					console.warn("LMD: Error evaluating JS rule", e);
					return { matched: false };
				}
			}

			// Standard exact match
			const matched = String(propValue) === rule.value;
			return { matched };
		}
	}

	return { matched: false };
}

export function validateJsSource(source: string): {
	valid: boolean;
	error?: Error;
} {
	try {
		// Attempt to create a function to check for syntax errors
		new Function(`return ${source}`);
		return { valid: true };
	} catch (e) {
		return { valid: false, error: e as Error };
	}
}

export function resolveDecorationStyle(matchedRules: MatchedRule[]): {
	cssClass: string;
} {
	let combinedCssClass = "";

	for (const rule of matchedRules) {
		// Combine dynamic and static classes
		let cls = rule.dynamicCssClass || "";
		if (rule.cssClass) {
			cls += (cls ? " " : "") + rule.cssClass;
		}

		if (cls) {
			combinedCssClass += (combinedCssClass ? " " : "") + cls;
		}
	}

	return { cssClass: combinedCssClass };
}

export interface DecorationSpec {
	text: string | null;
	icon: string | null;
	position: "before" | "after";
	cssClass?: string;
	decorationId?: string;
	editing?: boolean;
}

export function createDecorationElement(spec: DecorationSpec): HTMLElement {
	const span = document.createElement("span");
	span.addClass(DecorationClasses.DECORATION);
	span.addClass(`${DecorationClasses.POS_PREFIX}${spec.position}`);

	if (spec.editing) {
		span.addClass("lmd-editing");
	}

	if (spec.cssClass) {
		span.addClass(spec.cssClass);
	}

	if (spec.decorationId) {
		span.setAttribute("data-lmd-id", spec.decorationId);
	}

	// Content Generation
	if (spec.position === "before" && spec.icon && spec.text) {
		// [Icon] [Text]
		const iconSpan = span.createSpan({ cls: DecorationClasses.ICON });
		setIcon(iconSpan, spec.icon);
		span.createSpan({ text: spec.text });
	} else {
		// [Text] [Icon] (default or 'after')
		if (spec.text) {
			span.createSpan({ text: spec.text });
		}
		if (spec.icon) {
			const iconSpan = span.createSpan({ cls: DecorationClasses.ICON });
			setIcon(iconSpan, spec.icon);
		}
	}

	return span;
}
