"""
ThinkForge — Claude API Client
================================
封装所有和 Claude 交互的逻辑，保持路由层干净。

设计原则：
- 所有 prompt 集中在这个文件，方便迭代优化
- 使用 structured output（让 Claude 返回 JSON），避免正则解析的脆弱性
- 每个函数职责单一：generate_question / extract_traits
"""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, List

import anthropic

from personality_schema import (
    PlanetChange,
    PortraitDimension,
    QAPair,
    QuestionResponse,
    SummaryResponse,
    TraitVector,
)

logger = logging.getLogger("thinkforge.claude")

# 全局 client（单例），FastAPI 启动时初始化一次
_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY 未设置，请检查 .env 文件")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# Prompt 模板
# ---------------------------------------------------------------------------

_PHASE_INSTRUCTIONS = {
    1: """【阶段1：表层探索，0-20题】
问题要轻松日常，像朋友初次认识时的闲聊。
例如：你听歌更注重歌词还是旋律？你喜欢计划好的旅行还是说走就走？
避免任何沉重或哲学性的话题。""",

    2: """【阶段2：深层探索，21-50题】
用户已经对你有一定信任，可以问更内省的问题了。
例如：你有没有一件事，做了很久才发现其实是为了别人？你记仇吗，还是很容易原谅？
可以触及情感、过去的经历、价值观，但不要让人觉得被审问。""",

    3: """【阶段3：精微探索，51+题】
你已经很了解这个人了，现在问那些只有真正熟悉一个人才会问的问题。
例如：你有没有一种情绪，你很难找到准确的词来描述它？你觉得自己现在和五年前最大的不同是什么？
问题可以很具体、很私人，像是在帮用户发现自己都没意识到的东西。"""
}

_QUESTION_SYSTEM = """\
你是一个温柔好奇的陌生人，正在通过轻松的对话了解用户是什么样的人。
你的问题要像朋友之间随口聊天，不能像心理测试题。
问题要简短（15字以内），口语化，有一点点哲学感。

你必须以 JSON 格式回复，不要输出 JSON 以外的任何内容。结构如下：

阶段1（轻松日常问题）示例：
{"question":"你听歌会更注重歌词还是旋律？","dimension_focus":"language_sensitivity","hint":"关于音乐","options":["歌词更重要","旋律更重要","两者都看重"]}

阶段2或阶段3（深层/精微问题）示例：
{"question":"你有没有一件事做了很久才发现其实是为了别人？","dimension_focus":"independence","hint":"关于动机","options":null}

options 规则：
- 阶段1的轻松问题：提供2-4个选项，每个选项不超过8字，可含一个"说不准"之类的兜底选项
- 阶段2和阶段3：options 必须是 null，强制用户自由表达
- 如果问题本身是开放性的，options 也设为 null
"""

_QUESTION_USER_TMPL = """\
用户目前的性格向量（0.5=未知，越偏离越明确）：
{traits_json}

历史问答（不要重复相似主题）：
{history_text}

{phase_instruction}

{arena_instruction}

请生成下一个问题，优先探索当前最模糊（最接近0.5）的维度。
"""


_EXTRACT_SYSTEM = """\
你是一个善于从只言片语中理解人的分析师。
根据用户对问题的回答，判断它揭示了哪些性格倾向，并量化为delta值。

性格维度说明：
- sensation_seeking: 刺激偏好（爱辣/极限运动/刺激 → 正值）
- extraversion: 外向程度（喜欢社交/热闹 → 正值）
- intuitive: 感性/直觉（靠感觉做决定 → 正值，靠分析 → 负值）
- creativity: 创造力（喜欢新奇/不按常规 → 正值）
- emotional_depth: 情感深度（重视情感/容易动情 → 正值）
- memory_strength: 记忆执念（记仇/念旧/记性好 → 正值）
- language_sensitivity: 语言敏感（重歌词/喜欢阅读/文字敏感 → 正值）
- independence: 独立性（喜欢自己解决/不依赖他人 → 正值）

规则：
- delta 范围 [-0.2, 0.2]，不要用极端值
- 只改变明确被回答暗示的维度，不要猜测无关维度
- planet_changes 要具体、诗意，像是星球地貌变化的旁观描述
- insight 是一句话，有点文学性，描述这个人的某种特质

你必须以 JSON 格式回复，结构如下：
{
  "deltas": {
    "维度名": delta值,
    ...
  },
  "planet_changes": [
    {"feature": "地貌特征", "change": "变化描述"},
    ...
  ],
  "insight": "一句诗意的旁白"
}
"""

_EXTRACT_USER_TMPL = """\
问题：{question}
用户回答：{answer}

请分析这个回答揭示的性格倾向。
"""


# ---------------------------------------------------------------------------
# 公开函数
# ---------------------------------------------------------------------------

USE_MOCK = os.getenv("USE_MOCK", "false").lower() == "true"


def _strip_markdown_json(text: str) -> str:
    """
    从 Claude 的回复中提取 JSON 对象。
    处理以下情况：
    - JSON 被包在 ```json ... ``` 里
    - JSON 后面跟着多余的说明文字（Extra data 错误的来源）
    - JSON 前面有前言文字
    用括号深度匹配，精确截取第一个完整的 { ... } 块。
    """
    text = text.strip()
    # 先剥掉 markdown 代码块
    if text.startswith("```"):
        lines = text.split("\n")
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        text = "\n".join(inner).strip()

    # 用括号深度匹配，找到第一个完整 JSON 对象
    start = text.find("{")
    if start == -1:
        return text  # 没有 {，原样返回让上层抛错
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return text[start:]  # 括号不匹配时尽量返回

MOCK_QUESTIONS = [
    QuestionResponse(
        question="你听歌会更注重歌词还是旋律？",
        dimension_focus="language_sensitivity",
        hint="关于音乐",
        options=["歌词更重要", "旋律更重要", "两者都看重"],
    ),
    QuestionResponse(
        question="旅行你喜欢提前规划好，还是到了再说？",
        dimension_focus="intuitive",
        hint="关于决策",
        options=["提前规划好", "到了再说", "大方向规划，细节随缘"],
    ),
    QuestionResponse(
        question="遇到难题，你会先自己想还是先找人聊？",
        dimension_focus="independence",
        hint="关于思考",
        options=["先自己消化", "马上找人聊", "看情况"],
    ),
    QuestionResponse(
        question="你更喜欢热闹的聚会还是安静的独处？",
        dimension_focus="extraversion",
        hint="关于社交",
        options=["热闹聚会", "安静独处", "都喜欢"],
    ),
    QuestionResponse(
        question="你会记很久以前别人对你说过的话吗？",
        dimension_focus="memory_strength",
        hint="关于记忆",
        options=["记得很清楚", "很快忘掉", "只记重要的"],
    ),
]

MOCK_ANSWER_RESPONSE = {
    "deltas": {"sensation_seeking": 0.12, "language_sensitivity": 0.08},
    "planet_changes": [
        {"feature": "音符森林", "change": "在星球西侧悄悄长出了第一片"},
        {"feature": "共鸣石碑", "change": "从地面缓缓升起"},
    ],
    "insight": "你的星球开始有了声音——不是噪音，是某种只有你听得懂的语言。",
}


def generate_question(
    traits: TraitVector,
    history: List[QAPair],
    phase: int = 1,
    arena_event: str | None = None,
) -> QuestionResponse:
    """
    根据当前性格向量、历史和阶段，生成下一个探索性问题。
    """
    history_text = (
        "\n".join(f"Q: {p.question}\nA: {p.answer}" for p in history[-5:])
        if history
        else "（暂无历史）"
    )

    arena_instruction = ""
    if arena_event:
        arena_instruction = f"【特殊触发】用户刚刚在思维道场中经历了：{arena_event}。请围绕这个经历生成一个关联的性格探索问题。"

    user_msg = _QUESTION_USER_TMPL.format(
        traits_json=json.dumps(traits.model_dump(), ensure_ascii=False, indent=2),
        history_text=history_text,
        phase_instruction=_PHASE_INSTRUCTIONS.get(phase, _PHASE_INSTRUCTIONS[1]),
        arena_instruction=arena_instruction,
    )

    logger.info("generate_question called | history_len=%d | phase=%d | mock=%s", len(history), phase, USE_MOCK)

    if USE_MOCK:
        return MOCK_QUESTIONS[len(history) % len(MOCK_QUESTIONS)]

    message = get_client().messages.create(
        model="claude-opus-4-6",
        max_tokens=256,
        system=_QUESTION_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = message.content[0].text.strip()
    logger.debug("generate_question raw response: %s", raw)
    raw = _strip_markdown_json(raw)

    data = json.loads(raw)
    # options 可能是 null 或缺失，统一处理为 None
    if not data.get("options"):
        data["options"] = None
    return QuestionResponse(**data)


def extract_traits(
    question: str,
    answer: str,
    current_traits: TraitVector,
) -> tuple[TraitVector, Dict[str, float], List[PlanetChange], str]:
    """
    从用户回答中提取性格变化，返回：
    - 更新后的 TraitVector
    - 原始 deltas（调试用）
    - 星球变化列表
    - insight 旁白
    """
    user_msg = _EXTRACT_USER_TMPL.format(question=question, answer=answer)

    logger.info("extract_traits called | question=%s | mock=%s", question[:40], USE_MOCK)

    if USE_MOCK:
        data = MOCK_ANSWER_RESPONSE
        deltas = data["deltas"]
        planet_changes = [PlanetChange(**c) for c in data["planet_changes"]]
        insight = data["insight"]
        updated_traits = current_traits.apply_deltas(deltas)
        return updated_traits, deltas, planet_changes, insight

    message = get_client().messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        system=_EXTRACT_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = message.content[0].text.strip()
    logger.debug("extract_traits raw response: %s", raw)
    raw = _strip_markdown_json(raw)

    data = json.loads(raw)
    deltas: Dict[str, float] = data.get("deltas", {})
    planet_changes = [PlanetChange(**c) for c in data.get("planet_changes", [])]
    insight: str = data.get("insight", "")

    updated_traits = current_traits.apply_deltas(deltas)

    return updated_traits, deltas, planet_changes, insight


# ---------------------------------------------------------------------------
# 思维道场：论点多角度分析
# ---------------------------------------------------------------------------

_ANALYZE_SYSTEM = """\
你是一位苏格拉底式批判性思维导师，擅长从多个角度剖析论点。
用户会提出一个论点或观点，你需要：
1. 给出中性的论点摘要（不带立场）
2. 提出最强的反驳（counter）：找出论点的逻辑漏洞或反例
3. 给出支撑论据（support）：找到真实可引用的支持依据
4. 提出苏格拉底式追问（socratic）：挑战论点最深层的假设前提

风格要求：
- 言简意赅，每条2-3句话
- 不要说废话或者"这是个好问题"
- counter 要锐利，真正击中要害
- socratic 要让人停下来重新思考

你必须以 JSON 格式回复，结构如下：
{
  "summary": "对论点的中性摘要（1-2句话）",
  "perspectives": [
    {
      "type": "counter",
      "title": "最强反驳",
      "content": "..."
    },
    {
      "type": "support",
      "title": "支撑论据",
      "content": "..."
    },
    {
      "type": "socratic",
      "title": "苏格拉底追问",
      "content": "..."
    }
  ],
  "arena_event": "一句话描述这次思维训练的核心收获，用于用户星球联动，例如：在辩论「XXX」时深刻感受到YYY"
}
"""

_ANALYZE_USER_TMPL = """\
{context_block}论点：{argument}

请从三个角度分析这个论点。
"""

MOCK_ANALYZE_RESPONSE = {
    "summary": "这个论点主张科技进步总体上改善了人类生活质量，依赖于进步等于改善的隐含前提。",
    "perspectives": [
        {
            "type": "counter",
            "title": "最强反驳",
            "content": "技术进步在提升部分人生活质量的同时，也加剧了数字鸿沟与社会不平等。享受科技红利的往往是富裕群体，边缘群体不仅被排除在外，还面临算法歧视和工作被自动化取代的双重压力。"
        },
        {
            "type": "support",
            "title": "支撑论据",
            "content": "全球极端贫困率从1990年的36%降至2023年的约9%，疫苗技术使儿童死亡率下降超过50%，清洁能源技术正在减缓气候危机。这些都是科技进步改善生活质量的有力佐证。"
        },
        {
            "type": "socratic",
            "title": "苏格拉底追问",
            "content": "当我们说「改善」时，谁的生活质量是衡量标准？如果某些文化的传统生活方式因技术冲击而消失，这算改善还是损失？「进步」这个词本身是否已经预设了一个我们从未质疑的价值判断？"
        }
    ],
    "arena_event": "在分析「科技进步改善生活」这一论点时，意识到「进步」本身就是一个需要被质疑的价值预设"
}


def analyze_argument(
    argument: str,
    context: str | None = None,
) -> dict:
    """
    多角度分析用户论点，返回原始 dict（方便 main.py 直接构造响应）。
    包含 summary、perspectives 列表、arena_event。
    """
    context_block = f"背景信息：{context}\n\n" if context else ""
    user_msg = _ANALYZE_USER_TMPL.format(
        context_block=context_block,
        argument=argument,
    )

    logger.info("analyze_argument called | len=%d | mock=%s", len(argument), USE_MOCK)

    if USE_MOCK:
        return MOCK_ANALYZE_RESPONSE

    message = get_client().messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=_ANALYZE_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = message.content[0].text.strip()
    logger.debug("analyze_argument raw response: %s", raw)
    raw = _strip_markdown_json(raw)

    return json.loads(raw)


# ---------------------------------------------------------------------------
# 用户画像生成
# ---------------------------------------------------------------------------

_SUMMARY_SYSTEM = """\
你是一位善于洞察人心的观察者，能从只言片语中准确描绘一个人的内心世界。
你将根据用户的性格向量数据和真实问答记录，生成一份深刻、温柔、诗意的人物画像。

要求：
- 用第二人称（你），像在和用户说悄悄话
- 具体：尽量引用或影射用户实际回答的内容，而不是泛泛而谈
- 文学性：语言要有温度，不要像报告，像一封写给用户的信
- 真实：盲区和矛盾要说到点上，不要只说好话
- 寄语：温柔而有力，不说废话

你必须以 JSON 格式回复，不要输出 JSON 以外的任何内容：
{"title":"诗意的人物标题（10字以内）","core":"核心人格一句话（20字以内）","dimensions":[{"title":"情感世界","content":"2-3句具体描述"},{"title":"思维方式","content":"2-3句具体描述"},{"title":"社交模式","content":"2-3句具体描述"},{"title":"内在动力","content":"2-3句具体描述"}],"blind_spot":"盲区描述（2-3句，要敢于指出矛盾）","message":"一句寄语（15字以内）"}
"""

_SUMMARY_USER_TMPL = """\
性格向量（0.5=未知，越偏离越明确）：
{traits_json}

问答记录（按时间顺序，共{count}条）：
{history_text}

请为这个人生成一份人物画像。
"""

MOCK_SUMMARY_RESPONSE = SummaryResponse(
    title="在噪音中听见自己的人",
    core="你用感性感知世界，用理性保护自己",
    dimensions=[
        PortraitDimension(title="情感世界", content="你的情感不是河流，是地下水——安静地流动，不容易被看见，但真实地滋养着你脚下的一切。你很少主动展示自己的脆弱，却对别人的细微情绪异常敏感。"),
        PortraitDimension(title="思维方式", content="你有直觉，但你不完全相信它。你会在感觉到答案之后再用逻辑验证一遍，有时候这让你更准确，有时候这让你失去了第一个念头里最珍贵的东西。"),
        PortraitDimension(title="社交模式", content="热闹的场合你能应付，但真正让你充电的是一个人的时间。你需要一些空间来处理白天吸收的一切，否则你会开始感到某种说不清楚的疲惫。"),
        PortraitDimension(title="内在动力", content="你对「意义」的渴望超过对「成功」的渴望。做一件没有意义的事，即使它能带来回报，你也很难长久坚持。"),
    ],
    blind_spot="你可能花了很多时间理解别人，却很少用同样的耐心理解自己。你对自己的要求有时候比对别人严苛得多，但你不一定承认这一点。",
    message="你已经很好了，只是还没发现。",
)


def generate_summary(
    traits: TraitVector,
    history: List[QAPair],
) -> SummaryResponse:
    """
    根据性格向量和完整问答历史，生成用户人物画像。
    """
    history_text = "\n".join(
        f"Q: {p.question}\nA: {p.answer}"
        for p in history[-30:]   # 最多取最近30条，避免 token 过长
    ) if history else "（暂无历史）"

    user_msg = _SUMMARY_USER_TMPL.format(
        traits_json=json.dumps(traits.model_dump(), ensure_ascii=False, indent=2),
        count=len(history),
        history_text=history_text,
    )

    logger.info("generate_summary called | history_len=%d | mock=%s", len(history), USE_MOCK)

    if USE_MOCK:
        return MOCK_SUMMARY_RESPONSE

    message = get_client().messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        system=_SUMMARY_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = message.content[0].text.strip()
    logger.debug("generate_summary raw response: %s", raw)
    raw = _strip_markdown_json(raw)

    data = json.loads(raw)
    dimensions = [PortraitDimension(**d) for d in data.get("dimensions", [])]
    return SummaryResponse(
        title=data["title"],
        core=data["core"],
        dimensions=dimensions,
        blind_spot=data["blind_spot"],
        message=data["message"],
    )
