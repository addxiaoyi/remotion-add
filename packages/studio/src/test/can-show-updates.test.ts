import {expect, test} from 'bun:test';
import {getUpdateCheckState} from '../components/UpdateStatusContext';
import {canShowUpdates} from '../helpers/can-show-updates';

test('only shows updates in a connected, writable desktop Studio', () => {
	expect(
		canShowUpdates({
			connectionStatus: 'connected',
			isBrowserStudio: false,
			readOnlyStudio: false,
		}),
	).toBe(true);

	for (const environment of [
		{
			connectionStatus: 'connected' as const,
			isBrowserStudio: false,
			readOnlyStudio: true,
		},
		{
			connectionStatus: 'connected' as const,
			isBrowserStudio: true,
			readOnlyStudio: false,
		},
		{
			connectionStatus: 'disconnected' as const,
			isBrowserStudio: false,
			readOnlyStudio: false,
		},
		{
			connectionStatus: 'init' as const,
			isBrowserStudio: false,
			readOnlyStudio: false,
		},
	]) {
		expect(canShowUpdates(environment)).toBe(false);
	}
});

test('classifies update checks without treating disabled as loading', () => {
	expect(
		getUpdateCheckState({enabled: false, loading: false, error: null}),
	).toBe('disabled');
	expect(getUpdateCheckState({enabled: true, loading: true, error: null})).toBe(
		'loading',
	);
	expect(
		getUpdateCheckState({enabled: true, loading: false, error: 'network'}),
	).toBe('error');
	expect(
		getUpdateCheckState({enabled: true, loading: false, error: null}),
	).toBe('ready');
});
