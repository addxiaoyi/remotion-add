// SaaS 模式下的合规替代功能
// 原则：不生成/不暴露 Remotion 代码，一切通过参数与模板操作实现

import {getStaticT} from './i18n';

const t = getStaticT();

// ============ 1. 导出成品（替代"下载项目"） ============
// 只导出渲染后的视频/图片 + 模板参数 JSON，绝不含工程代码
export type SaasExportPayload = {
	compositionId: string;
	// 用户可调的模板参数（不含任何代码）
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	props: Record<string, any>;
};

export const buildSaasExportManifest = (
	payload: SaasExportPayload,
): string => {
	return JSON.stringify(
		{
			type: 'saas-template-export',
			version: 1,
			compositionId: payload.compositionId,
			props: payload.props,
			exportedAt: new Date().toISOString(),
			note: '此文件仅包含模板参数，不含 Remotion 代码。可通过导入恢复您的创作。',
		},
		null,
		2,
	);
};

export const downloadSaasExport = (payload: SaasExportPayload): void => {
	const manifest = buildSaasExportManifest(payload);
	const blob = new Blob([manifest], {type: 'application/json'});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${payload.compositionId}-template.json`;
	a.click();
	URL.revokeObjectURL(url);
};

// ============ 2. 智能助手（替代 Ask AI / Generate with agent） ============
// 不暴露代码。AI 的输出被约束为结构化操作指令，前端映射为参数修改。
export type SaasAssistantAction =
	| {type: 'set-prop'; path: string; value: unknown; label: string}
	| {type: 'set-duration'; frames: number; label: string}
	| {type: 'set-fps'; fps: number; label: string}
	| {type: 'suggest'; label: string; message: string};

// 服务端 AI 返回的操作指令（示例契约，服务端负责把自然语言约束成这些结构）
export const applyAssistantActions = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	actions: SaasAssistantAction[],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setProps: (updater: (old: Record<string, any>) => Record<string, any>) => void,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setCompositionConfig: (config: Record<string, any>) => void,
): string[] => {
	const applied: string[] = [];
	for (const action of actions) {
		switch (action.type) {
			case 'set-prop':
				setProps((old) => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const next = {...(old as any)};
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const keys = action.path.split('.');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let cursor: any = next;
					for (let i = 0; i < keys.length - 1; i++) {
						cursor = cursor[keys[i]];
					}
					cursor[keys[keys.length - 1]] = action.value;
					return next;
				});
				applied.push(action.label);
				break;
			case 'set-duration':
				setCompositionConfig({durationInFrames: action.frames});
				applied.push(action.label);
				break;
			case 'set-fps':
				setCompositionConfig({fps: action.fps});
				applied.push(action.label);
				break;
			case 'suggest':
				applied.push(`${action.label}: ${action.message}`);
				break;
			default:
				break;
		}
	}
	return applied;
};

// ============ 3. 官方素材中心（替代 Install package / 元素库） ============
// 素材由服务端托管与审核，前端只拿到资源 URL + 参数 schema，不含代码
export type SaasOfficialAsset = {
	id: string;
	name: string;
	// 预览图
	thumbnail: string;
	// 资源由服务端托管，运行时通过 URL 加载
	resourceUrl: string;
	// 参数 schema：用户能调什么
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	propsSchema: Record<string, any>;
	category: 'overlay' | 'background' | 'transition' | 'sticker' | 'text';
};

// ============ 4. 参数层操作（替代代码重构弹窗） ============
export type SaasPropOperation =
	| {type: 'reset-prop'; path: string; label: string}
	| {type: 'group-props'; paths: string[]; groupName: string; label: string}
	| {type: 'reorder-layer'; from: number; to: number; label: string};

// 判断当前是否显示某个重构入口的替代品
export const getSaasOperationLabel = (
	original: 'fix-computed-value' | 'precompose' | 'wrap' | 'unwrap',
): string => {
	switch (original) {
		case 'fix-computed-value':
			return t('重置此参数为默认值');
		case 'precompose':
			return t('将所选内容组合为组');
		case 'wrap':
			return t('为所选内容添加装饰效果');
		case 'unwrap':
			return t('移除组合');
		default:
			return '';
	}
};
