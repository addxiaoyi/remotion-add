import {expect, test} from 'bun:test';
import {shouldApplyExternalStudioSettings} from '../helpers/should-apply-external-studio-settings';

test('applies external settings only while clean and idle', () => {
	expect(
		shouldApplyExternalStudioSettings({
			hasLocalEdits: false,
			isSaving: false,
		}),
	).toBe(true);
	expect(
		shouldApplyExternalStudioSettings({
			hasLocalEdits: true,
			isSaving: false,
		}),
	).toBe(false);
	expect(
		shouldApplyExternalStudioSettings({
			hasLocalEdits: false,
			isSaving: true,
		}),
	).toBe(false);
	expect(
		shouldApplyExternalStudioSettings({
			hasLocalEdits: false,
			isSaving: null,
		}),
	).toBe(true);
	expect(
		shouldApplyExternalStudioSettings({
			hasLocalEdits: true,
			isSaving: null,
		}),
	).toBe(false);
});
