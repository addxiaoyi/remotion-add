import {afterEach, expect, mock, test} from 'bun:test';
import type {GetRemotionSkillsInfoResponse} from '@remotion/studio-shared';
import {act, cleanup, render} from '@testing-library/react';
import React from 'react';

// SettingsContext serialises skill operations behind a re-entrancy lock, stamps
// each attempt with a generation number, guards every state write with a mounted
// ref, and re-fetches the skill info when an action fails. All of that lives in
// refs and React state, so it is only observable by mounting the real provider.
// callApi is steered with deferred promises so the in-flight window is
// deterministic instead of timing-dependent.

type Deferred<T> = {
	readonly promise: Promise<T>;
	readonly resolve: (value: T) => void;
	readonly reject: (error: Error) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
	let resolve: (value: T) => void = () => undefined;
	let reject: (error: Error) => void = () => undefined;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return {promise, resolve, reject};
};

const skillsInfo = (marker: string): GetRemotionSkillsInfoResponse => ({
	studioServerStartedByAgent: false,
	studioRestartSkill: null,
	remotionUpgradeSkillAvailable: false,
	remotionInteractivitySkillAvailable: false,
	installations: [],
	skills: [{name: marker, installedInProject: false, installedGlobally: false}],
});

const callApiCalls: string[] = [];
const notifications: string[] = [];
let installDeferred: Deferred<GetRemotionSkillsInfoResponse> | null = null;
let infoDeferred: Deferred<GetRemotionSkillsInfoResponse> | null = null;

mock.module('../components/call-api', () => ({
	callApi: (endpoint: string) => {
		callApiCalls.push(endpoint);
		if (endpoint === '/api/remotion-skills-info') {
			return infoDeferred === null
				? Promise.resolve(skillsInfo('initial'))
				: infoDeferred.promise;
		}

		return installDeferred === null
			? Promise.resolve(skillsInfo('installed'))
			: installDeferred.promise;
	},
}));

mock.module('../components/Notifications/NotificationCenter', () => ({
	showNotification: (message: string) => {
		notifications.push(message);
	},
}));

mock.module('../components/UpdateStatusContext', () => ({
	UpdateStatusProvider: ({children}: {children: React.ReactNode}) => children,
}));

mock.module('../helpers/browser-studio-operations', () => ({
	getBrowserStudioOperations: () => null,
}));

mock.module('../helpers/can-show-updates', () => ({
	canShowUpdates: () => false,
}));

// A disconnected connection keeps both bootstrap effects inert, so the only
// callApi traffic in these tests is the skill operation itself.
mock.module('../helpers/client-id', () => ({
	StudioServerConnectionCtx: React.createContext({
		previewServerState: {type: 'disconnected'},
		subscribeToEvent: () => () => undefined,
	}),
}));

mock.module('../state/recently-used-apps', () => ({
	appSelectedEvent: 'app-selected',
	codingAgentHistory: {getRecentlyUsed: () => []},
	editorHistory: {getRecentlyUsed: () => []},
}));

type SettingsActions = {
	readonly installSkill: (skill: string) => Promise<void>;
	readonly removeSkill: (skill: string) => Promise<void>;
	readonly upgradeSkill: (skill: string) => Promise<void>;
};

type Snapshot = {
	readonly skillAction: {readonly skill: string; readonly type: string} | null;
	readonly skillActionError: string | null;
	readonly marker: string | null;
};

let snapshots: Snapshot[] = [];
let actions: SettingsActions | null = null;

const latest = (): Snapshot => {
	expect(snapshots.length).toBeGreaterThan(0);
	return snapshots[snapshots.length - 1];
};

const renderProvider = async () => {
	const {SettingsProvider, useSettings} =
		await import('../components/SettingsContext');

	const Consumer: React.FC = () => {
		const settings = useSettings();
		actions = {
			installSkill: settings.installSkill,
			removeSkill: settings.removeSkill,
			upgradeSkill: settings.upgradeSkill,
		};
		snapshots.push({
			skillAction: settings.skillAction,
			skillActionError: settings.skillActionError,
			marker: settings.remotionSkillsInfo?.skills[0]?.name ?? null,
		});
		return null;
	};

	return render(
		React.createElement(SettingsProvider, null, React.createElement(Consumer)),
	);
};

const startInstall = async (skill: string): Promise<void> => {
	await act(async () => {
		void actions!.installSkill(skill);
		await Promise.resolve();
	});
};

const installCallCount = (): number =>
	callApiCalls.filter((endpoint) => endpoint === '/api/install-remotion-skill')
		.length;

afterEach(() => {
	cleanup();
	snapshots = [];
	actions = null;
	callApiCalls.length = 0;
	notifications.length = 0;
	installDeferred = null;
	infoDeferred = null;
});

test('drops a second skill action while the first one is still in flight', async () => {
	installDeferred = createDeferred<GetRemotionSkillsInfoResponse>();
	await renderProvider();

	await startInstall('remotion-studio');
	await startInstall('remotion-best-practices');

	expect(installCallCount()).toBe(1);
	expect(latest().skillAction).toEqual({
		skill: 'remotion-studio',
		type: 'installing',
	});

	await act(async () => {
		installDeferred!.resolve(skillsInfo('after-install'));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
});

test('a successful skill action clears the busy state and adopts the server info', async () => {
	installDeferred = createDeferred<GetRemotionSkillsInfoResponse>();
	await renderProvider();

	await startInstall('remotion-studio');
	expect(latest().skillAction).toEqual({
		skill: 'remotion-studio',
		type: 'installing',
	});

	await act(async () => {
		installDeferred!.resolve(skillsInfo('after-install'));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});

	expect(latest().skillAction).toBeNull();
	expect(latest().skillActionError).toBeNull();
	expect(latest().marker).toBe('after-install');
	expect(notifications).toEqual(['Installed remotion-studio.']);
});

test('a failed skill action refetches the skill info and stores the error', async () => {
	installDeferred = createDeferred<GetRemotionSkillsInfoResponse>();
	infoDeferred = createDeferred<GetRemotionSkillsInfoResponse>();
	await renderProvider();

	await startInstall('remotion-studio');

	await act(async () => {
		installDeferred!.reject(new Error('boom'));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});

	// The failure path re-reads the list instead of trusting the cached copy, and
	// the panel keeps reporting the operation as in flight until that read
	// settles, so no error is surfaced while the busy state is still shown.
	expect(callApiCalls).toContain('/api/remotion-skills-info');
	expect(latest().skillAction).toEqual({
		skill: 'remotion-studio',
		type: 'installing',
	});
	expect(latest().skillActionError).toBeNull();
	expect(notifications).toEqual([]);

	await act(async () => {
		infoDeferred!.resolve(skillsInfo('after-error'));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});

	expect(latest().skillActionError).toBe('boom');
	expect(latest().marker).toBe('after-error');
});

test('a result that resolves after unmount does not notify', async () => {
	installDeferred = createDeferred<GetRemotionSkillsInfoResponse>();
	const view = await renderProvider();

	await startInstall('remotion-studio');
	view.unmount();

	await act(async () => {
		installDeferred!.resolve(skillsInfo('late'));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});

	expect(notifications).toEqual([]);
});

test('the re-entrancy lock is released so a later action still runs', async () => {
	installDeferred = createDeferred<GetRemotionSkillsInfoResponse>();
	await renderProvider();

	await startInstall('remotion-studio');
	await act(async () => {
		installDeferred!.resolve(skillsInfo('first'));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});

	installDeferred = createDeferred<GetRemotionSkillsInfoResponse>();
	await startInstall('remotion-best-practices');

	expect(installCallCount()).toBe(2);

	await act(async () => {
		installDeferred!.resolve(skillsInfo('second'));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});

	expect(latest().skillAction).toBeNull();
	expect(latest().marker).toBe('second');
});
