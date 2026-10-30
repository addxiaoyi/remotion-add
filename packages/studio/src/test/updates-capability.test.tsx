import {afterEach, beforeEach, expect, mock, test} from 'bun:test';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import React from 'react';

type Deferred = {
	readonly resolve: (value: unknown) => void;
	readonly reject: (error: Error) => void;
};

let updateCalls = 0;
let bugsFetches = 0;
let pending: Deferred[] = [];

mock.module('../components/RenderQueue/actions', () => ({
	updateAvailable: () => {
		updateCalls++;
		return new Promise((resolve, reject) => {
			pending.push({reject, resolve});
		});
	},
}));

mock.module('../components/call-api', () => ({
	callApi: () => Promise.resolve({}),
}));

mock.module('../api/restart-studio', () => ({
	restartStudio: () => Promise.resolve(),
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
	updateCalls = 0;
	bugsFetches = 0;
	pending = [];
	globalThis.fetch = (() => {
		bugsFetches++;
		return Promise.resolve({json: () => Promise.resolve({bugs: []})});
	}) as unknown as typeof fetch;
});

afterEach(() => {
	cleanup();
	globalThis.fetch = originalFetch;
});

const settle = async () => {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
};

const updateResponse = {
	currentVersion: '4.0.0',
	latestVersion: '4.1.0',
	updateAvailable: true,
	skillsUpdateAvailable: false,
	skillsUpdateDetails: null,
	timedOut: false,
	packageManager: 'unknown' as const,
};

const renderProvider = async (initialEnabled: boolean) => {
	const {UpdateStatusProvider, useUpdateStatus} =
		await import('../components/UpdateStatusContext');

	const Probe: React.FC = () => {
		const status = useUpdateStatus();
		return (
			<div>
				<div data-testid="state">{status.checkState}</div>
				<div data-testid="error">{status.error ?? 'none'}</div>
				<div data-testid="latest">{status.info?.latestVersion ?? 'none'}</div>
				<button data-testid="retry" onClick={status.retry} type="button">
					retry
				</button>
			</div>
		);
	};

	const tree = (enabled: boolean) => (
		<UpdateStatusProvider enabled={enabled} skillsRevision={0}>
			<Probe />
		</UpdateStatusProvider>
	);

	const view = render(tree(initialEnabled));

	return {
		rerenderEnabled: (enabled: boolean) => view.rerender(tree(enabled)),
	};
};

test('a disabled capability never asks the server and reports the disabled state', async () => {
	const {rerenderEnabled} = await renderProvider(false);
	await settle();

	expect(updateCalls).toBe(0);
	expect(bugsFetches).toBe(0);
	expect(document.querySelector('[data-testid="state"]')?.textContent).toBe(
		'disabled',
	);

	// A rerender that keeps the capability disabled must stay silent too.
	rerenderEnabled(false);
	await settle();

	expect(updateCalls).toBe(0);
	expect(bugsFetches).toBe(0);
});

test('a failed check surfaces the error and retry refetches into the ready state', async () => {
	await renderProvider(true);
	await settle();

	expect(updateCalls).toBe(1);
	expect(pending.length).toBe(1);
	expect(document.querySelector('[data-testid="state"]')?.textContent).toBe(
		'loading',
	);

	pending[0]!.reject(new Error('update check exploded'));
	await settle();

	expect(document.querySelector('[data-testid="state"]')?.textContent).toBe(
		'error',
	);
	expect(document.querySelector('[data-testid="error"]')?.textContent).toBe(
		'update check exploded',
	);

	const retry = document.querySelector('[data-testid="retry"]');
	expect(retry).not.toBeNull();
	fireEvent.click(retry as Element);
	await settle();

	expect(updateCalls).toBe(2);
	expect(pending.length).toBe(2);

	pending[1]!.resolve(updateResponse);
	await settle();

	expect(document.querySelector('[data-testid="state"]')?.textContent).toBe(
		'ready',
	);
	expect(document.querySelector('[data-testid="error"]')?.textContent).toBe(
		'none',
	);
	expect(document.querySelector('[data-testid="latest"]')?.textContent).toBe(
		'4.1.0',
	);
});

test('enabling the capability later starts the first request and drops the disabled state', async () => {
	const {rerenderEnabled} = await renderProvider(false);
	await settle();

	expect(updateCalls).toBe(0);
	expect(document.querySelector('[data-testid="state"]')?.textContent).toBe(
		'disabled',
	);

	rerenderEnabled(true);
	await settle();

	expect(updateCalls).toBe(1);
	expect(bugsFetches).toBe(1);
	expect(document.querySelector('[data-testid="state"]')?.textContent).toBe(
		'loading',
	);

	pending[0]!.resolve(updateResponse);
	await settle();

	expect(document.querySelector('[data-testid="state"]')?.textContent).toBe(
		'ready',
	);
});
