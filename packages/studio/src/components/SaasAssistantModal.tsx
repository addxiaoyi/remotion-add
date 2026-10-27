import React, {useCallback, useState} from 'react';
import {getStaticT} from '../i18n';
import {type SaasAssistantAction} from '../saas-features';
import {ModalHeader} from './ModalHeader';
import {RemotionInput} from './NewComposition/RemInput';
import {Button} from './Button';
import {ModalButton} from './ModalButton';

const t = getStaticT();

const container: React.CSSProperties = {
	padding: 16,
	display: 'flex',
	flexDirection: 'column',
	gap: 12,
	flex: 1,
};

const messageList: React.CSSProperties = {
	flex: 1,
	overflowY: 'auto',
	display: 'flex',
	flexDirection: 'column',
	gap: 8,
	minHeight: 120,
};

const bubble: React.CSSProperties = {
	padding: '8px 12px',
	borderRadius: 8,
	fontSize: 13,
	lineHeight: 1.5,
	maxWidth: '85%',
	wordBreak: 'break-word',
};

const assistantBubble: React.CSSProperties = {
	...bubble,
	backgroundColor: 'rgba(38, 100, 255, 0.15)',
	alignSelf: 'flex-start',
};

const userBubble: React.CSSProperties = {
	...bubble,
	backgroundColor: 'rgba(255,255,255,0.08)',
	alignSelf: 'flex-end',
};

type Message =
	| {role: 'assistant'; text: string}
	| {role: 'user'; text: string};

// SaaS 智能助手：用户用自然语言描述需求，服务端 AI 返回结构化操作指令，
// 前端将其映射为参数修改。全程不接触 Remotion 代码。
export const SaasAssistantModal: React.FC<{
	readonly onClose: () => void;
	// 服务端 AI 端点（由 SaaS 后端提供，负责把自然语言约束为 SaasAssistantAction[]）
	readonly assistantEndpoint: string;
	readonly compositionId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly currentProps: Record<string, any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly onApplyActions: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actions: SaasAssistantAction[],
	) => {applied: string[]};
	readonly onExport: () => void;
}> = ({onClose, assistantEndpoint, compositionId, currentProps, onApplyActions, onExport}) => {
	const [messages, setMessages] = useState<Message[]>([
		{
			role: 'assistant',
			text: t(
				'您好！我是您的创作助手。描述您想要的修改，例如"把背景换成蓝色"、"时长缩短到 10 秒"。',
			),
		},
	]);
	const [input, setInput] = useState('');
	const [busy, setBusy] = useState(false);

	const send = useCallback(async () => {
		const query = input.trim();
		if (!query || busy) {
			return;
		}
		setInput('');
		setMessages((m) => [...m, {role: 'user', text: query}]);
		setBusy(true);
		try {
			// 调用 SaaS 服务端 AI（服务端负责把自然语言约束为结构化操作，绝不返回代码）
			const res = await fetch(assistantEndpoint, {
				method: 'POST',
				headers: {'content-type': 'application/json'},
				body: JSON.stringify({
					compositionId,
					query,
					// 只传参数结构与当前值，不传任何代码
					props: currentProps,
				}),
			});
			const data = await res.json();
			const {reply, actions} = data as {
				reply: string;
				actions: SaasAssistantAction[];
			};
			let text = reply;
			if (actions && actions.length > 0) {
				const {applied} = onApplyActions(actions);
				if (applied.length > 0) {
					text += `\n\n✅ 已应用：${applied.join('、')}`;
				}
			}
			setMessages((m) => [...m, {role: 'assistant', text}]);
		} catch (err) {
			setMessages((m) => [
				...m,
				{
					role: 'assistant',
					text: t('连接助手失败，请稍后重试。'),
				},
			]);
		} finally {
			setBusy(false);
		}
	}, [input, busy, assistantEndpoint, compositionId, currentProps, onApplyActions]);

	return (
		<>
			<ModalHeader title={t('创作助手')} onClose={onClose} />
			<div style={container}>
				<div style={messageList}>
					{messages.map((m, i) => (
						<div
							key={i}
							style={m.role === 'assistant' ? assistantBubble : userBubble}
						>
							{m.text}
						</div>
					))}
					{busy ? (
						<div style={assistantBubble}>{t('思考中...')}</div>
					) : null}
				</div>
				<div style={{display: 'flex', gap: 8}}>
					<div style={{flex: 1}}>
						<RemotionInput
						status={'ok' as const}
						rightAlign={false}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder={t('描述您想要的修改...')}
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							onKeyDown={(e: any) => {
								if (e.key === 'Enter') {
									send().catch(() => undefined);
								}
							}}
							style={{width: '100%'}}
						/>
					</div>
					<Button onClick={send} disabled={busy}>
						{t('发送')}
					</Button>
					<ModalButton onClick={onExport}>{t('导出我的作品')}</ModalButton>
				</div>
			</div>
		</>
	);
};
