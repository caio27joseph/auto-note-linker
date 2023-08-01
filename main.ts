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

		for (let i = 0; i < doc.lineCount(); i++) {
			const line = doc.getLine(i);

			// Split the line into words
			const words = line.split(/\s+/);

			// Go through each note name
			noteNames.forEach((noteName) => {
				// Find the index of the first word of the note name in the words array
				let index = words.indexOf(noteName.split(" ")[0]);

				// While there is still a match in the line
				while (index !== -1) {
					// Determine the indexes of the three words before and after the match
					const beforeStartIndex = Math.max(0, index - 1);
					const afterEndIndex = Math.min(
						words.length,
						index + noteName.split(" ").length + 4
					); // 4 is for three words after the match.

					// Construct the before and after context
					const beforeContext = words.slice(beforeStartIndex, index).join(" ");
					const afterContext = words
						.slice(index + noteName.split(" ").length, afterEndIndex)
						.join(" ");

					// Get the substring from the line that corresponds to the current match and its surrounding words
					const matchSubstring = `${beforeContext} ${noteName} ${afterContext}`;

					// Check if the note name is in the line and is not already enclosed within double square brackets in the match substring
					if (line.includes(noteName)) {
						// Get the position of note name in line
						const notePosition = line.indexOf(noteName);

						// Get the characters before and after the note name
						const charBeforeNote = line[notePosition - 1];
						const charAfterNote = line[notePosition + noteName.length];

						// If the note name is not enclosed within double square brackets
						if (!(charBeforeNote === "[" && charAfterNote === "]")) {
							matches.push({
								match: noteName,
								before: beforeContext,
								after: afterContext,
								line: i + 1,
								index: index,
							});
						}
					}

					// Find the next match in the words array
					index = words.indexOf(noteName.split(" ")[0], index + 1);
				}
			});
		}

		if (matches.length > 0) {
			// Open a modal to display the matches
			new FindNoteLinksModal(this, matches).open();
		}
	}
}
