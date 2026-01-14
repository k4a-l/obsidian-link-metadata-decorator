import {
	type CachedMetadata,
	type MarkdownPostProcessorContext,
	TFile,
} from "obsidian";
import { DecorationClasses } from "./constants"; // Add import
import {
	createDecorationElement,
	findMatchingRules,
	resolveDecorationStyle,
} from "./decorator-logic";
import type LinkMetadataDecorator from "./main";

export function processReadingView(
	plugin: LinkMetadataDecorator,
	element: HTMLElement,
	context: MarkdownPostProcessorContext,
) {
	const links = element.querySelectorAll("a.internal-link");
	links.forEach((link: HTMLElement) => {
		const linkHref = link.getAttribute("href");
		if (!linkHref) return;

		const dest = plugin.app.metadataCache.getFirstLinkpathDest(
			linkHref,
			context.sourcePath,
		);

		if (dest instanceof TFile) {
			const cache = plugin.app.metadataCache.getFileCache(dest);
			if (cache) {
				processLink(plugin, link, cache, dest);
			}
		}
	});
}

function processLink(
	plugin: LinkMetadataDecorator,
	link: HTMLElement,
	cache: CachedMetadata,
	file: TFile,
) {
	// 1. Find Matching Rules (Shared Logic)
	const matchedRules = findMatchingRules(plugin.settings.rules, cache, file);

	if (matchedRules.length === 0) return;

	// 2. Apply Styles (CSS Class & Color)
	const { cssClass } = resolveDecorationStyle(matchedRules);

	// Always add the base class for consistency between views
	link.addClass(DecorationClasses.LINK_TEXT_RV);

	if (cssClass) {
		link.addClass(cssClass);
	}

	// 3. Apply Widgets (Text & Icons)
	for (const rule of matchedRules) {
		if (rule.text || rule.icon) {
			const decorationId = `lmd-${rule.text || ""}-${rule.icon || ""}`;
			const position = rule.position || "after";

			let exists = false;
			// Simple sibling check for existence
			if (position === "after") {
				let sibling = link.nextElementSibling;
				while (sibling) {
					if (
						sibling.classList.contains(DecorationClasses.DECORATION) &&
						sibling.getAttribute("data-lmd-id") === decorationId
					) {
						exists = true;
						break;
					}
					sibling = sibling.nextElementSibling;
					if (
						!sibling ||
						!sibling.classList.contains(DecorationClasses.DECORATION)
					)
						break;
				}
			} else {
				let sibling = link.previousElementSibling;
				while (sibling) {
					if (
						sibling.classList.contains(DecorationClasses.DECORATION) &&
						sibling.getAttribute("data-lmd-id") === decorationId
					) {
						exists = true;
						break;
					}
					sibling = sibling.previousElementSibling;
					if (
						!sibling ||
						!sibling.classList.contains(DecorationClasses.DECORATION)
					)
						break;
				}
			}

			if (exists) continue;

			// Use shared DOM creation logic
			const span = createDecorationElement({
				icon: rule.icon,
				text: rule.text,
				position: position as "before" | "after",
				cssClass: rule.cssClass,
				decorationId: decorationId,
			});

			if (position === "after") {
				// Find the last decoration after the link
				let target: Element = link;
				let next = link.nextElementSibling;
				while (next?.classList.contains(DecorationClasses.DECORATION)) {
					target = next;
					next = next.nextElementSibling;
				}
				target.after(span);
			} else {
				// Insert before the link (sibling)
				link.before(span);
			}
		}
	}
}
