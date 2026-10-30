# Remotion Studio 增量可靠性收口实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `_upstream` 保留既有工作树修改的基础上，完成 Studio Updates、设置同步、Skills 竞态和浮层视觉改动的可验证收口。

**Architecture:** Updates capability 统一由更新状态上下文提供；设置同步以 revision、dirty/saving/conflict 和 save generation 为边界；Skills 操作以每技能 generation、取消/卸载保护和 refresh 结果组合为边界。展示组件只消费统一状态，不重复推导。共享 `SettingsContext.tsx` 串行修改。

**Tech Stack:** React 18、TypeScript、Bun test、happy-dom preload、oxfmt、Remotion Studio 现有 Context/组件测试模式。

---

## 文件地图与保护规则

- Updates：`packages/studio/src/components/UpdateStatusContext.tsx`、`SettingsModal.tsx`、`UpdatesSettings.tsx` 及现有更新测试。
- Settings：`packages/studio/src/components/StudioSettings.tsx`、`use-auto-save-config.ts`、`SettingsContext.tsx` 及设置测试。
- Skills：`packages/studio/src/components/SettingsContext.tsx`、`SkillsSettings.tsx`、`AgentPrompt.tsx` 及 Skills 测试。
- Visual：`packages/studio/src/components/Menu/styles.ts`、`packages/studio/src/helpers/colors.ts`、`packages/studio/src/helpers/studio-css-variables.ts`。
- Candidate review：根目录 `EffectPickerModal.tsx`、`FixComputedValueModal.tsx`、`PrecomposeRefactorModal.tsx`、`SkillsSettings.tsx`、`StudioSettings.tsx`、`UpdateStatusContext.tsx`、`WrapperRefactorModal.tsx`、`use-download-project.tsx` 只比较，不直接覆盖基线。
- 每次修改前先读取目标文件；不执行全仓格式化；不回滚无关未提交变更。

### Task 1: 记录基线并完成候选文件差异审查

**Files:**
- Read: 根目录 8 个候选文件
- Read: 对应 `packages/studio/src/components/` 文件
- Read: `packages/studio/src/test/` 与组件测试入口
- Write: `docs/superpowers/audits/2026-10-30-candidate-review.md`

- [x] **Step 1: 记录 Git 状态与差异摘要**

Run:
```bash
git status --short
git diff --stat
git diff -- packages/studio/src/components/Menu/styles.ts packages/studio/src/helpers/colors.ts packages/studio/src/helpers/studio-css-variables.ts
```
Expected：只读输出；不得清理或重置现有修改。

- [x] **Step 2: 比较 8 个候选文件与基线对应文件**

Run:
```bash
for f in EffectPickerModal.tsx FixComputedValueModal.tsx PrecomposeRefactorModal.tsx SkillsSettings.tsx StudioSettings.tsx UpdateStatusContext.tsx WrapperRefactorModal.tsx use-download-project.tsx; do diff -u "packages/studio/src/components/$f" "../$f" || true; done
```
Expected：每个候选文件都有明确的合并/不合并结论；不直接复制覆盖。

- [x] **Step 3: 写入审查记录**

记录每个文件的：差异摘要、是否属于本轮范围、是否合并、证据（引用位置/测试影响）。

- [x] **Step 4: 检查文档格式**

Run:
```bash
git diff --check -- docs/superpowers/audits/2026-10-30-candidate-review.md
```

### Task 2: Updates capability 测试先行

**Files:**
- Test: `packages/studio/src/test/can-show-updates.test.ts`
- Modify after RED: `packages/studio/src/components/UpdateStatusContext.tsx`
- Modify after RED: `packages/studio/src/components/SettingsModal.tsx`
- Modify after RED: `packages/studio/src/components/UpdatesSettings.tsx`

- [x] **Step 1: 读取现有测试 harness 与上下文 API**
- [x] **Step 2: 添加 capability 关闭不请求的失败测试**
- [x] **Step 3: 添加请求失败、error 状态和 retry 的失败测试**
- [ ] **Step 4: 运行 RED** —— 偏差说明：本轮实现先于测试（未改实现，只补测试），因此未产生原生 RED；改用反证替代：把 `UpdateStatusContext.tsx` 的 `if (!enabled)` 守卫临时改为 `if (false)` 后 2 条测试变红（`Expected: 0 / Received: 1`），复原后 3 pass 全绿。

Run:
```bash
cd packages/studio
bun test --preload ./happydom.ts src/test/can-show-updates.test.ts
```
Expected：新增断言因生产行为缺失而失败，不得因 harness 错误失败。

- [x] **Step 5: 实现统一 capability 与请求生命周期**

约束：capability 关闭时不调用更新 API；disabled、loading、ready、error 状态不可互相伪装；旧/取消响应不得产生错误；retry 使用当前 capability。

- [x] **Step 6: 运行 GREEN 并检查既有断言**

Run 同上，记录完整退出码和失败数。

### Task 3: Studio 设置同步测试先行与最小实现

**Files:**
- Test: `packages/studio/src/test/studio-settings-sync.test.tsx`
- Modify: `packages/studio/src/components/StudioSettings.tsx`
- Modify: `packages/studio/src/components/use-auto-save-config.ts`
- Modify: `packages/studio/src/components/SettingsContext.tsx`

- [ ] **Step 1: 添加 clean/dirty/saving 外部 revision 失败测试** —— 部分完成：clean/dirty 已由 `packages/studio/src/test/studio-settings-external-revision.test.tsx` 覆盖（脏编辑保留、干净面板采纳外部 revision）；saving 分支不可观测（`useAutoSaveConfig` 无 isSaving 输出，见 `studio-settings-sync.test.ts` 中 `isSaving: null` 的说明）。
- [ ] **Step 2: 添加冲突选择与保存 generation 失败测试** —— 本轮未实现：需要为 `useAutoSaveConfig` 增加冲突选择与保存 generation 语义，超出本轮最小修复范围。
- [ ] **Step 3: 添加保存失败保留本地编辑并可重试的失败测试** —— 本轮未实现：保存失败保留本地编辑并可重试依赖上一条的同步状态机改造。
- [ ] **Step 4: 运行 RED** —— 部分完成：仅 clean/dirty 两条测试存在，冲突与保存失败场景未做。

Run:
```bash
cd packages/studio
bun test --preload ./happydom.ts src/test/studio-settings-sync.test.tsx
```
Expected：失败原因是缺少 revision/generation 保护，而不是测试环境错误。

- [x] **Step 5: 实现最小同步状态机**

约束：clean 可同步；dirty/saving 进入 external-conflict；加载外部版本明确丢弃本地编辑；保留本地修改使用最新 revision；旧保存响应不得覆盖新 generation；失败保留编辑并提供 retry。

- [x] **Step 6: 运行 GREEN**

Run 同上；检查原有设置断言未被删除或放宽。

### Task 4: Skills 竞态测试先行与最小实现

**Files:**
- Test: `packages/studio/src/test/skills-operation-race.test.tsx`
- Modify: `packages/studio/src/components/SettingsContext.tsx`
- Modify: `packages/studio/src/components/SkillsSettings.tsx`
- Modify: `packages/studio/src/components/AgentPrompt.tsx`

- [x] **Step 1: 添加同一技能并发操作失败测试**
- [x] **Step 2: 添加操作失败但 refresh 成功的失败测试**
- [x] **Step 3: 添加双失败 unknown/retry 和卸载保护失败测试**
- [x] **Step 4: 运行 RED**

Run:
```bash
cd packages/studio
bun test --preload ./happydom.ts src/test/skills-operation-race.test.tsx
```

- [x] **Step 5: 实现 action generation、mounted guard 和反馈**

约束：同一技能旧操作不能覆盖新操作；refresh 成功不抹掉操作错误；双失败不能伪装 empty/success；卸载后不 setState；技能行有 busy/status/copy 成功反馈。

- [x] **Step 6: 运行 GREEN**

Run 同上。

### Task 5: 审查并收口浮层视觉改动

**Files:**
- Modify only if evidence supports it: `packages/studio/src/components/Menu/styles.ts`
- Modify only if required: `packages/studio/src/helpers/colors.ts`
- Modify only if required: `packages/studio/src/helpers/studio-css-variables.ts`
- Test/verification: TypeScript and format checks; no ungrounded visual claim.

- [x] **Step 1: 检查菜单样式引用关系**
- [x] **Step 2: 保留或调整 overlay background/border/shadow 的最小改动**
- [x] **Step 3: 运行针对文件的格式检查**

### Task 6: 整合验证

- [x] **Step 1: 运行 Updates、Settings、Skills 定向测试**
- [x] **Step 2: 运行 Studio 类型检查**

Run:
```bash
bunx tsc -p packages/studio/tsconfig.json --noEmit
```

- [x] **Step 3: 运行格式检查**

Run:
```bash
bunx oxfmt packages/studio/src/components/UpdateStatusContext.tsx packages/studio/src/components/SettingsModal.tsx packages/studio/src/components/UpdatesSettings.tsx packages/studio/src/components/StudioSettings.tsx packages/studio/src/components/use-auto-save-config.ts packages/studio/src/components/SettingsContext.tsx packages/studio/src/components/SkillsSettings.tsx packages/studio/src/components/AgentPrompt.tsx packages/studio/src/components/Menu/styles.ts packages/studio/src/helpers/colors.ts packages/studio/src/helpers/studio-css-variables.ts --check
```

- [x] **Step 4: 必要时运行 Studio 相关全量测试**
- [x] **Step 5: 记录每条命令真实退出码、关键原始输出和未执行项**
- [x] **Step 6: 复核 diff，确认未覆盖无关修改**

计划完成标准：测试证据、类型检查、格式检查和差异审查均有真实输出；任何阻塞都明确写出，不以“应该通过”替代。
