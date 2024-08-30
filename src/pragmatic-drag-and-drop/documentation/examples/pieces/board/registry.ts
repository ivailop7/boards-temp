import invariant from 'tiny-invariant';

import type { CleanupFn } from '@atlaskit/pragmatic-drag-and-drop/types';

export type CardEntry = {
	element: HTMLElement;
	actionMenuTrigger: HTMLElement;
};

export type ColumnEntry = {
	element: HTMLElement;
};

/**
 * Registering cards and their action menu trigger element,
 * so that we can restore focus to the trigger when a card moves between columns.
 */
export function createRegistry() {
	const columns = new Map<string, ColumnEntry>();

	function registerColumn({
		columnId,
		entry,
	}: {
		columnId: string;
		entry: ColumnEntry;
	}): CleanupFn {
		columns.set(columnId, entry);
		return function cleanup() {
			console.log("cleanup")
		};
	}

	function getColumn(columnId: string): ColumnEntry {
		const entry = columns.get(columnId);
		invariant(entry);
		return entry;
	}

	return { registerColumn, getColumn };
}
