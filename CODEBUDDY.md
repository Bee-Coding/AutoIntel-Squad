This file provides guidance to CodeBuddy Code when working with code in this repository.
# AutoIntel-Squad(自动驾驶情报小队)
## 系统概述
  AutoIntel-Squad 是一个基于 CodeBuddy
  的多智能体系统，专门用于自动驾驶领域的技术情报收集与分析。本项目不包含传统意义上的源代码，而是定义了一套智能体角色和工作流，供 CodeBuddy
  实例扮演执行。

# 自动驾驶情报小队 - 总指挥
@agents_system/autointel_dispatcher.md

### 核心组件
  1. **总控调度官 (AutoIntel-Dispatcher)** - 协调整个系统，解析用户意图，生成执行计划
  2. **工业界情报员 (Industry_Watcher)** - 追踪 Tesla、华为、Waymo 等公司的技术动态
  3. **学术论文猎手 (Paper_Hunter)** - 搜集 arXiv、顶会的最新论文
  4. **开源项目侦察兵 (Code_Scout)** - 发现 GitHub 开源项目、数据集、工具库
  5. **首席情报官 (Chief_Analyst)** - 整合所有情报，生成结构化日报和学习建议

## 开发与构建说明
  ⚠️ **重要提示**: 本项目为文档型仓库，不包含传统软件的构建、测试或 linting 流程。所有智能体角色通过 CodeBuddy 的角色扮演功能执行。

### 常见开发任务
- **添加新智能体**: 在 `agents_system/` 目录下创建新的 `.md` 文件，定义角色指令
- **修改现有智能体**: 编辑对应的 `.md` 文件，更新关注目标、质量要求或输出格式
- **调整工作流**: 修改 `autointel_dispatcher.md` 中的调度逻辑和执行计划模板
- **查看生成报告**: 浏览 `reports/{YYYY-MM}/{YYYY-MM-DD}/` 目录下的 JSON 和 Markdown 文件

## 系统架构
本项目采用分任务收集情报并汇总架构，详细信息见各层文件。

### 文件结构
AutoIntel-Squad/
├── agents_system/           # 智能体角色定义
│   ├── autointel_dispatcher.md  # 总控调度官
│   ├── industry_watcher.md      # 工业界情报员
│   ├── paper_hunter.md          # 学术论文猎手
│   ├── code_scout.md            # 开源项目侦察兵
│   └── chief_analyst.md         # 首席情报官
├── CODEBUDDY.md            # 本文件
└── reports/                # 生成的情报报告
    └── {YYYY-MM}/
        └── {YYYY-MM-DD}/
            ├── 01_plan.json      # 执行计划
            ├── 02_industry.json  # 工业界情报
            ├── 03_papers.json    # 学术论文情报
            ├── 04_code.json      # 开源项目情报
            └── {YYYY-MM-DD}_Report.md  # 最终日报

## 如何使用智能体系统
当用户请求情报收集时，CodeBuddy 应遵循以下流程：

1. **识别用户意图** - 判断请求类型（全量日报、定向搜索、深度分析、专项跟踪）
2. **生成执行计划** - 按照 `autointel_dispatcher.md` 中的模板创建 JSON 计划
3. **扮演相应角色** - 根据计划切换到对应的智能体角色执行任务
4. **存储中间结果** - 将收集的情报保存到 `reports/` 目录的对应 JSON 文件
5. **汇总生成报告** - 最后扮演 Chief_Analyst 角色，整合所有情报生成最终日报

### 调用示例
- **全量日报**: "给我今天的最新动态，特别是端到端方面的进展"
- **定向搜索**: "查找 UniAD 相关最新论文和代码"
- **深度分析**: "分析最近 Tesla FSD 的技术演进趋势"


## 小队成员
@agents_system/industry_watcher.md
@agents_system/paper_hunter.md
@agents_system/code_scout.md
@agents_system/chief_analyst.md

# 用户全局配置

## 重要系统偏好
- **语言**: 在所有交互、思考、文件生成和日志记录中，请**始终优先使用简体中文**。
- **输出风格**: 回答和生成内容时，请使用专业、清晰的中文。
- **时间同步**: 在所有记忆记录、会话记录和时间戳中，请**始终使用当前真实系统时间**。记忆系统应该从系统环境动态获取当前时间，确保时间记录的准确性和同步性。

---

## 常用工作流命令

### 运行全量日报收集
```bash
# 作为AutoIntel-Dispatcher角色运行
# 用户输入："给我今天的最新动态，特别是端到端方面的进展"
```
这将生成执行计划并并行启动所有Agent进行情报收集。

### 定向搜索特定主题
```bash
# 示例：搜索UniAD相关最新论文和代码
# 用户输入："查找UniAD相关最新论文和代码"
```
这会启动Paper_Hunter和Code_Scout进行专项搜索。

### 查看生成报告
```bash
# 查看最新生成的日报
ls -la reports/$(date +%Y-%m)/
# 查看特定日期的报告
cat reports/2026-01/2026-01-21/2026-01-21_Report.md
```

### 清理旧报告
```bash
# 删除30天前的报告
find reports -type f -mtime +30 -delete
```

### 手动创建报告目录结构
```bash
# 创建当天的报告目录
mkdir -p reports/$(date +%Y-%m)/$(date +%Y-%m-%d)
```

## 高级系统架构

### 智能体通信架构
```
用户请求 → AutoIntel-Dispatcher → 生成执行计划(01_plan.json)
                                ↓
                    ┌─────────┬─────────┬─────────┐
                    ↓         ↓         ↓         ↓
          Industry_Watcher Paper_Hunter Code_Scout Chief_Analyst
                    ↓         ↓         ↓         ↓
              02_industry.json 03_papers.json 04_code.json 最终日报
```

### 数据流模式
1. **并行执行模式**：Agent A/B/C同时执行，完成后触发Agent D
2. **依赖管理**：通过JSON中的`depends_on`字段控制任务依赖关系
3. **结果收集**：每个Agent将结果写入指定的JSON文件路径
4. **状态跟踪**：系统通过文件存在性检查任务完成状态

### 智能体职责分解

**AutoIntel-Dispatcher** (`agents_system/autointel_dispatcher.md`)
- 解析用户意图，识别请求类型
- 生成结构化执行计划（JSON格式）
- 调度其他智能体的执行顺序
- 处理超时和故障恢复

**Industry_Watcher** (`agents_system/industry_watcher.md`)
- 关注：Tesla, 华为, Waymo, 蔚小理等公司
- 时间范围：最近24-72小时
- 输出：技术动态、OTA更新、发布会信息
- 质量评估：准确性、深度、实用性、时效性评分

**Paper_Hunter** (`agents_system/paper_hunter.md`)
- 来源：arXiv, CVPR, ICCV, ICRA等
- 领域：端到端自动驾驶、世界模型、扩散策略
- 筛选：优先有代码实现的项目
- 输出：论文摘要、创新点、应用潜力评估

**Code_Scout** (`agents_system/code_scout.md`)
- 平台：GitHub Trending, Hugging Face
- 对象：仿真器、数据集、工具链
- 重点：大厂开源项目、高star增长项目
- 输出：项目描述、技术栈、上手难度评估

**Chief_Analyst** (`agents_system/chief_analyst.md`)
- 输入：读取前三个Agent的输出JSON文件
- 处理：去重、清洗、质量评级
- 分析：补充技术背景、评估工业应用价值
- 输出：结构化日报、学习建议

### 文件格式规范

**执行计划格式** (`01_plan.json`)
```json
{
  "metadata": {
    "plan_id": "plan_YYYYMMDD_HHMMSS",
    "user_intent": "用户意图描述",
    "execution_mode": "parallel|sequential|hybrid",
    "priority": "high|medium|low"
  },
  "thought_process": "分析逻辑",
  "execution_plan": {
    "tasks": [
      {
        "task_id": "task_001",
        "agent": "Agent_A",
        "query_keywords": ["keyword1", "keyword2"],
        "instruction": "详细指令",
        "depends_on": [],
        "output_to": "./reports/YYYY-MM/YYYY-MM-DD/02_industry.json",
        "timeout": 300,
        "retry_count": 2
      }
    ],
    "final_task": {
      "task_id": "final_summary",
      "agent": "Agent_D",
      "depends_on": ["task_001", "task_002", "task_003"],
      "instruction": "汇总所有情报，生成日报和学习建议",
      "input_sources": [
        "./reports/YYYY-MM/YYYY-MM-DD/02_industry.json",
        "./reports/YYYY-MM/YYYY-MM-DD/03_papers.json",
        "./reports/YYYY-MM/YYYY-MM-DD/04_code.json"
      ],
      "output_to": "./reports/YYYY-MM/YYYY-MM-DD/YYYY-MM-DD_Report.md"
    }
  }
}
```

**日报模板** (`YYYY-MM-DD_Report.md`)
- 今日摘要：一句话总结最重要趋势
- 工业界·风向标：精选工业动态，含技术解析
- 学术界·前沿：高潜力论文，含工业潜力评分
- 开源界·工具箱：值得关注的项目
- 每日学习建议：针对端到端工程师的具体建议

## 故障排除

### 常见问题
1. **目录不存在错误**：Agent会自动创建所需目录（`mkdir -p`）
2. **JSON解析错误**：确保输出符合指定字段格式
3. **搜索结果为空**：尝试扩展时间范围或调整关键词
4. **执行超时**：系统有重试机制和降级处理

### 调试步骤
1. 检查执行计划：`cat reports/YYYY-MM/YYYY-MM-DD/01_plan.json`
2. 查看中间结果：`cat reports/YYYY-MM/YYYY-MM-DD/02_industry.json`
3. 验证文件完整性：确保所有必需的JSON文件存在且非空
4. 检查时间戳：确认数据在有效时间范围内

## 扩展指南

### 添加新智能体
1. 在`agents_system/`目录创建新的`.md`文件
2. 定义角色职责、关注目标、执行指令
3. 指定输出格式（必须为JSON）和存储路径
4. 在`autointel_dispatcher.md`中添加调度逻辑
5. 更新`Chief_Analyst`的输入源处理逻辑

### 修改现有智能体
1. 编辑对应的`.md`文件更新指令
2. 调整关注目标或质量要求
3. 保持输出格式向后兼容
4. 测试执行流程是否正常

### 调整工作流
1. 修改`autointel_dispatcher.md`中的任务依赖关系
2. 调整并行/串行执行策略
3. 更新执行计划模板中的字段
4. 确保所有智能体能正确处理新的依赖关系