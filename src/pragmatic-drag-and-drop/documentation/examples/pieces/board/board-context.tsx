import { createContext, useContext } from 'react';

import invariant from 'tiny-invariant';

import type { CleanupFn } from '@atlaskit/pragmatic-drag-and-drop/types';


export type BoardContextValue = {
	getColumns: () => any[];

	reorderColumn: (args: { startIndex: number; finishIndex: number }) => void;

	registerColumn: (args: {
		columnId: string;
		entry: {
			element: HTMLElement;
		};
	}) => CleanupFn;

	instanceId: symbol;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
	const value = useContext(BoardContext);
	invariant(value, 'cannot find BoardContext provider');
	return value;
}
