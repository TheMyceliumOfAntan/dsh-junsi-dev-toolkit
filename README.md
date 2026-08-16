# JunSi开发工具包 (junsi-dev-toolkit · DSH 版)

> 开发任务自动路由工具包 — DeepSeek Harness (DSH) 独立 agent preset 插件。
> 移植自 [junsi-dev-toolkit](https://github.com/TheMyceliumOfAntan/junsi-dev-toolkit) OpenCode 插件，承接同一套开发工作流：代码移植、Bug 修复、新功能开发、文档管理、任务记忆、决策顾问、Agent 集群、浏览器自动化。

## 它能做什么

- **任务自动路由**：按关键词把请求分流到子技能（加功能 / 修 Bug / 移植 / 文档 / 记忆 / 顾问 / 集群 / 浏览器自动化）。**8 个子技能均独立注册**，可直接 `skill("code-migrater")`、`skill("diagnose-before-fix")` 等按名加载。
- **7 个 memory 工具**：`store-decision` / `save-progress` / `prepare-handoff` / `restore-handoff` / `list-decisions` / `memory-doctor` / `save-preference`，决策与进度写入当前工作区 `.memory/`（项目隔离）。
- **tool-search**：按关键词检索最合适工具。
- **git 工具**：通用 git 透传（`status`/`add`/`commit`/`push`/`pull`/`fetch`/`clone`...）。以 HOST 完整身份直接运行 git（不经受限沙箱），能访问你的 git 凭据(PAT/ssh agent/`~/.ssh`)与 `ssh.exe`，解决 DSH 沙箱隔离凭据导致 GitHub HTTP/SSH `pull`/`push` 认证失败的问题。
- **远程更新预检（Gate 0）**：加功能/修 Bug/移植前，先 `git fetch` + 查远程提交/CHANGELOG/Release Notes（可 web_search），确认问题/需求是否已被上游实现或修复，避免重复造轮子。
- **MCP 支持**：`project-docs`（项目文档/代码感知）+ `playwright`（浏览器自动化），通过 DSH 官方 `dsh-mcp-client` 承接。
- 复用 DSH 官方 `@deepseek-ai/dsh-*` 包：子技能加载、定时提醒、subagent 集群、目标、计划模式、待办、提问等。

## 目录结构

```
dsh-junsi-dev-toolkit/
├── README.md                 # 本文件
├── LICENSE                   # MIT
├── package.json
├── skills/                   # 技能包根 —— customSkillDirs 指向它
│   └── junsi-dev-toolkit/    # 主 SKILL.md + 8 个子技能 + shared/
│       ├── SKILL.md          # 主路由表
│       ├── advisor/          # 决策顾问
│       ├── cluster/          # Agent 集群
│       ├── code-migrater/    # 代码移植
│       ├── computer-use/     # 浏览器/桌面自动化
│       ├── diagnose-before-fix/  # Bug 修复（证据优先）
│       ├── memory-skill/     # 决策记忆 / 进度 / HANDOFF
│       ├── project-docs/     # 项目知识中枢（MCP）
│       ├── requirements-driven-dev/  # 新功能开发
│       └── shared/           # ai-compliance + 模板
├── plugins/                  # 自研 preset-local 插件（相对路径引用）
│   ├── memory-tools.mjs      # 7 个 memory 工具
│   ├── tool-search.mjs       # tool-search
│   ├── git.mjs               # 通用 git 工具（HOST 身份运行，访问凭据）
│   └── routing.mjs           # 路由提示段（systemPrompt）
├── preset/                   # agent preset 模板（要自建 preset 时用）
│   ├── agent.cordis.yml
│   └── preset.yml
├── preset-v4pro/             # V4 Pro 优化极简 preset（persona: You are a helpful software engineer assistant）
│   ├── agent.cordis.yml
│   └── preset.yml
└── mcp/
    └── project-docs/         # project-docs MCP server
        ├── mcp-server.py
        ├── requirements.txt
        ├── start-mcp.bat
        └── start-mcp.sh
```

## 安装（DSH）

### 方式 A：完整 agent preset（推荐，一次到位）

1. 克隆本仓库到你机器上的任意位置，例如 `C:\src\dsh-junsi-dev-toolkit`。
2. 把 `preset/` 里两个文件放进你的 DSH 用户预设目录：
   ```powershell
   $dst = "$HOME\.dsh\.agent-presets\junsi-dev-toolkit"
   New-Item -ItemType Directory -Force -Path $dst
   Copy-Item .\preset\agent.cordis.yml $dst\
   Copy-Item .\preset\preset.yml $dst\
   Copy-Item .\plugins $dst\plugins -Recurse -Force
   Copy-Item .\mcp $dst\mcp -Recurse -Force
   Copy-Item .\skills $dst\skills -Recurse -Force
   ```
3. **编辑 `$dst\agent.cordis.yml` 两处**（★ 标记）：
   - `skill-filesystem.customSkillDirs` → 你的 `$dst\skills` 绝对路径（**两行都要填你的实际路径**：第一行指 `skills` 根挂主技能包，第二行指 `skills\junsi-dev-toolkit` 让 8 个子技能也独立注册为可 `skill(...)` 加载的条目）。
   - `mcp-project-docs` 的 `mcp-server.py` `args` 路径 → 你的 `$dst\mcp\project-docs\mcp-server.py`。
4. 在 DSH 会话里选择 preset「JunSi开发工具包」起新会话。
   > 子技能已独立注册：可直接 `skill("code-migrater")`、`skill("diagnose-before-fix")` 等按名加载，不再报 "unknown or no longer available"。

### 方式 B：只挂技能（已有 preset 想加这套 skill）

在你已有 preset 的 `agent.cordis.yml` 里给 `skill-filesystem` 加 `customSkillDirs`（绝对路径指向本仓库 `skills/`）：
```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    customSkillDirs:
      - 'C:/src/dsh-junsi-dev-toolkit/skills'
```
（memory 工具等则需要方式 A 的自研插件；只挂技能会缺失 memory/tool-search/routing。）

## 前置条件

- **DSH 运行时**：使用的是 DeepSeek Harness（DeepSeek Harness 的 agent preset 机制）。
- **`project-docs` MCP**（可选）：本机需 `python` + `pip install mcp pydantic`（见 `mcp/project-docs/requirements.txt`）。
- **`playwright` MCP**（可选）：需 `npx` 能解析 `@playwright/mcp@latest`。
- 未满足上述 MCP 前置时，对应 MCP 工具不可用，不影响 preset 其余能力。

## 验证

- 选择「JunSi开发工具包」起会话后，说：
  - `"保存进度"` → 触发 `save-progress`，写 `.memory/`。
  - `"帮我查项目文档"` → 触发 `project-docs` MCP（若已装）。
  - `"打开网页自动操作"` → 触发 `playwright` MCP（若已装）。
  - `"找处理文件的工具"` → 触发 `tool-search`。
  - `"权衡一下这两个方案"` → 路由到 `advisor`。

## 从零使用

| 你想做什么 | 对 AI 说 |
|:---|:---|
| 移植代码 | "把 Java 项目移植到 Go" |
| 修复 Bug | "这个接口返回空列表了" |
| 添加功能 | "加一个导出 CSV 功能" |
| 查询文档 | "API 响应格式是什么规范？" |
| 保存进度 | "记一下做到哪了" |
| 回顾决策 | "有哪些决策" |
| 决策权衡 | "这两个方案怎么选" |
| 浏览器操作 | "帮我打开网页点一下这个按钮" |

## V4 Pro 提示词优化（minimal-v4pro）

深度求索 V4 Pro (0813) 对特定提示词有优化：在**极简模式**下把 persona 设为 `You are a helpful software engineer assistant.` 能显著提升 V4 Pro 水平（接近 Opus）。

本仓库提供 `preset-v4pro/`（基于官方 `minimal` 预设、persona 即该句、`complete: true`）。要使用：

```powershell
$dst = "$HOME\.dsh\.agent-presets\minimal-v4pro"
New-Item -ItemType Directory -Force -Path $dst
Copy-Item .\preset-v4pro\agent.cordis.yml $dst\
Copy-Item .\preset-v4pro\preset.yml $dst\
```

然后在 DSH 会话里选择 preset「极简模式·V4Pro」起会话。

> **验证信号（启发式，非绝对）**：当该优化句真正生效时，V4 Pro 的思维链（chain-of-thought）通常会以 **"We need xxx"** 开头（一般方法，不一定每个都如此）。这不能当唯一判据，但对自测"优化句有没有真触发"是个有用的观察点。

> JunSi开发工具包 preset 的 persona 也已在开头加上了同一句，让默认 dev 会话同样受益。

## 许可

MIT License — © 2026 JunSi。欢迎 fork / PR / star。
