/**
 * Note: this does not use randomness so that it is stable for VR tests
 */

export type ColumnType = {
	title: string;
	columnId: string;
	items: any[];
};
export type ColumnMap = { [columnId: string]: ColumnType };

export function getBasicData() {
	const columnMap: ColumnMap = {
		confluence: {
			title: 'Confluence',
			columnId: 'confluence',
			items: [],
		},
		jira: {
			title: 'Jira',
			columnId: 'jira',
			items: [],
		},
		trello: {
			title: 'Trello',
			columnId: 'trello',
			items: [],
		},
	};

	const orderedColumnIds = ['confluence', 'jira', 'trello'];

	return {
		columnMap,
		orderedColumnIds,
	};
}
