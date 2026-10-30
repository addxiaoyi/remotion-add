export const shouldApplyExternalStudioSettings = ({
	hasLocalEdits,
	isSaving,
}: {
	readonly hasLocalEdits: boolean;
	// `null` means the caller has no way to observe whether a save is in
	// flight. It must not block: an unobservable state is not evidence that a
	// save is running, and treating it as such would freeze external sync
	// permanently.
	readonly isSaving: boolean | null;
}) => !hasLocalEdits && isSaving !== true;
