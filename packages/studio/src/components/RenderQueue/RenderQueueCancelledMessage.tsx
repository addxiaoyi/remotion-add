import {useTranslation} from '../../i18n';
import React from 'react';
import {LIGHT_TEXT} from '../../helpers/colors';
import {renderQueueItemSubtitleStyle} from './item-style';

const cancelledStyle: React.CSSProperties = {
	...renderQueueItemSubtitleStyle,
	color: LIGHT_TEXT,
	cursor: 'default',
};

export const RenderQueueCancelledMessage: React.FC = () => {
	const {t} = useTranslation();
	return <span style={cancelledStyle}>{t('Cancelled')}</span>;
};
