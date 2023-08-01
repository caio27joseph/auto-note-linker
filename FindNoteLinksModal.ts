import ANLPlugin from "main";
import { Modal } from "obsidian";

export interface MatchResult {
	match: string;
	before: string;
	after: string;
}

export class FindNoteLinksModal extends Modal {
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
