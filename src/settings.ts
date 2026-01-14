import {
	type App,
	type ButtonComponent,
	type DropdownComponent,
	type ExtraButtonComponent,
	PluginSettingTab,
	Setting,
	type TextAreaComponent,
	type TextComponent,
} from "obsidian";
import { validateJsSource } from "./decorator-logic";
import type LinkMetadataDecorator from "./main";

export interface DecorationRule {
	id: string;
	target: "tag" | "frontmatter" | "metadata";
	key: string;
	value: string;
	text: string;
	icon: string;
	position: "before" | "after";
	cssClass: string;
}

export interface LinkMetadataDecoratorSettings {
	rules: DecorationRule[];
}

export const DEFAULT_SETTINGS: LinkMetadataDecoratorSettings = {
	rules: [],
};

export class LinkMetadataDecoratorSettingTab extends PluginSettingTab {
	plugin: LinkMetadataDecorator;

	constructor(app: App, plugin: LinkMetadataDecorator) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Add new rule")
			.setDesc("Create a new rule for decorating links")
			.addButton((button: ButtonComponent) =>
				button.setButtonText("Add Rule").onClick(async () => {
					this.plugin.settings.rules.push({
						id: Date.now().toString(),
						target: "tag",
						key: "",
						value: "",
						text: "",
						icon: "",
						position: "after",
						cssClass: "",
					});
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		this.plugin.settings.rules.forEach((rule, index) => {
			const ruleDiv = containerEl.createDiv({
				cls: "rule-container",
				attr: {
					style:
						"border: 1px solid var(--background-modifier-border); padding: 10px; margin-bottom: 10px; border-radius: 5px;",
				},
			});

			new Setting(ruleDiv)
				.setHeading()
				.setName(`Rule #${index + 1}`)
				.addExtraButton((cb: ExtraButtonComponent) =>
					cb
						.setIcon("trash")
						.setTooltip("Delete rule")
						.onClick(async () => {
							this.plugin.settings.rules.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						}),
				);

			new Setting(ruleDiv)
				.setName("Target")
				.addDropdown((dd: DropdownComponent) =>
					dd
						.addOption("tag", "Tag")
						.addOption("frontmatter", "Frontmatter")
						.addOption("metadata", "Metadata (Advanced Script)")
						.setValue(rule.target)
						.onChange(async (v: string) => {
							rule.target = v as "tag" | "frontmatter" | "metadata";
							await this.plugin.saveSettings();
							this.display();
						}),
				);

			if (rule.target !== "metadata") {
				new Setting(ruleDiv)
					.setName(
						rule.target === "tag" ? "Tag Name (without #)" : "Frontmatter Key",
					)
					.addText((text: TextComponent) =>
						text
							.setValue(rule.key)
							.setPlaceholder(rule.target === "tag" ? "todo" : "status")
							.onChange(async (v: string) => {
								rule.key = v;
								await this.plugin.saveSettings();
							}),
					);
			}

			if (rule.target === "frontmatter") {
				new Setting(ruleDiv)
					.setName("Value to match")
					.setDesc(
						"Exact match, JS expression `...`, or leave empty to match any rule",
					)
					.addTextArea((text: TextAreaComponent) => {
						text
							.setValue(rule.value)
							.setPlaceholder("done")
							.onChange(async (v: string) => {
								rule.value = v;
								validateInput(text, v);
								await this.plugin.saveSettings();
							});
						// Initial validation
						validateInput(text, rule.value);
					});
			} else if (rule.target === "metadata") {
				new Setting(ruleDiv)
					.setName("Script")
					.setDesc(
						"JS function: (meta: {name, frontmatter, tags}) => { before?: {icon, text}, after?: {icon, text}, classname? }",
					)
					.addTextArea((text: TextAreaComponent) => {
						text
							.setValue(rule.value)
							.setPlaceholder(
								"(meta) => ({\n  classname: meta.frontmatter.status === 'done' ? 'is-done' : ''\n})",
							)
							.onChange(async (v: string) => {
								rule.value = v;
								validateScript(text, v);
								await this.plugin.saveSettings();
							});
						validateScript(text, rule.value);
					});
			}

			function validateScript(
				component: TextComponent | TextAreaComponent,
				value: string,
			) {
				let script = value.trim();
				if (script.startsWith("`") && script.endsWith("`")) {
					script = script.slice(1, -1);
				}
				const { valid, error } = validateJsSource(script);
				if (!valid) {
					component.inputEl.style.borderColor = "red";
					component.inputEl.title = `JS Syntax Error: ${error?.message}`;
				} else {
					component.inputEl.style.borderColor = "";
					component.inputEl.title = "";
				}
			}

			function validateInput(
				component: TextComponent | TextAreaComponent,
				value: string,
			) {
				const jsMatch = value.match(/^`(.+)`$/);
				if (jsMatch?.[1]) {
					const { valid, error } = validateJsSource(jsMatch[1]);
					if (!valid) {
						component.inputEl.style.borderColor = "red";
						component.inputEl.title = `JS Syntax Error: ${error?.message}`;
					} else {
						component.inputEl.style.borderColor = "";
						component.inputEl.title = "";
					}
				} else {
					component.inputEl.style.borderColor = "";
					component.inputEl.title = "";
				}
			}

			if (rule.target !== "metadata") {
				new Setting(ruleDiv)
					.setName("Position")
					.addDropdown((dd: DropdownComponent) =>
						dd
							.addOption("before", "Before Link")
							.addOption("after", "After Link")
							.setValue(rule.position || "after")
							.onChange(async (v: string) => {
								rule.position = v as "before" | "after";
								await this.plugin.saveSettings();
							}),
					);

				new Setting(ruleDiv)
					.setName("Custom CSS Class")
					.setDesc(
						"Add a custom CSS class to the link element (supports JS expressions `...`)",
					)
					.addTextArea((text: TextAreaComponent) => {
						text
							.setValue(rule.cssClass)
							.setPlaceholder("my-custom-link-style")
							.onChange(async (v: string) => {
								rule.cssClass = v;
								validateInput(text, v);
								await this.plugin.saveSettings();
							});
						validateInput(text, rule.cssClass);
					});

				new Setting(ruleDiv)
					.setName("Text Append")
					.setDesc("Text to add (supports JS expressions `...`)")
					.addTextArea((text: TextAreaComponent) => {
						text
							.setValue(rule.text)
							.setPlaceholder("[!]")
							.onChange(async (v: string) => {
								rule.text = v;
								validateInput(text, v);
								await this.plugin.saveSettings();
							});
						validateInput(text, rule.text);
					});

				new Setting(ruleDiv)
					.setName("Icon Append")
					.setDesc(
						(() => {
							const fragment = document.createDocumentFragment();
							fragment.append('Icon ID to add (e.g. "star"). ');
							const a = fragment.createEl("a");
							a.href = "https://fevol.github.io/obsidian-notes/utils/icons/";
							a.text = "Icon Reference";
							a.target = "_blank"; // Open in new tab
							return fragment;
						})(),
					)
					.addTextArea((text: TextAreaComponent) => {
						text
							.setValue(rule.icon)
							.setPlaceholder("star")
							.onChange(async (v: string) => {
								rule.icon = v;
								validateInput(text, v);
								await this.plugin.saveSettings();
							});
						validateInput(text, rule.icon);
					});
			}
		});
	}
}
