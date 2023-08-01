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
interface MatchResult {
	match: string;
	before: string;
	after: string;
}

class FindNoteLinksModal extends Modal {
	plugin: ANLPlugin;
	results: MatchResult[];
	filteredResults: MatchResult[]; // Store filtered results here
	selectAllCheckbox: HTMLInputElement;
	searchBar: HTMLInputElement;

	constructor(plugin: ANLPlugin, results: MatchResult[]) {
		super(plugin.app);
		this.plugin = plugin;
		this.results = results;
		this.filteredResults = results; // Initialize filteredResults with all results
	}
	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: "Found Note Links" });

		// Create controls container with flex layout
		let controlsContainer = contentEl.createDiv({
			cls: "controls-container",
		});

		// Create a "select all" checkbox
		this.selectAllCheckbox = controlsContainer.createEl("input", {
			type: "checkbox",
			cls: "select-all-checkbox",
			id: "select-all",
		}) as HTMLInputElement;

		// Add event listener for "mark all" checkbox
		this.selectAllCheckbox.onchange = () => {
			this.toggleSelectAll();
		};

		// Create a search bar
		this.searchBar = controlsContainer.createEl("input", {
			type: "text",
			cls: "search-bar",
			placeholder: "Search...",
		}) as HTMLInputElement;

		// Listen for input to filter results
		this.searchBar.oninput = (event: Event) => {
			let target = event.target as HTMLInputElement;
			this.filterResults(target.value);
		};

		// Render each match
		this.filteredResults.forEach((match, index) => {
			this.renderMatch(contentEl, match, index);
		});
	}

	toggleSelectAll() {
		let { contentEl } = this;
		let checkboxes = contentEl.querySelectorAll<HTMLInputElement>(
			".match-element .match-checkbox"
		);
		let checked = this.selectAllCheckbox.checked;

		checkboxes.forEach((checkbox) => {
			checkbox.checked = checked;
		});
	}

	filterResults(query: string) {
		// Convert the query to lower case for case insensitive search
		let lowerCaseQuery = query.toLowerCase();

		// Filter the results based on the query
		this.filteredResults = this.results.filter((match) => {
			return match.match.toLowerCase().includes(lowerCaseQuery);
		});

		// Re-render only the matches with the filtered results
		let { contentEl } = this;
		contentEl.querySelectorAll(".match-element").forEach((element) => {
			element.remove();
		});

		this.filteredResults.forEach((match, index) => {
			this.renderMatch(contentEl, match, index);
		});
	}

	private renderControls(containerEl: HTMLElement) {
		// Create controls container with flex layout
		let controlsContainer = containerEl.createDiv({
			cls: "controls-container",
		});

		// Create a "select all" checkbox
		let selectAllCheckbox = controlsContainer.createEl("input", {
			type: "checkbox",
			cls: "select-all-checkbox",
			id: "select-all",
		}) as HTMLInputElement;

		// Create a search bar
		let searchBar = controlsContainer.createEl("input", {
			type: "text",
			cls: "search-bar",
			placeholder: "Search...",
		}) as HTMLInputElement;

		// Listen for input to filter results
		searchBar.oninput = (event: Event) => {
			let target = event.target as HTMLInputElement;
			this.filterResults(target.value);
		};
	}

	renderMatch(containerEl: HTMLElement, match: MatchResult, index: number) {
		// Create a div for the entire match element
		let matchEl = containerEl.createDiv({
			cls: "match-element",
		});

		// Create a checkbox
		let checkbox = matchEl.createEl("input", {
			type: "checkbox",
			cls: "match-checkbox",
			id: `match-${index}`,
		}) as HTMLInputElement;

		// Create the match text
		let label = matchEl.createEl("label", {
			attr: { for: `match-${index}` },
		});

		label.innerHTML = `${match.before} <span class="highlight">${match.match}</span> ${match.after}`;
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
