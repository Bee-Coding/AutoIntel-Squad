# AutoIntel-Squad 通用输出格式标准

## 基础输出结构

所有Agent输出必须遵循以下基础JSON结构：

```json
[
  {
    "source": "数据源类型",
    "metadata": {
      "timestamp": "ISO 8601时间戳",
      "data_source": "信息来源类型",
      "access_status": "访问状态",
      "quality_score": "质量评分",
      "quality_grade": "质量评级"
    },
    "content": {
      // 具体内容字段，根据数据类型变化
    },
    "validation": {
      "url_verified": true/false,
      "date_verified": true/false,
      "cross_check": true/false,
      "issues": ["问题描述1", "问题描述2"]
    }
  }
]
```

## 字段定义标准

### 1. 顶层字段
- **source** (字符串)：数据源类型标识
  - `"Industry"` - 工业界动态
  - `"Academic"` - 学术论文  
  - `"OpenSource"` - 开源项目
  - `"Analysis"` - 分析报告
- **metadata** (对象)：元数据信息
- **content** (对象)：具体内容数据
- **validation** (对象)：验证信息

### 2. 元数据字段 (metadata)
- **timestamp** (字符串)：ISO 8601格式时间戳，如 `"2026-01-26T15:18:14Z"`
- **data_source** (字符串)：信息来源类型
  - `"official"` - 官方渠道
  - `"authoritative_media"` - 权威媒体
  - `"backup_media"` - 备用媒体
- **access_status** (字符串)：访问状态
  - `"success"` - 完全成功访问
  - `"partial"` - 部分成功（如部分内容受限）
  - `"restricted"` - 访问受限
  - `"timeout"` - 访问超时
- **quality_score** (数字)：质量评分，0-100分
- **quality_grade** (字符串)：质量评级
  - `"A"` - ≥85分，高质量
  - `"B"` - 70-84分，中等质量  
  - `"C"` - 55-69分，低质量
  - `"D"` - <55分，不推荐使用
- **module_loading** (对象，可选)：模块加载状态信息
  - **profile** (字符串)：Profile模块加载状态 `"success"|"fallback_inline"|"fallback_hardcoded"|"failed"`
  - **rules** (字符串)：Rules模块加载状态 `"success"|"fallback_inline"|"fallback_hardcoded"|"failed"`
  - **workflow** (字符串)：Workflow模块加载状态 `"success"|"fallback_inline"|"fallback_hardcoded"|"failed"`
  - **output_format** (字符串)：Output格式模块加载状态 `"success"|"fallback_inline"|"fallback_hardcoded"|"failed"`
  - **issues** (数组)：模块加载问题描述列表
  - **strategy_used** (字符串)：最终使用的加载策略 `"exact_path"|"alternate_path"|"inline_fallback"|"hardcoded"`

### 3. 验证字段 (validation)
- **url_verified** (布尔)：URL验证状态
- **date_verified** (布尔)：日期验证状态
- **cross_check** (布尔)：交叉验证状态
- **issues** (数组)：问题描述列表

## 数据类型特定格式

### Industry_Watcher 输出格式
```json
{
  "source": "Industry",
  "metadata": {
    "timestamp": "2026-01-26T15:18:14Z",
    "data_source": "authoritative_media",
    "access_status": "success",
    "quality_score": 85,
    "quality_grade": "A",
    "module_loading": {
      "profile": "success",
      "rules": "success",
      "workflow": "success",
      "output_format": "success",
      "issues": [],
      "strategy_used": "exact_path"
    }
  },
  "content": {
    "company": "公司名",
    "title": "新闻/更新标题",
    "url": "真实来源链接",
    "publish_date": "YYYY-MM-DD",
    "technical_points": ["技术点1", "技术点2"],
    "raw_content": "新闻摘要（300字以内）",
    "search_keywords": ["搜索关键词1", "搜索关键词2"],
    "version_info": "版本信息（如有）",
    "event_type": "事件类型（OTA/发布会/技术博客等）"
  },
  "validation": {
    "url_verified": true,
    "date_verified": true,
    "cross_check": true,
    "issues": []
  }
}
```

### Paper_Hunter 输出格式
```json
{
  "source": "Academic",
  "metadata": {
    "timestamp": "2026-01-26T15:18:14Z",
    "data_source": "official",
    "access_status": "success",
    "quality_score": 88,
    "quality_grade": "A"
  },
  "content": {
    "title": "论文标题",
    "authors": "作者/机构",
    "url": "PDF/ArXiv链接",
    "arxiv_id": "arXiv ID",
    "publish_date": "YYYY-MM-DD",
    "category": "论文类别（如cs.CV, cs.RO）",
    "innovation": "核心创新点（一句话概括）",
    "application_potential": "高/中/低",
    "abstract": "摘要内容（精简版）",
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "code_available": true/false,
    "conference": "会议名称（如有）",
    "citation_count": "引用量（如有）"
  },
  "validation": {
    "url_verified": true,
    "date_verified": true,
    "cross_check": false,
    "issues": []
  }
}
```

### Code_Scout 输出格式
```json
{
  "source": "OpenSource",
  "metadata": {
    "timestamp": "2026-01-26T15:18:14Z",
    "data_source": "official",
    "access_status": "success",
    "quality_score": 80,
    "quality_grade": "B"
  },
  "content": {
    "name": "项目名称",
    "full_name": "组织/项目名",
    "description": "项目描述",
    "url": "GitHub链接",
    "stars": "star数量",
    "language": "主要编程语言",
    "last_updated": "YYYY-MM-DD",
    "category": "项目类别（simulator/dataset/algorithm/tool）",
    "company": "所属公司/组织",
    "tech_stack": ["技术栈1", "技术栈2"],
    "key_features": ["核心功能1", "核心功能2"],
    "difficulty_level": "beginner/intermediate/advanced/expert",
    "relevance_score": "相关性评分（0-100）",
    "innovation_points": ["创新点1", "创新点2"],
    "application_value": "应用价值描述"
  },
  "validation": {
    "url_verified": true,
    "date_verified": true,
    "cross_check": false,
    "issues": []
  }
}
```

### Chief_Analyst 输出格式
```json
{
  "source": "Analysis",
  "metadata": {
    "timestamp": "2026-01-26T15:18:14Z",
    "data_source": "analysis",
    "access_status": "success",
    "quality_score": 90,
    "quality_grade": "A"
  },
  "content": {
    "report_type": "日报/周报/月报",
    "report_date": "YYYY-MM-DD",
    "sections": {
      "industry": "工业界分析内容",
      "academic": "学术界分析内容",
      "opensource": "开源界分析内容",
      "topic_evolution": "话题演进分析",
      "review_reflection": "回顾与反思",
      "learning_suggestions": "学习建议",
      "optimization_suggestions": "系统优化建议"
    },
    "topic_history_updates": [
      {
        "topic_id": "话题ID",
        "topic_name": "话题名称",
        "version": "版本号",
        "update_type": "新增/更新/延续"
      }
    ],
    "quality_assessment": {
      "relevance": 9,
      "technical_depth": 8,
      "practicality": 7,
      "timeliness": 9,
      "coverage": 8,
      "overall_score": 8.2
    }
  },
  "validation": {
    "url_verified": true,
    "date_verified": true,
    "cross_check": true,
    "issues": []
  }
}
```

## 输出文件命名规范

### 标准命名模式
```
./reports/{YYYY-MM}/{YYYY-MM-DD}/{文件编号}_{类型}.{扩展名}
```

### 文件编号与类型映射
- `01_plan.json` - 执行计划
- `02_industry.json` - 工业动态
- `03_papers.json` - 学术论文
- `04_code.json` - 开源项目
- `05_optimization.json` - 系统优化建议
- `{YYYY-MM-DD}_Report.md` - 完整日报

### 目录结构示例
```
reports/
├── 2026-01/
│   ├── 2026-01-26/
│   │   ├── 01_plan.json
│   │   ├── 02_industry.json
│   │   ├── 03_papers.json
│   │   ├── 04_code.json
│   │   ├── 05_optimization.json
│   │   └── 2026-01-26_Report.md
│   └── topic_history/
│       ├── index.json
│       └── 2026-01.json
```

## 编码与格式要求

### 编码标准
- **字符编码**：UTF-8
- **换行符**：LF (Unix风格)
- **BOM**：禁止使用BOM

### JSON格式要求
- **缩进**：2个空格（禁止使用Tab）
- **引号**：双引号
- **逗号**：不允许尾部逗号
- **排序**：字段按上述定义顺序排列
- **空值**：使用`null`而不是空字符串

### 内容长度限制
- **标题**：不超过200字符
- **摘要**：不超过300字符
- **技术点**：每个不超过50字符，总数不超过5个
- **关键词**：每个不超过30字符，总数不超过5个

## 验证规则

### 必需字段验证
每种输出类型必须包含以下必需字段：

| 类型 | 必需字段 |
|------|----------|
| Industry | company, title, url, publish_date |
| Academic | title, authors, url, arxiv_id, publish_date |
| OpenSource | name, full_name, url, last_updated |
| Analysis | report_type, report_date, sections |

### 数据质量验证
1. **URL验证**：必须为有效HTTP/HTTPS链接
2. **日期验证**：必须为YYYY-MM-DD格式有效日期
3. **评分验证**：quality_score必须在0-100范围内
4. **评级验证**：quality_grade必须为A/B/C/D之一

### 完整性检查
- JSON必须可解析（通过`jq empty`验证）
- 必需字段不能为null或空字符串
- 数组字段不能为null，可以为空数组[]
- 对象字段不能为null，可以为空对象{}

## 错误输出格式

### 空结果输出
```json
[]
```

### 错误输出（仅用于调试）
```json
[
  {
    "source": "Error",
    "metadata": {
      "timestamp": "2026-01-26T15:18:14Z",
      "data_source": "error",
      "access_status": "failed",
      "quality_score": 0,
      "quality_grade": "D"
    },
    "content": {
      "error_type": "错误类型",
      "error_message": "错误描述",
      "recovery_action": "恢复措施",
      "partial_data": "部分获取的数据（如有）"
    },
    "validation": {
      "url_verified": false,
      "date_verified": false,
      "cross_check": false,
      "issues": ["具体问题描述"]
    }
  }
]
```

## 引用方式
在Agent提示词中使用以下格式引用本输出标准：
```
## 输出格式
请遵循AutoIntel-Squad通用输出格式标准，完整格式参见：`agents_system/common/common_output.md`

输出要求：标准JSON结构、必需字段完整、数据验证通过、文件保存正确
```