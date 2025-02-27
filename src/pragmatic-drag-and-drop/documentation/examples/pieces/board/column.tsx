import React, { memo, useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';
import invariant from 'tiny-invariant';

import Heading from '@atlaskit/heading';
// This is the smaller MoreIcon soon to be more easily accessible with the
// ongoing icon project
import { easeInOut } from '@atlaskit/motion/curves';
import { mediumDurationMs } from '@atlaskit/motion/durations';
import {
	attachClosestEdge,
	type Edge,
	extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { centerUnderPointer } from '@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { Box, Flex, Inline, Stack, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useBoardContext } from './board-context';

const columnStyles = xcss({
	width: '250px',
	backgroundColor: 'elevation.surface.sunken',
	borderRadius: 'border.radius.300',
	transition: `background ${mediumDurationMs}ms ${easeInOut}`,
	position: 'relative',
	/**
	 * TODO: figure out hover color.
	 * There is no `elevation.surface.sunken.hovered` token,
	 * so leaving this for now.
	 */
});

const stackStyles = xcss({
	// allow the container to be shrunk by a parent height
	// https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/#the-minimum-size-gotcha-11
	minHeight: '0',

	// ensure our card list grows to be all the available space
	// so that users can easily drop on en empty list
	flexGrow: 1,
});

const columnHeaderStyles = xcss({
	paddingInlineStart: 'space.200',
	paddingInlineEnd: 'space.200',
	paddingBlockStart: 'space.100',
	color: 'color.text.subtlest',
	userSelect: 'none',
});

/**
 * Note: not making `'is-dragging'` a `State` as it is
 * a _parallel_ state to `'is-column-over'`.
 *
 * Our board allows you to be over the column that is currently dragging
 */
type State =
	| { type: 'idle' }
	| { type: 'is-column-over'; closestEdge: Edge | null }
	| { type: 'generate-safari-column-preview'; container: HTMLElement }
	| { type: 'generate-column-preview' };

// preventing re-renders with stable state objects
const idle: State = { type: 'idle' };

const stateStyles: {
	[key in State['type']]: ReturnType<typeof xcss> | undefined;
} = {
	idle: xcss({
		cursor: 'grab',
	}),
	'is-column-over': undefined,
	/**
	 * **Browser bug workaround**
	 *
	 * _Problem_
	 * When generating a drag preview for an element
	 * that has an inner scroll container, the preview can include content
	 * vertically before or after the element
	 *
	 * _Fix_
	 * We make the column a new stacking context when the preview is being generated.
	 * We are not making a new stacking context at all times, as this _can_ mess up
	 * other layering components inside of your card
	 *
	 * _Fix: Safari_
	 * We have not found a great workaround yet. So for now we are just rendering
	 * a custom drag preview
	 */
	'generate-column-preview': xcss({
		isolation: 'isolate',
	}),
	'generate-safari-column-preview': undefined,
};

const isDraggingStyles = xcss({
	opacity: 0.4,
});

export const Column = memo(function Column({ column }: { column: ColumnType }) {
	const columnId = column.columnId;
	const columnRef = useRef<HTMLDivElement | null>(null);
	const columnInnerRef = useRef<HTMLDivElement | null>(null);
	const headerRef = useRef<HTMLDivElement | null>(null);
	const [state, setState] = useState<State>(idle);
	const [isDragging, setIsDragging] = useState<boolean>(false);

	const { instanceId, registerColumn } = useBoardContext();

	useEffect(() => {
		invariant(columnRef.current);
		invariant(columnInnerRef.current);
		invariant(headerRef.current);
		return combine(
			registerColumn({
				columnId,
				entry: {
					element: columnRef.current,
				},
			}),
			draggable({
				element: columnRef.current,
				dragHandle: headerRef.current,
				getInitialData: () => ({ columnId, type: 'column', instanceId }),
				onGenerateDragPreview: ({ nativeSetDragImage }) => {
					const isSafari: boolean =
						navigator.userAgent.includes('AppleWebKit') && !navigator.userAgent.includes('Chrome');

					if (!isSafari) {
						setState({ type: 'generate-column-preview' });
						return;
					}
					setCustomNativeDragPreview({
						getOffset: centerUnderPointer,
						render: ({ container }) => {
							setState({
								type: 'generate-safari-column-preview',
								container,
							});
							return () => setState(idle);
						},
						nativeSetDragImage,
					});
				},
				onDragStart: () => {
					setIsDragging(true);
				},
				onDrop() {
					setState(idle);
					setIsDragging(false);
				},
			}),
			dropTargetForElements({
				element: columnRef.current,
				canDrop: ({ source }) => {
					return source.data.instanceId === instanceId && source.data.type === 'column';
				},
				getIsSticky: () => true,
				getData: ({ input, element }) => {
					const data = {
						columnId,
					};
					return attachClosestEdge(data, {
						input,
						element,
						allowedEdges: ['left', 'right'],
					});
				},
				onDragEnter: (args) => {
					setState({
						type: 'is-column-over',
						closestEdge: extractClosestEdge(args.self.data),
					});
				},
				onDrag: (args) => {
					// skip react re-render if edge is not changing
					setState((current) => {
						const closestEdge: Edge | null = extractClosestEdge(args.self.data);
						if (current.type === 'is-column-over' && current.closestEdge === closestEdge) {
							return current;
						}
						return {
							type: 'is-column-over',
							closestEdge,
						};
					});
				},
				onDragLeave: () => {
					setState(idle);
				},
				onDrop: () => {
					setState(idle);
				},
			})
		);
	}, [columnId, registerColumn, instanceId]);

	return (
		<>
			<Flex
				testId={`column-${columnId}`}
				ref={columnRef}
				direction="column"
				xcss={[columnStyles, stateStyles[state.type]]}
			>
				{/* This element takes up the same visual space as the column.
					We are using a separate element so we can have two drop targets
					that take up the same visual space (one for cards, one for columns)
				*/}
				<Stack xcss={stackStyles} ref={columnInnerRef}>
					<Stack xcss={[stackStyles, isDragging ? isDraggingStyles : undefined]}>
						<Inline
							xcss={columnHeaderStyles}
							ref={headerRef}
							testId={`column-header-${columnId}`}
							spread="space-between"
							alignBlock="center"
						>
							<Heading size="xxsmall" as="span" testId={`column-header-title-${columnId}`}>
								{column.title}
							</Heading>
						</Inline>
					</Stack>
				</Stack>
				{state.type === 'is-column-over' && state.closestEdge && (
					<DropIndicator edge={state.closestEdge} gap={token('space.200', '0')} />
				)}
			</Flex>
			{state.type === 'generate-safari-column-preview'
				? createPortal(<SafariColumnPreview column={column} />, state.container)
				: null}
			</>
	);
});

const safariPreviewStyles = xcss({
	width: '250px',
	backgroundColor: 'elevation.surface.sunken',
	borderRadius: 'border.radius',
	padding: 'space.200',
});

function SafariColumnPreview({ column }: { column: ColumnType }) {
	return (
		<Box xcss={[columnHeaderStyles, safariPreviewStyles]}>
			<Heading size="xxsmall" as="span">
				{column.title}
			</Heading>
		</Box>
	);
}
