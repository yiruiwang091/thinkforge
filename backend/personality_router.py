"""
ThinkForge — Personality Router
================================
处理宠物星球功能的两个核心端点：
  POST /pet/question  — 获取下一个性格探索问题
  POST /pet/answer    — 提交回答，获取性格变化 + 星球更新

错误处理策略：
- Claude 返回非 JSON → 500，附带原始响应供调试
- API Key 未设置 → 500，明确提示
- 用户输入过长 → 422（Pydantic 自动处理）
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from claude_client import extract_traits, generate_question, generate_summary
from personality_schema import (
    AnswerRequest,
    AnswerResponse,
    QuestionRequest,
    QuestionResponse,
    SummaryRequest,
    SummaryResponse,
)

logger = logging.getLogger("thinkforge.pet")

router = APIRouter(prefix="/pet", tags=["pet"])


@router.post("/question", response_model=QuestionResponse)
def get_next_question(payload: QuestionRequest) -> QuestionResponse:
    """
    根据当前性格向量生成下一个探索性问题。

    前端应当在本地维护 TraitVector 和历史，每次问题都传过来。
    这样后端是无状态的，方便扩展和测试。
    """
    try:
        result = generate_question(
            traits=payload.traits,
            history=payload.history,
            phase=payload.phase,
            arena_event=payload.arena_event,
        )
        logger.info("question generated | dimension=%s", result.dimension_focus)
        return result

    except ValueError as e:
        # Claude 返回了无法解析的 JSON
        logger.error("question generation parse error: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Claude 返回格式异常，请重试：{str(e)}",
        )
    except RuntimeError as e:
        # API Key 未设置等配置问题
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/answer", response_model=AnswerResponse)
def submit_answer(payload: AnswerRequest) -> AnswerResponse:
    """
    用户提交一个回答后，Claude 解析性格变化并返回星球更新。

    返回：
    - updated_traits: 更新后的完整性格向量
    - trait_deltas: 这次回答带来的变化量（供调试/动画用）
    - planet_changes: 星球上新生长的地貌列表
    - insight: 一句诗意旁白，展示在 UI 上
    """
    if not payload.answer.strip():
        raise HTTPException(status_code=400, detail="回答不能为空")

    try:
        updated_traits, deltas, planet_changes, insight, follow_up = extract_traits(
            question=payload.question,
            answer=payload.answer,
            current_traits=payload.current_traits,
        )

        logger.info(
            "answer processed | deltas=%s | changes=%d | follow_up=%s",
            list(deltas.keys()),
            len(planet_changes),
            bool(follow_up),
        )

        return AnswerResponse(
            updated_traits=updated_traits,
            trait_deltas=deltas,
            planet_changes=planet_changes,
            insight=insight,
            follow_up=follow_up,
        )

    except ValueError as e:
        logger.error("answer extraction parse error: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Claude 返回格式异常，请重试：{str(e)}",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary", response_model=SummaryResponse)
def get_summary(payload: SummaryRequest) -> SummaryResponse:
    """
    根据性格向量 + 完整问答历史，生成用户人物画像。
    包含：诗意标题、核心人格、四维度分析、盲区、寄语。
    """
    if len(payload.history) < 3:
        raise HTTPException(status_code=400, detail="至少需要回答 3 个问题才能生成画像")

    try:
        result = generate_summary(
            traits=payload.traits,
            history=payload.history,
        )
        logger.info("summary generated | history_len=%d | title=%s", len(payload.history), result.title)
        return result

    except ValueError as e:
        logger.error("summary parse error: %s", e)
        raise HTTPException(status_code=500, detail=f"Claude 返回格式异常，请重试：{str(e)}")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
