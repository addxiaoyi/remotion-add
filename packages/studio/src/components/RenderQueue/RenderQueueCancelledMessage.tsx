import React from 'react';
import {LIGHT_TEXT} from '../../helpers/colors';
import {useTranslation} from '../../i18n';
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
