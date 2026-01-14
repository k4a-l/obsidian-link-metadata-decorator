import { editorLivePreviewField, Plugin } from "obsidian";
import { buildLinkMetadataDecorations } from "./live-preview";
import {
	DEFAULT_SETTINGS,
	type LinkMetadataDecoratorSettings,
	LinkMetadataDecoratorSettingTab,
} from "./settings";

export default class LinkMetadataDecorator extends Plugin {
	settings!: LinkMetadataDecoratorSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LinkMetadataDecoratorSettingTab(this.app, this));

		// Live Preview (Editor Mode)

		this.registerEditorExtension([
			editorLivePreviewField,
			buildLinkMetadataDecorations(this.app, this),
		]);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
