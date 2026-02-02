# AutoIntel-Squad Agent Guidelines

This document provides guidelines for agentic coding agents working in the AutoIntel-Squad repository. This is a documentation-based repository containing agent role definitions for autonomous driving intelligence gathering.

## Repository Overview

- **Type**: Documentation repository (markdown files defining agent roles)
- **Purpose**: Define multi-agent system for autonomous driving technology intelligence collection
- **No traditional build/test/lint processes** - agents execute via role-playing
- **Primary files**: Markdown role definitions in `agents_system/`
- **Output**: Generated reports in `reports/{YYYY-MM}/{YYYY-MM-DD}/`

## Cursor/Copilot Rules

No Cursor rules (`.cursorrules`) or Copilot instructions (`.github/copilot-instructions.md`) are present in this repository. Agents should follow the guidelines in this file and the role definitions in `agents_system/`.

## Build/Test/Lint Commands

This repository does not have traditional build or test scripts. However, the following commands are useful for repository maintenance:

### Directory Management
```bash
# Create daily report directory structure
mkdir -p reports/$(date +%Y-%m)/$(date +%Y-%m-%d)

# List recent reports
ls -la reports/$(date +%Y-%m)/

# View specific report
cat reports/2026-01/2026-01-21/2026-01-21_Report.md
```

### File Validation
```bash
# Validate JSON files (requires jq)
find reports -name "*.json" -exec jq empty {} \;

# Check for empty files
find reports -type f -empty

# Clean old reports (30+ days)
find reports -type f -mtime +30 -delete
```

### Agent Execution Simulation
```bash
# No actual execution scripts - agents should follow role definitions
# Refer to CODEBUDDY.md for execution workflows
```

## Code Style Guidelines

### Language
- **Primary language**: Use Simplified Chinese for all interactions, thoughts, file generation, and logging
- **Output style**: Professional, clear Chinese
- **Time synchronization**: Always use current real system time from environment

### File Naming Conventions
- **Agent definitions**: `snake_case.md` in `agents_system/` (e.g., `autointel_dispatcher.md`)
- **Report files**: Numbered prefixes for execution order:
  - `01_plan.json` - Execution plan
  - `02_industry.json` - Industry intelligence
  - `03_papers.json` - Academic papers
  - `04_code.json` - Open source projects
- **Final reports**: `{YYYY-MM-DD}_Report.md` (e.g., `2026-01-21_Report.md`)
- **Directories**: `reports/{YYYY-MM}/{YYYY-MM-DD}/` monthly and daily organization

### JSON Formatting Standards
- **Encoding**: UTF-8
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Double quotes for strings
- **Trailing commas**: Not allowed
- **Date format**: ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)
- **Required fields** (for agent outputs):
  - `timestamp`: ISO 8601 timestamp
  - `source`: Original source URL
  - `content`: Main content/text
  - `publish_date` or `last_updated`: For时效性 verification

### Markdown Formatting
- **Headers**: Use ATX style (`#`, `##`, `###`)
- **Lists**: Use hyphen `-` for unordered lists
- **Code blocks**: Use triple backticks with language specification when relevant
- **Links**: Use descriptive link text `[description](URL)`
- **Emojis**: Use sparingly for visual categorization (e.g., ⚡, 📰, 📄)

### Naming Conventions
- **Imports/Types**: Not applicable (no source code)
- **Variables/functions**: Not applicable (no source code)
- **File references**: Use relative paths from repository root
- **Agent references**: Use exact names: `AutoIntel-Dispatcher`, `Industry_Watcher`, `Paper_Hunter`, `Code_Scout`, `Chief_Analyst`
- **Plan IDs**: `plan_YYYYMMDD_HHMMSS` format

### Error Handling
- **Missing files**: Agents should create directories automatically (`mkdir -p`)
- **Empty results**: Continue with available data, generate degraded report
- **JSON errors**: Output minimal valid JSON with error field
- **Timeouts**: Implement retry logic (max 2 retries, 30s backoff)

## Agent-Specific Guidelines

### AutoIntel-Dispatcher
- **Location**: `agents_system/autointel_dispatcher.md`
- **Responsibility**: Parse user intent, generate execution plans, coordinate other agents
- **Output**: Structured JSON plan with `metadata`, `thought_process`, `execution_plan`
- **Execution modes**: `parallel` (default), `sequential`, `hybrid`

### Industry_Watcher
- **Focus**: Tesla, Huawei, Waymo, NIO, XPeng, Li Auto, etc.
- **Time range**: Recent 24-72 hours (extendable to 1-2 months if needed)
- **Keywords**: Include company names + technical terms
- **Quality assessment**: Accuracy, depth, practicality, timeliness scoring

### Paper_Hunter
- **Sources**: arXiv, CVPR, ICCV, ICRA conferences
- **Domains**: End-to-end autonomous driving, world models, diffusion policies, VAD
- **Filter**: Prioritize papers with code implementations
- **Output**: Paper summaries, innovation points, application potential assessment

### Code_Scout
- **Platforms**: GitHub Trending, Hugging Face
- **Targets**: Simulators, datasets, toolchains
- **Focus**: Major company open-source projects, high-star-growth projects
- **Output**: Project descriptions, tech stack, difficulty assessment

### Chief_Analyst
- **Input**: Reads JSON outputs from other three agents
- **Processing**: Deduplication, cleaning, quality rating
- **Analysis**: Add technical context, assess industrial application value
- **Output**: Structured daily report, learning suggestions

## Workflow Commands

### Full Daily Report Collection
```bash
# User input: "给我今天的最新动态，特别是端到端方面的进展"
# Agent should act as AutoIntel-Dispatcher, generate plan, parallel execute A/B/C, trigger D
```

### Targeted Search
```bash
# User input: "查找UniAD相关最新论文和代码"
# Agent should launch Paper_Hunter and Code_Scout with specific keywords
```

### Deep Analysis
```bash
# User input: "分析最近Tesla FSD的技术演进趋势"
# Agent should schedule Industry_Watcher + Chief_Analyst for trend analysis
```

## Quality Standards

### Intelligence Collection
- **Accuracy**: Verify information from multiple sources when possible
- **Depth**: Provide technical details, not just headlines
- **Practicality**: Focus on information useful for end-to-end engineers
- **Timeliness**: Prioritize recent information (see time range guidelines)

### Report Generation
- **Structure**: Follow the exact template in `chief_analyst.md`
- **Completeness**: Include all required sections
- **Actionability**: Provide concrete learning suggestions
- **Formatting**: Consistent markdown styling

## File Structure Reference

```
AutoIntel-Squad/
├── agents_system/
│   ├── autointel_dispatcher.md
│   ├── industry_watcher.md
│   ├── paper_hunter.md
│   ├── code_scout.md
│   └── chief_analyst.md
├── CODEBUDDY.md
├── AGENTS.md (this file)
└── reports/
    └── {YYYY-MM}/
        └── {YYYY-MM-DD}/
            ├── 01_plan.json
            ├── 02_industry.json
            ├── 03_papers.json
            ├── 04_code.json
            └── {YYYY-MM-DD}_Report.md
```

## References

- `CODEBUDDY.md`: Main repository documentation
- `agents_system/autointel_dispatcher.md`: Detailed execution plan templates
- `agents_system/chief_analyst.md`: Report template and quality standards
- `agents_system/common/`: Shared modules for token optimization

## Shared Modules (New)

To reduce token consumption and improve maintainability, shared modules have been created:

### Location: `agents_system/common/`
- `common_profile.md`: Standardized agent profile template
- `common_rules.md`: Core rules library (data authenticity, quality assurance)
- `common_workflow.md`: Standardized execution workflow  
- `common_output.md`: Unified JSON output format standards
- `README.md`: Usage instructions and implementation guide

### Key Benefits:
1. **Token Reduction**: Estimated 40-45% reduction in prompt token usage
2. **Consistency**: Unified standards across all agents
3. **Maintainability**: Centralized updates, single source of truth
4. **Quality Assurance**: Standardized validation and error handling

### Usage Example:
```markdown
# Role: Industry_Watcher

## Profile
Refer to: `agents_system/common/common_profile.md`

## Rules
Follow: `agents_system/common/common_rules.md`

## Workflow  
Follow: `agents_system/common/common_workflow.md`

## Output Format
Follow: `agents_system/common/common_output.md`

## Agent-Specific Configuration
[Add agent-specific skills, focus areas, search strategies]
```

## Moltbook Integration

AutoIntel-Squad已注册为Moltbook AI agent社交网络的成员。这允许项目在AI agent社区中分享进展、发现合作机会并跟踪AI技术趋势。

### 注册信息
- **Agent名称**: `AutoIntel-Squad`
- **API密钥**: 存储在 `~/.config/moltbook/credentials.json`
- **个人主页**: https://moltbook.com/u/AutoIntel-Squad
- **验证状态**: 已通过验证 (claimed)

### API密钥管理
```bash
# 查看凭证
cat ~/.config/moltbook/credentials.json

# 环境变量设置（可选）
export MOLTBOOK_API_KEY="moltbook_sk_uEOIwue0O5Fi97_QJUyxhyuXxL3ZjXnY"
```

### 心跳集成建议
由于本项目没有传统的心跳系统，建议以下方式定期检查Moltbook：

1. **每日检查**: 在生成每日报告时同时检查Moltbook
2. **手动触发**: 用户可要求agent检查Moltbook动态
3. **事件驱动**: 当收集到重要技术突破时分享到Moltbook

### 常用API命令
```bash
# 检查验证状态
curl https://www.moltbook.com/api/v1/agents/status -H "Authorization: Bearer $MOLTBOOK_API_KEY"

# 获取个性化feed
curl "https://www.moltbook.com/api/v1/feed?sort=hot&limit=10" -H "Authorization: Bearer $MOLTBOOK_API_KEY"

# 发布帖子（每30分钟限1次）
curl -X POST https://www.moltbook.com/api/v1/posts \
  -H "Authorization: Bearer $MOLTBOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"submolt": "general", "title": "标题", "content": "内容"}'
```

### 内容策略
- **技术分享**: 分享自动驾驶领域的重要发现
- **项目更新**: 报告AutoIntel-Squad系统的新功能
- **社区互动**: 回复相关技术讨论，关注其他AI agent项目
- **频率控制**: 避免过度发帖，注重内容质量

### 参考文档
- [Moltbook Skill Guide](https://www.moltbook.com/skill.md)
- [Heartbeat Integration](https://www.moltbook.com/heartbeat.md)
- [API Reference](https://www.moltbook.com/skill.md#api-reference)

## Version

Created: 2026-01-21
Updated: 2026-02-02 (Added Moltbook integration for AI agent community engagement; Added shared modules for token optimization; Enhanced system robustness with 4-level fallback loading strategy; Expanded Chinese data sources for Industry_Watcher)
For use with agentic coding systems.