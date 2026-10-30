# Remotion Studio 状态可靠性优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一更新能力、保护 Studio 设置外部同步冲突，并隔离 Agent Skills 异步操作竞态，使 UI 状态与真实请求结果一致。

**Architecture:** 将 capability、revision 和 operation generation 收敛到现有 Context/Settings 状态边界；展示组件只消费状态并派发动作。更新、设置冲突、Skills 竞态分别在独立文件域实现，`SettingsContext.tsx` 的共享变更由主代理统一整合。所有异步响应先通过 generation/取消状态门控，再提交到 React state。

**Tech Stack:** React 18、TypeScript、Bun test、happy-dom preload、Remotion Studio SettingsContext、oxfmt、TypeScript project references。

---

## 文件边界总览

- 更新能力：`packages/studio/src/components/UpdateStatusContext.tsx`、`SettingsModal.tsx`、`UpdatesSettings.tsx` 与现有更新测试。
- 设置冲突：`packages/studio/src/components/StudioSettings.tsx`、`use-auto-save-config.ts`、`SettingsContext.tsx` 与设置测试。
- Skills 竞态：`packages/studio/src/components/SettingsContext.tsx`、`SkillsSettings.tsx`、`AgentPrompt.tsx` 与 Skills 测试。
- 共享规则：`SettingsContext.tsx` 同时属于设置冲突和 Skills 竞态，两个实现不能并行改同一文件；先完成设置冲突，再整合 Skills generation。
- 不修改：后端更新 API、评分器、CI、渲染队列持久化逻辑、菜单/Modal 视觉和无障碍逻辑。

## Task 1: 建立更新能力状态测试

**Files:**
- Modify: `packages/studio/src/components/UpdateStatusContext.tsx`
- Modify: existing update-related test files under `packages/studio/src/components` or `packages/studio/src/test`

- [ ] **Step 1: 定位现有更新测试与测试工具入口**

Run:

```bash
cd packages/studio
find src -type f \( -iname '*update*.test.*' -o -iname '*settings*.test.*' \) -print
sed -n '1,180p' bunfig.toml
```

现有更新能力测试为 `packages/studio/src/test/can-show-updates.test.ts`；设置和 Skills 状态测试没有匹配的现成文件，后续分别创建 `packages/studio/src/test/studio-settings-sync.test.tsx` 与 `packages/studio/src/test/skills-operation-race.test.tsx`，复用仓库已有 happy-dom preload 与 Testing Library 模式。不得新造与仓库模式冲突的测试 harness。

- [ ] **Step 2: 编写 capability 关闭时的失败测试**

在现有更新测试文件中覆盖以下断言：更新 capability 关闭时，更新请求和 known-bugs 请求均不调用；Context 暴露的状态为 disabled 或等价的非 loading 状态；不会把 `info === null` 解释成永久检查中。

测试必须使用已有的 API mock，并通过调用 provider/render hook 观察请求调用次数和状态。

- [ ] **Step 3: 编写请求失败和 retry 的失败测试**

模拟更新请求拒绝，断言状态进入 error、保留错误文本、不会停留在 loading，并且触发 retry 后会重新发起请求。被取消或 generation 淘汰的请求不得产生用户错误。

- [ ] **Step 4: 运行失败测试确认它们确实失败**

Run:

```bash
bun test --preload ./happydom.ts src/test/can-show-updates.test.ts
```

Expected：新增断言在实现前失败；若测试因环境缺少 DOM 失败，必须修正为仓库已有 preload 方式，不得修改生产代码绕过。

## Task 2: 实现单一 updates capability 并同步入口

**Files:**
- Modify: `packages/studio/src/components/UpdateStatusContext.tsx`
- Modify: `packages/studio/src/components/SettingsModal.tsx`
- Modify: `packages/studio/src/components/UpdatesSettings.tsx`

- [ ] **Step 1: 在 Context 中定义单一能力来源**

保留现有环境判定函数和白标策略，只在 `UpdateStatusContext` 中组合出稳定的 `updatesEnabled`/等价 capability。该值同时控制请求 effect、状态初始值和重试逻辑；不要在 `SettingsModal` 或 `UpdatesSettings` 复制判定。

- [ ] **Step 2: 实现 disabled/loading/ready/error 四类展示状态**

当 capability 关闭时不调用更新 API，返回 disabled 语义；请求开始时为 loading；请求完成后为 ready；请求失败时为 error 并保留 retry 动作。区分“禁用”与“请求失败”，不要用空数据表示两者。

- [ ] **Step 3: 让 SettingsModal 使用 Context capability**

Updates tab 的可见性、当前 tab 安全回退必须消费同一个 capability。若当前 tab 是 updates 而 capability 关闭，切换到现有安全 tab；不得因 `upgradeState !== 'idle'` 绕过 capability 产生幽灵入口。

- [ ] **Step 4: 更新面板呈现禁用和错误反馈**

`UpdatesSettings` 对 disabled 显示明确的不可用文案；loading 使用 `role="status"` 或现有可访问状态组件；error 显示原始错误摘要和 retry 按钮；ready 保持现有更新/无更新展示。

- [ ] **Step 5: 运行更新测试并提交独立提交**

Run:

```bash
cd packages/studio
bun test --preload ./happydom.ts <更新相关测试文件>
cd ../..
bunx tsc -p packages/studio/tsconfig.json --noEmit
bunx oxfmt packages/studio/src/components/UpdateStatusContext.tsx packages/studio/src/components/SettingsModal.tsx packages/studio/src/components/UpdatesSettings.tsx --check
```

Commit:

```bash
git add packages/studio/src/components/UpdateStatusContext.tsx packages/studio/src/components/SettingsModal.tsx packages/studio/src/components/UpdatesSettings.tsx <更新测试文件>
git commit -m "fix(studio): unify update capability state"
```

## Task 3: 为设置同步写入 dirty/conflict 失败测试

**Files:**
- Modify: `packages/studio/src/components/StudioSettings.tsx`
- Modify: `packages/studio/src/components/use-auto-save-config.ts`
- Modify: `packages/studio/src/components/SettingsContext.tsx`
- Modify: existing settings/autosave tests

- [ ] **Step 1: 记录现有 revision 和 auto-save 事件流**

读取 `StudioSettings.tsx` 的 revision effect、数字设置临时值、`use-auto-save-config.ts` 的请求参数和 `SettingsContext.tsx` 的 config-file-changed 事件处理，明确当前保存 generation 的缺口。

- [ ] **Step 2: 写 clean 外部同步测试**

模拟无本地编辑时收到新 revision，断言设置值、synced revision 和 committed 数值均更新为外部配置。

- [ ] **Step 3: 写 dirty/saving 外部冲突测试**

先改变一个普通设置和一个数字设置临时值，再发出外部 revision；断言本地值不被覆盖，状态为 external-conflict，并显示两个动作：加载外部版本、保留我的修改。

- [ ] **Step 4: 写旧保存响应淘汰测试**

让 generation 1 保存请求延迟，generation 2 请求先完成；断言 generation 1 完成后不能清除 generation 2 的 dirty/error/conflict 状态，也不能把同步 revision 回退。

- [ ] **Step 5: 从 Studio package 目录运行失败测试**

Run:

```bash
cd packages/studio
bun test --preload ./happydom.ts src/test/studio-settings-sync.test.tsx
```

Expected：新增冲突和旧响应断言在实现前失败。

## Task 4: 实现 StudioSettings 外部冲突保护和保存 generation

**Files:**
- Modify: `packages/studio/src/components/StudioSettings.tsx`
- Modify: `packages/studio/src/components/use-auto-save-config.ts`
- Modify: `packages/studio/src/components/SettingsContext.tsx`

- [ ] **Step 1: 建立最小状态模型**

在 `StudioSettings` 内以现有 `editedSetters`、`syncedRevision` 和数字 committed/preview 状态为基础，派生 `clean`、`dirty`、`saving`、`save-error`、`external-conflict`；不要引入字段级 merge。

- [ ] **Step 2: 修改 revision effect 的覆盖规则**

revision 变化时：clean 直接同步；dirty/saving/save-error 保留本地值并设置冲突；只有用户执行“加载外部版本”才覆盖本地设置并清除编辑状态。

- [ ] **Step 3: 增加冲突动作**

“加载外部版本”读取当前 `studioRuntimeConfig` 并重置本地编辑；“保留我的修改”保留 local settings、更新最新 revision 基线，并让后续 auto-save 使用最新 revision。动作结果通过现有设置反馈区域暴露。

- [ ] **Step 4: 为 auto-save 增加 generation 门控**

每次保存开始递增 generation；响应只允许更新仍为最新 generation 的状态。失败保留本地编辑并进入 save-error；旧响应不得清空 error、editedSetters 或回退 revision。若现有 hook 需要返回状态，保持其调用方兼容。

- [ ] **Step 5: 运行测试、类型和格式检查并提交**

Run:

```bash
cd packages/studio
bun test --preload ./happydom.ts <设置/autosave测试文件>
cd ../..
bunx tsc -p packages/studio/tsconfig.json --noEmit
bunx oxfmt packages/studio/src/components/StudioSettings.tsx packages/studio/src/components/use-auto-save-config.ts packages/studio/src/components/SettingsContext.tsx --check
```

Commit:

```bash
git add packages/studio/src/components/StudioSettings.tsx packages/studio/src/components/use-auto-save-config.ts packages/studio/src/components/SettingsContext.tsx <设置测试文件>
git commit -m "fix(studio): preserve settings during external config changes"
```

## Task 5: 写 Skills 操作竞态失败测试

**Files:**
- Modify: `packages/studio/src/components/SettingsContext.tsx`
- Modify: `packages/studio/src/components/SkillsSettings.tsx`
- Modify: `packages/studio/src/components/AgentPrompt.tsx`
- Modify: existing Skills/settings tests

- [ ] **Step 1: 写同一技能并发操作测试**

触发 install/remove 或 upgrade 的两个延迟 API mock，断言同一技能只有一个状态变更有效；旧响应不能覆盖新操作结果。

- [ ] **Step 2: 写失败 refresh 组合测试**

模拟操作失败但 refresh 成功，断言最新 skill list 可见且保留操作错误；再模拟操作和 refresh 都失败，断言状态为未知并显示 retry，而不是伪装成成功或空列表。

- [ ] **Step 3: 写卸载保护和反馈测试**

卸载 provider/context 后让请求完成，断言不会产生 state update；操作期间技能行具有 busy/status 语义；复制成功状态会改变按钮可访问名称或 live feedback。

- [ ] **Step 4: 运行失败测试确认测试有效**

Run:

```bash
cd packages/studio
bun test --preload ./happydom.ts src/test/skills-operation-race.test.tsx
```

## Task 6: 实现 Skills generation、互斥和可访问反馈

**Files:**
- Modify: `packages/studio/src/components/SettingsContext.tsx`
- Modify: `packages/studio/src/components/SkillsSettings.tsx`
- Modify: `packages/studio/src/components/AgentPrompt.tsx`

- [ ] **Step 1: 在 SettingsContext 增加技能 action generation**

按 skill name 保存最新 action generation 和 busy 状态；同一技能的状态变更入口统一经过 action gate。优先使用 AbortController；若 `callApi` 不支持取消，则保留 generation 检查丢弃旧响应。

- [ ] **Step 2: 绑定操作后 refresh**

操作和 refresh 都捕获同一 generation；当前 generation 的操作失败且 refresh 成功时，提交最新 skills info 和错误；两者都失败时提交结果未知并保留 retry 目标；旧 generation 不得调用全局 success/error notification。

- [ ] **Step 3: 增加卸载保护**

使用 mounted/active ref 在 Provider 卸载时使所有 generation 失效；所有 async continuation 在 setSettings、setSkillsRevision 或通知前检查 generation 与 mounted 状态。

- [ ] **Step 4: 补齐 Skills/AgentPrompt 反馈**

操作中技能行暴露 `aria-busy="true"`，状态文字使用现有 `role=status`/live region；错误关联到具体技能；复制按钮的 accessible name 在 copied 状态变化，并提供短暂成功反馈；空 skill 列表区分 loading、error 和 empty。

- [ ] **Step 5: 运行测试、类型和格式检查并提交**

Run:

```bash
cd packages/studio
bun test --preload ./happydom.ts <Skills/settings测试文件>
cd ../..
bunx tsc -p packages/studio/tsconfig.json --noEmit
bunx oxfmt packages/studio/src/components/SettingsContext.tsx packages/studio/src/components/SkillsSettings.tsx packages/studio/src/components/AgentPrompt.tsx --check
```

Commit:

```bash
git add packages/studio/src/components/SettingsContext.tsx packages/studio/src/components/SkillsSettings.tsx packages/studio/src/components/AgentPrompt.tsx <Skills测试文件>
git commit -m "fix(studio): isolate skills operation races"
```

## Task 7: 集成验证与回归检查

**Files:**
- No production file changes expected.

- [ ] **Step 1: 运行三类定向测试**

从 `packages/studio` 目录使用 `bunfig.toml` 的 happy-dom preload 运行更新、设置、Skills 相关测试文件。

- [ ] **Step 2: 运行 Studio 类型检查**

Run from repository root:

```bash
bunx tsc -p packages/studio/tsconfig.json --noEmit
```

Expected: exit code 0。若出现与本批次无关的既有错误，原样记录文件、行号和错误文本。

- [ ] **Step 3: 运行目标文件格式检查**

Run:

```bash
bunx oxfmt packages/studio/src/components/UpdateStatusContext.tsx packages/studio/src/components/SettingsModal.tsx packages/studio/src/components/UpdatesSettings.tsx packages/studio/src/components/StudioSettings.tsx packages/studio/src/components/use-auto-save-config.ts packages/studio/src/components/SettingsContext.tsx packages/studio/src/components/SkillsSettings.tsx packages/studio/src/components/AgentPrompt.tsx --check
```

Expected: `All matched files use the correct format.`

- [ ] **Step 4: 检查差异边界和工作区污染**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

确认没有修改评分器、CI、后端 API 或本批次非目标文件；确认每个提交只包含对应任务。

- [ ] **Step 5: 记录真实验证结果**

最终报告逐条贴出命令原始输出、退出码、已知环境阻塞和剩余风险；不把 ESLint 依赖缺失或未运行的测试描述为通过。
