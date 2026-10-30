import type {UpdateAvailableResponse} from '@remotion/studio-shared';
import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {VERSION} from 'remotion';
import {restartStudio} from '../api/restart-studio';
import {callApi} from './call-api';
import {updateAvailable} from './RenderQueue/actions';

// Keep in sync with packages/bugs/api/[v].ts
export type Bug = {
	title: string;
	description: string;
	link: string;
	versions: string[];
};

type UpgradeState = 'idle' | 'upgrading' | 'upgraded' | 'restarting';
export type UpdateCheckState = 'disabled' | 'loading' | 'error' | 'ready';

export const getUpdateCheckState = ({
	enabled,
	loading,
	error,
}: {
	readonly enabled: boolean;
	readonly loading: boolean;
	readonly error: string | null;
}): UpdateCheckState => {
	if (!enabled) {
		return 'disabled';
	}
	if (loading) {
		return 'loading';
	}
	if (error !== null) {
		return 'error';
	}
	return 'ready';
};

type UpdateStatusContextValue = {
	readonly upgradeState: UpgradeState;
	readonly upgradeError: string | null;
	readonly checkState: UpdateCheckState;
	readonly loading: boolean;
	readonly retry: () => void;
	readonly upgrade: (version: string) => Promise<void>;
	readonly restart: () => Promise<void>;
	readonly error: string | null;
	readonly info: UpdateAvailableResponse | null;
	readonly knownBugs: Bug[] | null;
};

const UpdateStatusContext = createContext<UpdateStatusContextValue | null>(
	null,
);

export const UpdateStatusProvider: React.FC<{
	readonly children: React.ReactNode;
	readonly skillsRevision: number;
	readonly enabled: boolean;
}> = ({children, skillsRevision, enabled}) => {
	const [upgradeState, setUpgradeState] = useState<UpgradeState>('idle');
	const [upgradeError, setUpgradeError] = useState<string | null>(null);
	const busy = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		return () => {
			mounted.current = false;
		};
	}, []);
	const upgrade = useCallback(async (version: string) => {
		if (busy.current) {
			return;
		}

		busy.current = true;
		setUpgradeState('upgrading');
		setUpgradeError(null);
		try {
			await callApi('/api/upgrade-remotion', {version});
			if (mounted.current) {
				setUpgradeState('upgraded');
			}
		} catch (err) {
			if (mounted.current) {
				setUpgradeError((err as Error).message);
				setUpgradeState('idle');
			}
		} finally {
			busy.current = false;
		}
	}, []);
	const restart = useCallback(async () => {
		if (busy.current) {
			return;
		}

		busy.current = true;
		setUpgradeState('restarting');
		setUpgradeError(null);
		try {
			await restartStudio();
		} catch (err) {
			if (mounted.current) {
				setUpgradeError((err as Error).message);
				setUpgradeState('upgraded');
			}
		} finally {
			busy.current = false;
		}
	}, []);
	const [info, setInfo] = useState<UpdateAvailableResponse | null>(null);
	const [knownBugs, setKnownBugs] = useState<Bug[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [retryGeneration, setRetryGeneration] = useState(0);
	useEffect(() => {
		if (!enabled) {
			setInfo(null);
			setKnownBugs(null);
			setError(null);
			setLoading(false);
			setUpgradeState('idle');
			setUpgradeError(null);
			return;
		}

		const updateController = new AbortController();
		let active = true;
		setInfo(null);
		setKnownBugs(null);
		setError(null);
		setLoading(true);
		const bugsController = new AbortController();

		updateAvailable(updateController.signal)
			.then((response) => {
				if (!active || updateController.signal.aborted) {
					return;
				}
				setInfo(response);
				setError(null);
				setLoading(false);
			})
			.catch((err: Error) => {
				if (updateController.signal.aborted) {
					return;
				}

				if (!active) {
					return;
				}
				setError(err.message);
				setLoading(false);
			});

		fetch('https://bugs.remotion.dev/api/' + VERSION, {
			signal: bugsController.signal,
		})
			.then(async (response) => {
				const body = await response.json();
				if (active) {
					setKnownBugs(body.bugs);
				}
			})
			.catch((err: Error) => {
				if (bugsController.signal.aborted) {
					return;
				}

				// eslint-disable-next-line no-console
				console.log('Could not check for bugs in this version', err);
			});

		return () => {
			active = false;
			updateController.abort();
			bugsController.abort();
		};
	}, [enabled, retryGeneration, skillsRevision]);

	const retry = useCallback(() => {
		setRetryGeneration((generation) => generation + 1);
	}, []);
	const checkState = getUpdateCheckState({enabled, loading, error});

	const value = useMemo<UpdateStatusContextValue>(() => {
		return {
			checkState,
			loading,
			retry,
			error,
			info,
			knownBugs,
			upgradeState,
			upgradeError,
			upgrade,
			restart,
		};
	}, [
		checkState,
		error,
		info,
		knownBugs,
		loading,
		retry,
		upgradeState,
		upgradeError,
		upgrade,
		restart,
	]);

	return (
		<UpdateStatusContext.Provider value={value}>
			{children}
		</UpdateStatusContext.Provider>
	);
};

export const useUpdateStatus = (): UpdateStatusContextValue => {
	const context = useContext(UpdateStatusContext);
	if (context === null) {
		throw new Error('useUpdateStatus must be used inside UpdateStatusProvider');
	}

	return context;
};
