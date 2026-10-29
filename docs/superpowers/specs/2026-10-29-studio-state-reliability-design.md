# Remotion Studio 状态可靠性优化设计

## 目标

提升 Remotion Studio 中更新能力、Studio 设置同步和 Agent Skills 操作的状态一致性，避免用户看到伪加载、未保存设置被静默覆盖，或旧异步请求回写新状态。

本批次只处理状态可靠性，不改变后端 API，不处理渲染队列持久化、菜单无障碍、Modal 焦点或视觉 token。

## 范围与非目标

### 范围

1. 统一更新能力开关与 Updates 入口状态。
2. 为 StudioSettings 增加外部配置变更冲突保护。
3. 为 Skills install/upgrade/remove 增加请求 generation、互斥和卸载保护。
4. 为上述状态增加可测试的加载、成功、失败、未知和冲突语义。

### 非目标

- 不修改更新服务 API 或后端响应格式。
- 不引入字段级配置 merge；冲突处理采用整份配置的明确选择。
- 不通过延长 timeout 掩盖竞态。
- 不修改测试评分器、CI 或隐藏用例。
- 不把浏览器下载/渲染队列持久化问题并入本批次。

## 设计

### 1. 更新能力统一

在更新状态的单一上下文中导出或提供稳定的 `updatesEnabled` capability。它由现有环境判定、白标策略和更新功能配置共同决定。

同一 capability 必须驱动：

- 是否发起更新与已知问题请求；
- SettingsModal 是否显示 Updates tab；
- UpdatesSettings 的初始状态与文案；
- 初始 tab 为 updates 时的安全回退。

状态语义：

- `disabled`：不请求网络，显示构建不支持在线更新，或按产品策略隐藏入口；
- `loading`：请求已发起，使用明确的可访问状态反馈；
- `ready`：显示有更新/无更新；
- `error`：显示错误和可重试入口，不能继续显示永久 loading。

不改变 API 调用协议，不复制 capability 判定到多个组件。

### 2. StudioSettings 外部变更冲突

设置编辑状态最少区分：

- `clean`：无本地编辑；
- `dirty`：存在未保存本地编辑；
- `saving`：自动保存请求进行中；
- `save-error`：保存失败但本地编辑仍保留；
- `external-conflict`：本地编辑期间收到外部 revision。

收到新的外部 revision：

- `clean`：加载外部配置并更新同步基线；
- `dirty` 或 `saving`：保留本地状态，进入 `external-conflict`，不静默覆盖；
- `save-error`：保留本地编辑并提示冲突/重试。

冲突 UI 提供两个明确动作：

- **加载外部版本**：丢弃本地编辑，采用外部配置并清除 dirty/conflict 状态；
- **保留我的修改**：保留本地编辑，并以最新 revision 作为下一次保存的基线。

数字输入的临时值和已提交值都参与 dirty 判断。保存请求携带 generation；只有当前 generation 的响应可以更新保存状态，旧响应不得覆盖新编辑。

状态反馈使用可访问的 live region，并区分加载中、未保存、保存失败和外部变更待处理。

### 3. Skills 请求竞态隔离

在 SettingsContext 的技能操作层建立每次操作的 generation，并按技能维度维护 busy 状态。

规则：

- 同一技能同时只允许一个 install/upgrade/remove 状态变更；
- 新操作开始时，旧操作结果失效，优先使用 AbortController 取消；若底层 API 不支持取消，则至少用 generation 丢弃旧结果；
- 只有当前 generation 可以更新全局技能信息、错误和通知；
- 操作后的 refresh 与同一 generation 绑定；
- 操作失败但 refresh 成功时，保留操作失败原因并显示最新技能状态；
- 操作和 refresh 都失败时，显示“结果未知”，提供重试；
- Provider 卸载或上下文失效后，异步结果不得回写状态。

所有改变状态的入口共享同一个 action gate，不能只依赖某个主按钮的 `disabled`。技能行在操作中暴露 `aria-busy`，状态进入 `role=status` 或 `aria-live` 区域，错误关联到对应技能。

## 数据流

```text
capability / revision / action generation
        ↓
统一上下文状态机
        ↓
SettingsModal / UpdatesSettings / StudioSettings / SkillsSettings
        ↓
用户可见状态 + 可访问反馈 + 可重试动作
```

组件不自行推导互相矛盾的 capability。上下文负责异步请求的取消、generation 判定和状态提交；展示组件只负责呈现状态与派发用户动作。

## 错误处理

- 请求失败必须保留原始错误上下文，不能把失败转换成空数据或永久 loading。
- 能确认未执行的失败与“服务端可能已执行但客户端未收到响应”分开表达。
- 旧请求被取消或被 generation 淘汰不显示为用户错误。
- 需要重试的状态保留当前用户编辑或当前技能目标，不要求用户重新填写。

## 测试验收

### 更新能力

1. capability 关闭时不发起更新请求；Updates 入口和面板显示一致。
2. capability 开启且请求失败时显示 error 和 retry，不显示永久 loading。
3. capability 开启时，Updates tab 可见性与请求状态一致。
4. 初始 tab 为 updates 但 capability 关闭时，自动回退到安全 tab。

### 设置同步

1. clean 状态收到外部 revision 能正常同步。
2. dirty 状态收到外部 revision 不覆盖本地编辑。
3. saving 状态收到外部 revision 进入 conflict。
4. 选择加载外部版本后本地编辑被明确丢弃并重新同步。
5. 选择保留本地修改后，下一次保存使用最新 revision。
6. 旧保存响应晚于新保存响应时，不得回写旧状态。
7. 保存失败后本地编辑保留并可重试。

### Skills

1. 同一技能并发操作被互斥或旧操作被取消。
2. 旧操作晚于新操作完成时，不得覆盖新技能状态或通知。
3. 操作失败、refresh 成功时，错误与最新状态同时可见。
4. 操作与 refresh 都失败时显示结果未知并提供重试。
5. Provider 卸载后异步响应不产生状态回写。
6. 操作中的技能行具有可感知 busy/status 反馈。

### 验证命令

从仓库根目录执行：

```bash
bunx tsc -p packages/studio/tsconfig.json --noEmit
bunx oxfmt packages/studio/src/components/UpdateStatusContext.tsx packages/studio/src/components/SettingsModal.tsx packages/studio/src/components/UpdatesSettings.tsx packages/studio/src/components/StudioSettings.tsx packages/studio/src/components/SettingsContext.tsx packages/studio/src/components/SkillsSettings.tsx --check
```

相关测试应从 `packages/studio` 目录执行并加载 `happydom.ts`。若 ESLint 仍因环境缺失 `eslint-plugin-react-hooks` 失败，必须原样记录该环境阻塞，不得将其包装为源码通过或源码失败。

## 实施拆分

1. 更新能力：`UpdateStatusContext.tsx`、`SettingsModal.tsx`、`UpdatesSettings.tsx` 及对应测试。
2. 设置冲突：`StudioSettings.tsx`、`use-auto-save-config.ts`、`SettingsContext.tsx` 及对应测试。
3. Skills 竞态：`SettingsContext.tsx`、`SkillsSettings.tsx`、`AgentPrompt.tsx` 及对应测试。

三个子任务的生产文件域应尽量不重叠；涉及 `SettingsContext.tsx` 的修改必须由主代理统一整合并运行全量相关检查。
