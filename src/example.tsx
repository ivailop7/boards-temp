import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import invariant from 'tiny-invariant';

import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import * as liveRegion from '@atlaskit/pragmatic-drag-and-drop-live-region';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';

import { type ColumnMap, type ColumnType, getBasicData, type Person } from './pragmatic-drag-and-drop/documentation/examples/data/people';
import Board from './pragmatic-drag-and-drop/documentation/examples/pieces/board/board';
import { BoardContext, type BoardContextValue } from './pragmatic-drag-and-drop/documentation/examples/pieces/board/board-context';
import { Column } from './pragmatic-drag-and-drop/documentation/examples/pieces/board/column';
import { createRegistry } from './pragmatic-drag-and-drop/documentation/examples/pieces/board/registry';

type Outcome =
	{
		type: 'column-reorder';
		columnId: string;
		startIndex: number;
		finishIndex: number;
	};

type Trigger = 'pointer' | 'keyboard';

type Operation = {
	trigger: Trigger;
	outcome: Outcome;
};

type BoardState = {
	columnMap: ColumnMap;
	orderedColumnIds: string[];
	lastOperation: Operation | null;
};

export default function BoardExample() {
	const [data, setData] = useState<BoardState>(() => {
		const base = getBasicData();
		return {
			...base,
			lastOperation: null,
		};
	});

	const stableData = useRef(data);
	useEffect(() => {
		stableData.current = data;
	}, [data]);

	const [registry] = useState(createRegistry);

	const { lastOperation } = data;

	useEffect(() => {
		if (lastOperation === null) {
			return;
		}
		const { outcome, trigger } = lastOperation;

		if (outcome.type === 'column-reorder') {
			const { startIndex, finishIndex } = outcome;

			const { columnMap, orderedColumnIds } = stableData.current;
			const sourceColumn = columnMap[orderedColumnIds[finishIndex]];

			const entry = registry.getColumn(sourceColumn.columnId);
			triggerPostMoveFlash(entry.element);

			liveRegion.announce(
				`You've moved ${sourceColumn.title} from position ${
					startIndex + 1
				} to position ${finishIndex + 1} of ${orderedColumnIds.length}.`,
			);

			return;
		}
	}, [lastOperation, registry]);

	useEffect(() => {
		return liveRegion.cleanup();
	}, []);

	const getColumns = useCallback(() => {
		const { columnMap, orderedColumnIds } = stableData.current;
		return orderedColumnIds.map((columnId) => columnMap[columnId]);
	}, []);

	const reorderColumn = useCallback(
		({
			startIndex,
			finishIndex,
			trigger = 'keyboard',
		}: {
			startIndex: number;
			finishIndex: number;
			trigger?: Trigger;
		}) => {
			setData((data) => {
				const outcome: Outcome = {
					type: 'column-reorder',
					columnId: data.orderedColumnIds[startIndex],
					startIndex,
					finishIndex,
				};

				return {
					...data,
					orderedColumnIds: reorder({
						list: data.orderedColumnIds,
						startIndex,
						finishIndex,
					}),
					lastOperation: {
						outcome,
						trigger: trigger,
					},
				};
			});
		},
		[],
	);

	const [instanceId] = useState(() => Symbol('instance-id'));

	useEffect(() => {
		return combine(
			monitorForElements({
				canMonitor({ source }) {
					return source.data.instanceId === instanceId;
				},
				onDrop(args) {
					const { location, source } = args;
					// didn't drop on anything
					if (!location.current.dropTargets.length) {
						return;
					}
					// need to handle drop

					// 1. remove element from original position
					// 2. move to new position

					if (source.data.type === 'column') {
						const startIndex: number = data.orderedColumnIds.findIndex(
							(columnId) => columnId === source.data.columnId,
						);

						const target = location.current.dropTargets[0];
						const indexOfTarget: number = data.orderedColumnIds.findIndex(
							(id) => id === target.data.columnId,
						);
						const closestEdgeOfTarget: Edge | null = extractClosestEdge(target.data);

						const finishIndex = getReorderDestinationIndex({
							startIndex,
							indexOfTarget,
							closestEdgeOfTarget,
							axis: 'horizontal',
						});

						reorderColumn({ startIndex, finishIndex, trigger: 'pointer' });
					}
				},
			}),
		);
	}, [data, instanceId, reorderColumn]);

	const contextValue: BoardContextValue = useMemo(() => {
		return {
			getColumns,
			reorderColumn,
			registerCard: registry.registerCard,
			registerColumn: registry.registerColumn,
			instanceId,
		};
	}, [getColumns, reorderColumn, registry, instanceId]);

	return (
		<BoardContext.Provider value={contextValue}>
			<Board>
				{data.orderedColumnIds.map((columnId) => {
					return <Column column={data.columnMap[columnId]} key={columnId} />;
				})}
			</Board>
		</BoardContext.Provider>
	);
}
