import { FindNoteLinksModal, MatchResult } from "FindNoteLinksModal";
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class ANLPlugin extends Plugin {
	settings: MyPluginSettings;
	styleEl: HTMLStyleElement;

	async onload() {
		await this.loadSettings();

		// Add a new command: "Find Note Links"
		this.addCommand({
			id: "find-note-links",
			name: "Find Note Links",
			checkCallback: (checking: boolean) => {
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.findNoteMatches(markdownView);
					}
					return true;
				}
			},
		});

		this.injectStyles();
	}
	onunload() {
		// ... your existing unload logic ...

		this.removeStyles();
	}
	injectStyles() {
		this.styleEl = document.createElement("style");
		this.styleEl.innerHTML = `
			.modal {
				background-color: var(--background-primary);
			}
			.highlight {
				font-weight: bold;
				color: var(--text-accent);
			}
			.match-checkbox {
				transform: scale(1.5);
			}
			.match-element {
				margin-bottom: 10px;
				padding: 20px;
				background-color: var(--background-secondary);
				border-radius: 5px;
				padding-right: 20px; /* Add right padding to create space */
			}
			.controls-container {
				display: flex;
				align-items: center;
				gap: 10px; /* or adjust the space as needed */
			}
			
			.select-all-checkbox {
					margin-right: auto;
			}
			
			.search-bar {
					flex-grow: 1;
			}
		`;
		document.head.appendChild(this.styleEl);
	}

	removeStyles() {
		this.styleEl.remove();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	findNoteMatches(view: MarkdownView) {
		// Get all note names in the vault
		const noteNames = this.app.vault
			.getMarkdownFiles()
			.map((file) => file.basename);

		// Get the current document
		const doc = view.editor.getDoc();

		let matches: MatchResult[] = [];

		// Go through the document line by line
		for (let i = 0; i < doc.lineCount(); i++) {
			const line = doc.getLine(i);

			// Split the line into words
			const words = line.split(/\s+/);

			// Go through the words in the line
			for (let j = 0; j < words.length; j++) {
				// If the word matches a note name, capture the context and store the match
				if (noteNames.includes(words[j])) {
					matches.push({
						match: words[j],
						before: words.slice(Math.max(0, j - 3), j).join(" "),
						after: words.slice(j + 1, j + 4).join(" "),
					});
				}
			}
		}

		if (matches.length > 0) {
			// Open a modal to display the matches
			new FindNoteLinksModal(this, matches).open();
		}
	}
}
