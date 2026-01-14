import { RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	type PluginValue,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import {
	type App,
	editorLivePreviewField,
	type LinkCache,
	TFile,
} from "obsidian";
import { DecorationClasses } from "./constants";
import {
	createDecorationElement,
	findMatchingRules,
	type MatchedRule,
	resolveDecorationStyle,
} from "./decorator-logic";
import type LinkMetadataDecorator from "./main";

class IconWidget extends WidgetType {
	constructor(
		private icon: string,
		private text: string | null,
		private position: "before" | "after",
		private cssClass?: string,
	) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		// Use shared logic for DOM creation
		return createDecorationElement({
			icon: this.icon,
			text: this.text,
			position: this.position,
			cssClass: this.cssClass,
		});
	}
}

export const buildLinkMetadataDecorations = (
	app: App,
	plugin: LinkMetadataDecorator,
) =>
	ViewPlugin.fromClass(
		class implements PluginValue {
			decorations: DecorationSet;
			lastSelectionTime: number = 0;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.selectionSet) {
					this.lastSelectionTime = Date.now();
				}

				if (
					update.docChanged ||
					update.viewportChanged ||
					update.focusChanged ||
					update.selectionSet
				) {
					// Delay for click
					setTimeout(() => {
						this.decorations = this.buildDecorations(update.view);
					}, 1);
				}
			}

			destroy() {}

			buildDecorations(view: EditorView): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();

				// Helper: Get current file and cache
				const file = getActiveFile(view, app);
				if (!file) return builder.finish();
				const cache = app.metadataCache.getFileCache(file);
				if (!cache?.links) return builder.finish();

				const decorations = [];
				const selection = view.state.selection.main;
				const selectionStartLine = view.state.doc.lineAt(selection.from).number;
				const selectionEndLine = view.state.doc.lineAt(selection.to).number;

				for (const link of cache.links) {
					// Use line-based detection for hiding decorations (Edit Mode)
					// Obsidian Cache lines are 0-indexed. CM6 lines are 1-indexed.
					const linkStartLine = link.position.start.line;
					const linkEndLine = link.position.end.line;

					// Check if line ranges overlap
					// (SelectionEnd >= LinkStart) AND (SelectionStart <= LinkEnd)
					// Adjust selection lines to 0-indexed for comparison
					const isCursorOnLine =
						selectionEndLine - 1 >= linkStartLine &&
						selectionStartLine - 1 <= linkEndLine;

					const isOverlap = isCursorOnLine;

					// 1. Resolve Linked File's Metadata
					const linkedFile = app.metadataCache.getFirstLinkpathDest(
						link.link,
						file.path,
					);
					if (!(linkedFile instanceof TFile)) continue;
					const linkedCache = app.metadataCache.getFileCache(linkedFile);
					if (!linkedCache) continue;

					// 2. Find Matching Rules (Shared Logic)
					const matchedRules = findMatchingRules(
						plugin.settings.rules,
						linkedCache,
						linkedFile,
					);

					if (matchedRules.length > 0) {
						// 3. Create Decorations
						// A. CSS/Color Decoration (Text Style)
						const styleDecoration = createStyleDecoration(link, matchedRules);
						if (styleDecoration) decorations.push(styleDecoration);

						if (!isOverlap) {
							const widgetDecorations = createWidgetDecorations(
								link,
								matchedRules,
							);
							decorations.push(...widgetDecorations);
						}
					}
				}

				// Sort decorations required by RangeSetBuilder (sorted by 'from', then 'to')
				decorations.sort((a, b) => {
					if (a.from !== b.from) return a.from - b.from;
					return a.to - b.to;
				});

				for (const d of decorations) {
					builder.add(d.from, d.to, d.deco);
				}

				return builder.finish();
			}
		},
		{
			decorations: (v) => v.decorations,
		},
	);

// --- Helper Functions ---

function getActiveFile(view: EditorView, app: App): TFile | null {
	const file =
		// @ts-expect-error
		view.state.field(editorLivePreviewField)?.file ??
		app.workspace.getActiveFile();
	return file instanceof TFile ? file : null;
}

function createStyleDecoration(link: LinkCache, matchedRules: MatchedRule[]) {
	// Use shared logic for style resolution
	const { cssClass } = resolveDecorationStyle(matchedRules);

	if (!cssClass) return null;

	let className = DecorationClasses.LINK_TEXT_LP;
	if (cssClass) className += ` ${cssClass}`;

	return {
		from: link.position.start.offset,
		to: link.position.end.offset,
		deco: Decoration.mark({
			class: className,
		}),
	};
}

function createWidgetDecorations(link: LinkCache, matchedRules: MatchedRule[]) {
	const decorations = [];
	for (const rule of matchedRules) {
		if (rule.text || rule.icon) {
			const position = rule.position || "after";
			const side = position === "before" ? -1 : 1;
			const pos =
				side === -1 ? link.position.start.offset : link.position.end.offset;

			let combinedClass = rule.cssClass || "";
			if (rule.dynamicCssClass) {
				combinedClass =
					(combinedClass ? combinedClass + " " : "") + rule.dynamicCssClass;
			}

			decorations.push({
				from: pos,
				to: pos,
				deco: Decoration.widget({
					widget: new IconWidget(
						rule.icon,
						rule.text,
						position as "before" | "after",
						combinedClass,
					),
					side: side,
				}),
			});
		}
	}
	return decorations;
}
