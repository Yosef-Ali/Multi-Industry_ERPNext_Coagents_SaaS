'use client';

/**
 * useAGUIState Hook
 * React hook for managing AG-UI shared state with bi-directional sync
 */

import { useCallback, useRef, useState } from 'react';
import type { AGUIStateDelta } from '@/lib/ag-ui/types';

export interface UseAGUIStateOptions<T = any> {
	initialState?: T;
	onStateChange?: (state: T) => void;
	onDelta?: (delta: AGUIStateDelta) => void;
}

export interface UseAGUIStateResult<T = any> {
	state: T;
	setState: (newState: T | ((prevState: T) => T)) => void;
	patchState: (path: string[], value: any) => void;
	deleteState: (path: string[]) => void;
	appendState: (path: string[], value: any) => void;
	resetState: () => void;
	applyDelta: (delta: AGUIStateDelta) => void;
	getDeltas: () => AGUIStateDelta[];
	clearDeltas: () => void;
}

/**
 * useAGUIState - Hook for managing shared mutable state with AG-UI agents
 *
 * Provides bi-directional state synchronization through STATE_DELTA events
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, patchState, getDeltas } = useAGUIState({
 *     initialState: { count: 0, items: [] },
 *     onStateChange: (state) => console.log('State:', state),
 *   });
 *
 *   // Update state and track deltas
 *   const increment = () => {
 *     patchState(['count'], state.count + 1);
 *     // Delta: { path: ['count'], operation: 'set', value: 1 }
 *   };
 *
 *   // Send deltas to agent
 *   const syncToAgent = async () => {
 *     const deltas = getDeltas();
 *     await fetch('/api/ag-ui/state', {
 *       method: 'POST',
 *       body: JSON.stringify({ deltas }),
 *     });
 *     clearDeltas();
 *   };
 *
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>
 *       <button onClick={increment}>Increment</button>
 *       <button onClick={syncToAgent}>Sync</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAGUIState<T = any>(options: UseAGUIStateOptions<T> = {}): UseAGUIStateResult<T> {
	const { initialState, onStateChange, onDelta } = options;

	const [state, setStateInternal] = useState<T>((initialState || {}) as T);
	const [deltas, setDeltas] = useState<AGUIStateDelta[]>([]);

	const initialStateRef = useRef(initialState);

	/**
	 * Set state and track delta
	 */
	const setState = useCallback(
		(newState: T | ((prevState: T) => T)) => {
			setStateInternal((prevState) => {
				const nextState = typeof newState === 'function' ? newState(prevState) : newState;

				// Notify callback
				onStateChange?.(nextState);

				return nextState;
			});
		},
		[onStateChange]
	);

	/**
	 * Patch state at a specific path
	 */
	const patchState = useCallback(
		(path: string[], value: any) => {
			const delta: AGUIStateDelta = {
				path,
				operation: 'set',
				value,
			};

			// Record delta
			setDeltas((prev) => [...prev, delta]);
			onDelta?.(delta);

			// Apply delta to state
			setState((prevState) => {
				const newState = { ...prevState };
				let current: any = newState;

				for (let i = 0; i < path.length - 1; i++) {
					const key = path[i];
					if (!(key in current)) {
						current[key] = {};
					}
					current = current[key];
				}

				current[path[path.length - 1]] = value;
				return newState;
			});
		},
		[setState, onDelta]
	);

	/**
	 * Delete state at a specific path
	 */
	const deleteState = useCallback(
		(path: string[]) => {
			const delta: AGUIStateDelta = {
				path,
				operation: 'delete',
				value: null,
			};

			setDeltas((prev) => [...prev, delta]);
			onDelta?.(delta);

			setState((prevState) => {
				const newState = { ...prevState };
				let current: any = newState;

				for (let i = 0; i < path.length - 1; i++) {
					current = current[path[i]];
				}

				delete current[path[path.length - 1]];
				return newState;
			});
		},
		[setState, onDelta]
	);

	/**
	 * Append value to array at path
	 */
	const appendState = useCallback(
		(path: string[], value: any) => {
			const delta: AGUIStateDelta = {
				path,
				operation: 'append',
				value,
			};

			setDeltas((prev) => [...prev, delta]);
			onDelta?.(delta);

			setState((prevState) => {
				const newState = { ...prevState };
				let current: any = newState;

				for (let i = 0; i < path.length - 1; i++) {
					if (!(path[i] in current)) {
						current[path[i]] = {};
					}
					current = current[path[i]];
				}

				const lastKey = path[path.length - 1];
				if (Array.isArray(current[lastKey])) {
					current[lastKey] = [...current[lastKey], value];
				} else {
					current[lastKey] = [value];
				}

				return newState;
			});
		},
		[setState, onDelta]
	);

	/**
	 * Reset state to initial value
	 */
	const resetState = useCallback(() => {
		setStateInternal((initialStateRef.current || {}) as T);
		setDeltas([]);
	}, []);

	/**
	 * Apply a delta from the agent
	 */
	const applyDelta = useCallback(
		(delta: AGUIStateDelta) => {
			const { path, operation, value } = delta;

			setState((prevState) => {
				const newState = { ...prevState } as any;
				let current = newState;

				// Navigate to parent
				for (let i = 0; i < path.length - 1; i++) {
					const key = path[i];
					if (!(key in current)) {
						current[key] = {};
					}
					current = current[key];
				}

				const lastKey = path[path.length - 1];

				// Apply operation
				switch (operation) {
					case 'set':
						current[lastKey] = value;
						break;
					case 'delete':
						delete current[lastKey];
						break;
					case 'append':
						if (Array.isArray(current[lastKey])) {
							current[lastKey] = [...current[lastKey], value];
						} else {
							current[lastKey] = [value];
						}
						break;
					case 'patch':
						if (typeof current[lastKey] === 'object') {
							current[lastKey] = { ...current[lastKey], ...value };
						} else {
							current[lastKey] = value;
						}
						break;
				}

				return newState;
			});
		},
		[setState]
	);

	/**
	 * Get accumulated deltas
	 */
	const getDeltas = useCallback(() => {
		return [...deltas];
	}, [deltas]);

	/**
	 * Clear accumulated deltas
	 */
	const clearDeltas = useCallback(() => {
		setDeltas([]);
	}, []);

	return {
		state,
		setState,
		patchState,
		deleteState,
		appendState,
		resetState,
		applyDelta,
		getDeltas,
		clearDeltas,
	};
}
