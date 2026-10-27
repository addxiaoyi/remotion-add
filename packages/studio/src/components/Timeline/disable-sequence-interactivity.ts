import {getStaticT} from '../../i18n';
import type {SequencePropsSubscriptionKey} from 'remotion';
import {NoReactInternals} from 'remotion/no-react';
import {saveSequenceProps, type SetPropStatuses} from './save-sequence-prop';

const t = getStaticT();

export const disableSequenceInteractivity = ({
	clientId,
	fileName,
	nodePath,
	setPropStatuses,
}: {
	readonly clientId: string;
	readonly fileName: string;
	readonly nodePath: SequencePropsSubscriptionKey;
	readonly setPropStatuses: SetPropStatuses;
}): Promise<void> => {
	return saveSequenceProps({
		addedKeyframes: null,
		movedKeyframes: null,
		changes: [
			{
				fileName,
				nodePath,
				fieldKey: 'showInTimeline',
				value: false,
				defaultValue: 'true',
				schema: NoReactInternals.sequenceSchema,
			},
		],
		setPropStatuses,
		clientId,
		undoLabel: t('Disable interactivity'),
		redoLabel: t('Disable interactivity again'),
	});
};
