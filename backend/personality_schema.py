"""
ThinkForge — Personality Schema
================================
定义性格向量（TraitVector）和相关请求/响应数据结构。
"""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 核心性格向量
# ---------------------------------------------------------------------------

class TraitVector(BaseModel):
    """
    8维性格向量，每个维度值域 [0.0, 1.0]。
    0.5 = 未知/中性，越偏离0.5代表该维度越明确。

    星球映射关系（供前端参考）：
        sensation_seeking   -> 火山/温泉地貌 vs 平原草地
        extraversion        -> 向阳面积 vs 洞穴/山谷面积
        intuitive           -> 有机曲线地形 vs 几何规则建筑
        creativity          -> 彩色奇异地貌 vs 标准地貌
        emotional_depth     -> 河流/湖泊密度
        memory_strength     -> 城墙/峡谷深度
        language_sensitivity-> 石碑/图书馆 vs 露天剧场/音符植物
        independence        -> 独立灯塔/孤岛 vs 城市聚落
    """
    sensation_seeking:    float = Field(0.5, ge=0.0, le=1.0)
    extraversion:         float = Field(0.5, ge=0.0, le=1.0)
    intuitive:            float = Field(0.5, ge=0.0, le=1.0)
    creativity:           float = Field(0.5, ge=0.0, le=1.0)
    emotional_depth:      float = Field(0.5, ge=0.0, le=1.0)
    memory_strength:      float = Field(0.5, ge=0.0, le=1.0)
    language_sensitivity: float = Field(0.5, ge=0.0, le=1.0)
    independence:         float = Field(0.5, ge=0.0, le=1.0)

    def apply_deltas(self, deltas: Dict[str, float]) -> TraitVector:
        data = self.model_dump()
        for key, delta in deltas.items():
            if key in data:
                current = data[key]
                damping = 1.0 - abs(current - 0.5) * 0.8
                data[key] = max(0.0, min(1.0, current + delta * damping))
        return TraitVector(**data)


# ---------------------------------------------------------------------------
# 共享子模型（先定义，避免 forward reference 问题）
# ---------------------------------------------------------------------------

class QAPair(BaseModel):
    question: str
    answer: str


class PlanetChange(BaseModel):
    feature: str = Field(description="地貌特征名称，例如'火山温泉'")
    change: str = Field(description="变化描述，例如'面积扩大'")


# ---------------------------------------------------------------------------
# 问题生成
# ---------------------------------------------------------------------------

class QuestionRequest(BaseModel):
    traits: TraitVector = Field(default_factory=TraitVector)
    history: List[QAPair] = Field(default_factory=list)
    phase: int = Field(default=1, ge=1, le=3)
    arena_event: Optional[str] = Field(default=None)


class QuestionResponse(BaseModel):
    question: str
    dimension_focus: str
    hint: str
    options: Optional[List[str]] = Field(
        default=None,
        description="快速选项（Phase 1 轻松问题才有，2-4个）。None 表示开放输入。",
    )


# ---------------------------------------------------------------------------
# 用户画像
# ---------------------------------------------------------------------------

class SummaryRequest(BaseModel):
    traits: TraitVector = Field(default_factory=TraitVector)
    history: List[QAPair] = Field(default_factory=list)


class PortraitDimension(BaseModel):
    title: str = Field(description="维度标题，如'情感世界'")
    content: str = Field(description="2-3句具体描述")


class SummaryResponse(BaseModel):
    title: str = Field(description="诗意的人物标题，如'在喧嚣中听见自己的人'")
    core: str = Field(description="核心人格一句话描述")
    dimensions: List[PortraitDimension] = Field(description="4个维度的深度分析")
    blind_spot: str = Field(description="用户可能未意识到的内在矛盾或盲区")
    message: str = Field(description="一句温柔的寄语")


# ---------------------------------------------------------------------------
# 回答解析
# ---------------------------------------------------------------------------

class AnswerRequest(BaseModel):
    question: str
    answer: str
    current_traits: TraitVector = Field(default_factory=TraitVector)


class AnswerResponse(BaseModel):
    updated_traits: TraitVector
    trait_deltas: Dict[str, float]
    planet_changes: List[PlanetChange]
    insight: str
    follow_up: Optional[str] = Field(
        default=None,
        description="深度追问——当回答触及情感深处时，一句穿透力更强的追问；否则 null",
    )
