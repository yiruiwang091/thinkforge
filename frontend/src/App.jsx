import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'

/**
 * ThinkForge — App.jsx
 * ----------------------
 * 结构：
 *   App            — 顶层，管理 Supabase Auth 状态
 *   AuthModal      — 登录 / 注册表单
 *   PlanetTab      — 星球探索（云端同步）
 *   ArenaTab       — 思维道场（Claude 多角度分析）
 *   PlanetVisual   — Canvas 星球动画
 *   TraitDebugPanel— 性格向量调试面板
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

const INITIAL_TRAITS = {
  sensation_seeking:    0.5,
  extraversion:         0.5,
  intuitive:            0.5,
  creativity:           0.5,
  emotional_depth:      0.5,
  memory_strength:      0.5,
  language_sensitivity: 0.5,
  independence:         0.5,
}

const TRAIT_LABELS = {
  sensation_seeking:    '刺激偏好',
  extraversion:         '外向程度',
  intuitive:            '感性直觉',
  creativity:           '创造力',
  emotional_depth:      '情感深度',
  memory_strength:      '记忆执念',
  language_sensitivity: '语言敏感',
  independence:         '独立性',
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]           = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab]             = useState('planet')

  useEffect(() => {
    // 获取当前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    // 监听登录/登出事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm animate-pulse">连接星球中…</p>
      </div>
    )
  }

  if (!user) return <AuthModal />

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ThinkForge</h1>
          <p className="text-slate-400 text-sm mt-1">认识自己，锻炼思维</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-slate-600 hover:text-slate-400 mt-1.5 transition-colors"
        >
          退出
        </button>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 px-6">
        <TabBtn active={tab === 'planet'}  onClick={() => setTab('planet')}  label="我的星球" icon="🪐" />
        <TabBtn active={tab === 'explore'} onClick={() => setTab('explore')} label="探索星球" icon="🌍" />
        <TabBtn active={tab === 'arena'}   onClick={() => setTab('arena')}   label="思维道场" icon="⚔️" />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {tab === 'planet'  && <PlanetTab user={user} onOpenExplore={() => setTab('explore')} />}
        {tab === 'explore' && <ExploreTab user={user} />}
        {tab === 'arena'   && <ArenaTab onSwitchToPlanet={() => setTab('planet')} />}
      </main>
    </div>
  )
}

// ── AuthModal ────────────────────────────────────────────────────────────────

function AuthModal() {
  const [mode, setMode]       = useState('login') // 'login' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user && !data.session) {
        // 邮件确认模式：session 还没有，等用户点确认链接
        setMessage('注册成功！请检查邮箱，点击确认链接后即可登录。')
      }
      // 若 data.session 存在，onAuthStateChange 会自动触发登录
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🪐</div>
          <h1 className="text-2xl font-bold text-white">ThinkForge</h1>
          <p className="text-slate-400 text-sm">认识自己，锻炼思维</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="邮箱地址"
            required
            autoComplete="email"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? '设置密码（至少 6 位）' : '密码'}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />

          {error   && <p className="text-red-400   text-xs px-1">{error}</p>}
          {message && <p className="text-green-400 text-xs px-1">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }}
          className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {mode === 'login' ? '没有账号？点此注册' : '已有账号？点此登录'}
        </button>
      </div>
    </div>
  )
}

// ── TabBtn ───────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-amber-400 text-amber-300'
          : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ── localStorage 工具（只用于 arenaEvent 跨 tab 通信）────────────────────────

const ARENA_EVENT_KEY = 'tf_arena_event'

function loadArenaEvent() {
  try { return JSON.parse(localStorage.getItem(ARENA_EVENT_KEY)) } catch { return null }
}
function clearArenaEvent() {
  try { localStorage.removeItem(ARENA_EVENT_KEY) } catch {}
}
function saveArenaEvent(v) {
  try { localStorage.setItem(ARENA_EVENT_KEY, JSON.stringify(v)) } catch {}
}

// ── Phase 辅助 ───────────────────────────────────────────────────────────────

function getPhase(historyLen) {
  if (historyLen <= 20) return 1
  if (historyLen <= 50) return 2
  return 3
}

const PHASE_LABELS = {
  1: { name: '表层探索', desc: '初识你的星球',               color: 'text-indigo-400' },
  2: { name: '深层探索', desc: '星球开始展现秘密',           color: 'text-violet-400' },
  3: { name: '精微感知', desc: '连星球自己都未曾发现的细节', color: 'text-amber-400'  },
}

// ── PlanetTab ────────────────────────────────────────────────────────────────

function PlanetTab({ user, onOpenExplore }) {
  const [traits, setTraits]           = useState(INITIAL_TRAITS)
  const [history, setHistory]         = useState([])
  const [currentQ, setCurrentQ]       = useState(null)
  const [answer, setAnswer]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [planetChanges, setPlanetChanges] = useState([])
  const [insight, setInsight]         = useState(null)
  const [followUp, setFollowUp]       = useState(null)   // 深度追问
  const [phase, setPhase]             = useState('loading') // loading|welcome|idle|questioning|result|dormant
  const [error, setError]             = useState(null)
  const [cloudError, setCloudError]   = useState(null)
  const [savedCount, setSavedCount]   = useState(0)
  const [showPortrait, setShowPortrait] = useState(false)   // 画像弹窗
  const textareaRef = useRef(null)

  const explorationPhase = getPhase(history.length)

  // ── 初始化：从 Supabase 加载数据，再拿第一题 ──────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      let loadedTraits  = INITIAL_TRAITS
      let loadedHistory = []

      try {
        // 1. 拉星球状态
        const { data: stateData, error: stateErr } = await supabase
          .from('planet_states')
          .select('traits, question_count, last_active')
          .eq('user_id', user.id)
          .maybeSingle()

        if (stateErr) throw stateErr

        if (stateData) {
          loadedTraits = stateData.traits

          // 2. 拉问答历史
          const { data: histData, error: histErr } = await supabase
            .from('question_history')
            .select('question, answer')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

          if (!histErr && histData) loadedHistory = histData

          // 3. 休眠检测（用云端 last_active）
          const daysSince = (Date.now() - new Date(stateData.last_active).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSince >= 7 && loadedHistory.length > 0) {
            if (!cancelled) {
              setTraits(loadedTraits)
              setHistory(loadedHistory)
              setPhase('dormant')
            }
            return
          }
        }
      } catch (e) {
        console.error('Cloud load failed:', e)
        if (!cancelled) setCloudError('云端加载失败，当前为本地模式')
      }

      if (cancelled) return
      setTraits(loadedTraits)
      setHistory(loadedHistory)

      // 4. 新用户（从未回答过任何问题）→ 欢迎页
      if (loadedHistory.length === 0) {
        setPhase('welcome')
        return
      }

      // 5. 老用户：消费道场事件，然后拿下一题
      const arenaEvent = loadArenaEvent()
      if (arenaEvent) clearArenaEvent()
      await fetchNextQuestion(loadedTraits, loadedHistory, arenaEvent)
    }

    init()
    return () => { cancelled = true }
  }, [user.id])

  // ── 保存到 Supabase（非阻塞，失败仅提示） ────────────────────────────────
  async function saveToCloud(newTraits, newHistory, latestQA) {
    try {
      await supabase.from('planet_states').upsert({
        user_id:        user.id,
        traits:         newTraits,
        question_count: newHistory.length,
        last_active:    new Date().toISOString(),
      }, { onConflict: 'user_id' })

      if (latestQA) {
        await supabase.from('question_history').insert({
          user_id:  user.id,
          question: latestQA.question,
          answer:   latestQA.answer,
        })
      }
    } catch (e) {
      console.error('Cloud save failed:', e)
      setCloudError('云端同步失败，本次数据已暂存，重试后会同步')
    }
  }

  // ── 获取下一题 ────────────────────────────────────────────────────────────
  // overrideTraits / overrideHistory：初始化时直接传刚加载的数据，
  // 避免 React state 还没刷新就发请求拿到旧值。
  async function fetchNextQuestion(overrideTraits = null, overrideHistory = null, overrideArenaEvent = undefined) {
    setLoading(true)
    setPhase('questioning')
    setInsight(null)
    setFollowUp(null)
    setError(null)

    const currentTraits  = overrideTraits   ?? traits
    const currentHistory = overrideHistory  ?? history
    const arenaEvent     = overrideArenaEvent !== undefined ? overrideArenaEvent : loadArenaEvent()
    if (arenaEvent) clearArenaEvent()

    try {
      const res = await fetch(`${API_BASE}/pet/question`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traits:      currentTraits,
          history:     currentHistory,
          phase:       getPhase(currentHistory.length),
          arena_event: arenaEvent,
        }),
      })
      if (!res.ok) throw new Error(`后端错误 ${res.status}：请确认后端已重启`)
      const data = await res.json()
      setCurrentQ(data)
      setAnswer('')
      setTimeout(() => textareaRef.current?.focus(), 100)
    } catch (e) {
      console.error(e)
      setError(e.message)
      setPhase('idle')
    } finally {
      setLoading(false)
    }
  }

  // ── 提交回答 ─────────────────────────────────────────────────────────────
  async function handleSubmitAnswer() {
    if (!answer.trim() || !currentQ) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/pet/answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question:       currentQ.question,
          answer:         answer.trim(),
          current_traits: traits,
        }),
      })
      if (!res.ok) throw new Error(`后端错误 ${res.status}`)
      const data = await res.json()
      if (!data.updated_traits) throw new Error('返回数据格式异常')

      const newTraits  = data.updated_traits
      const latestQA   = { question: currentQ.question, answer: answer.trim() }
      const newHistory = [...history, latestQA]

      setTraits(newTraits)
      setHistory(newHistory)
      setPlanetChanges(data.planet_changes ?? [])
      setInsight(data.insight ?? null)
      setFollowUp(data.follow_up ?? null)
      setPhase('result')

      // 云端保存（非阻塞）
      saveToCloud(newTraits, newHistory, latestQA)

    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── 重置星球 ──────────────────────────────────────────────────────────────
  async function handleReset() {
    if (!confirm('重置星球？所有进度将从云端永久删除。')) return
    await Promise.all([
      supabase.from('planet_states')   .delete().eq('user_id', user.id),
      supabase.from('question_history').delete().eq('user_id', user.id),
    ])
    setTraits(INITIAL_TRAITS)
    setHistory([])
    setPlanetChanges([])
    setInsight(null)
    fetchNextQuestion(INITIAL_TRAITS, [], null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // 欢迎页全屏，不受容器约束
  if (phase === 'welcome') {
    return <WelcomeScreen onStart={() => fetchNextQuestion(INITIAL_TRAITS, [], null)} />
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8 space-y-8">

      <PlanetVisual traits={traits} questionCount={history.length} latestChanges={planetChanges} onClick={onOpenExplore} />

      {cloudError && (
        <p className="text-xs text-amber-600 text-center">{cloudError}</p>
      )}

      {/* 阶段标签 + 画像入口 */}
      {history.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${PHASE_LABELS[explorationPhase].color}`}>
              {PHASE_LABELS[explorationPhase].name}
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{PHASE_LABELS[explorationPhase].desc}</span>
          </div>
          {history.length >= 5 && (
            <button
              onClick={() => setShowPortrait(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              查看画像 →
            </button>
          )}
        </div>
      )}

      {/* 画像弹窗 */}
      {showPortrait && (
        <PortraitModal
          traits={traits}
          history={history}
          onClose={() => setShowPortrait(false)}
        />
      )}

      {/* 问答区 */}
      <div className="space-y-4">

        {phase === 'loading' && (
          <p className="text-center text-slate-600 text-sm animate-pulse py-4">正在从云端同步你的星球…</p>
        )}

        {phase === 'questioning' && currentQ && (
          <div className="space-y-4">
            {/* 问题卡片 */}
            <div className="bg-slate-800 rounded-2xl p-5">
              {currentQ.hint && (
                <span className="text-xs text-amber-400 font-medium mb-2 block">{currentQ.hint}</span>
              )}
              <p className="text-lg font-medium text-white leading-relaxed">{currentQ.question}</p>
            </div>

            {/* 快速选项卡（Phase 1 才有） */}
            {currentQ.options && currentQ.options.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setAnswer(opt)
                      setTimeout(() => textareaRef.current?.focus(), 50)
                    }}
                    className={`rounded-xl px-3 py-2.5 text-sm text-left transition-all border ${
                      answer === opt
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* 文字输入区（始终可用）+ 语音按钮 */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                rows={3}
                placeholder={currentQ.options ? '或者自己说说…（可补充细节）' : '说说你的想法…'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitAnswer()
                }}
              />
              {/* 语音按钮 */}
              <div className="absolute bottom-3 right-3">
                <VoiceButton
                  onResult={transcript => setAnswer(prev =>
                    prev.trim() ? prev.trimEnd() + '，' + transcript : transcript
                  )}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={loading || !answer.trim()}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? '星球感知中…' : '提交 ↵'}
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className="space-y-4">
            {insight && (
              <InsightCard
                insight={insight}
                question={currentQ?.question}
                userId={user.id}
                onSaved={() => setSavedCount(c => c + 1)}
              />
            )}
            {followUp && (
              <FollowUpCard
                followUp={followUp}
                onAccept={() => {
                  // 把追问变成下一题，直接进入 questioning 阶段（不调后端）
                  setCurrentQ({
                    question: followUp,
                    dimension_focus: 'emotional_depth',
                    hint: '深度追问',
                    options: null,
                  })
                  setFollowUp(null)
                  setInsight(null)
                  setPlanetChanges([])
                  setAnswer('')
                  setPhase('questioning')
                  setTimeout(() => textareaRef.current?.focus(), 100)
                }}
                onSkip={() => fetchNextQuestion()}
              />
            )}
            {planetChanges.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium">星球新增</p>
                {planetChanges.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-800 rounded-xl px-4 py-3">
                    <span className="text-green-400 mt-0.5">✦</span>
                    <div>
                      <span className="text-sm font-medium text-slate-200">{c.feature}</span>
                      <span className="text-slate-400 text-sm"> — {c.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!followUp && (
              <button
                onClick={() => fetchNextQuestion()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 rounded-xl transition-colors"
              >
                继续探索 →
              </button>
            )}
          </div>
        )}

        {phase === 'idle' && (
          <button
            onClick={() => fetchNextQuestion()}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold py-3 rounded-xl transition-colors"
          >
            开始探索
          </button>
        )}

        {phase === 'dormant' && (
          <div className="space-y-4">
            <div className="border border-slate-700 bg-slate-900 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-3">🌑</p>
              <p className="text-slate-300 font-medium mb-1">你的星球已进入休眠</p>
              <p className="text-slate-500 text-sm">已超过 7 天没有探索，某些地貌开始沉睡。</p>
            </div>
            <button
              onClick={() => fetchNextQuestion()}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold py-3 rounded-xl transition-colors"
            >
              唤醒星球
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            ⚠ {error}
          </div>
        )}
      </div>

      {history.length > 0 && import.meta.env.DEV && <TraitDebugPanel traits={traits} />}

      <SavedInsightsPanel userId={user.id} refreshKey={savedCount} />

      {history.length > 0 && (
        <button
          onClick={handleReset}
          className="w-full text-xs text-slate-600 hover:text-slate-400 py-2 transition-colors"
        >
          重置星球
        </button>
      )}
    </div>
  )
}

// ── 星球可视化（Three.js 3D 程序生成星球）───────────────────────────────────

/**
 * 根据性格向量生成行星表面纹理（equirectangular map）
 * 使用多层正弦波模拟 Perlin 噪声，不依赖额外库。
 */
function buildPlanetTexture(THREE, traits, questionCount) {
  const W = 512, H = 256
  const offscreen = document.createElement('canvas')
  offscreen.width = W; offscreen.height = H
  const ctx = offscreen.getContext('2d')
  const img = ctx.createImageData(W, H)
  const d   = img.data

  const {
    sensation_seeking:    ss  = 0.5,
    emotional_depth:      ed  = 0.5,
    creativity:           cr  = 0.5,
    extraversion:         ex  = 0.5,
    intuitive:            it  = 0.5,
    memory_strength:      ms  = 0.5,
    language_sensitivity: ls  = 0.5,
    independence:         ind = 0.5,
  } = traits

  // 多倍频正弦噪声：terrain height in [-1, 1]
  const noise = (lon, lat) => {
    let h = 0
    h += Math.sin(lon * 2.3 + 1.1) * Math.cos(lat * 1.7 + 0.4) * 0.40
    h += Math.sin(lon * 5.7 + 2.8) * Math.cos(lat * 4.2 - 1.2) * 0.25
    h += Math.sin(lon * 11  + 0.3) * Math.cos(lat * 8.5 + 2.1) * 0.15
    h += Math.sin(lon * 3.1 - 0.9) * Math.cos(lat * 2.9 + 0.7) * 0.20
    // 极地压低（模拟冰盖）
    h -= Math.pow(Math.abs(lat) / (Math.PI * 0.5), 2) * 0.3
    return h
  }

  // 唤醒度：回答越多颜色越丰富
  const awaken = Math.min(1, questionCount / 25)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2   // 0..2π
      const lat = ((y / H) - 0.5) * Math.PI  // -π/2..π/2
      const h   = noise(lon, lat)

      let r, g, b

      if (h < -0.15) {
        // 深海 — emotional_depth 越高越深蓝
        const depth = Math.min(1, (-h - 0.15) / 0.6)
        r = Math.round(5  + ed * 20)
        g = Math.round(20 + ed * 35)
        b = Math.round(80 + ed * 120 + depth * 30)
      } else if (h < 0.05) {
        // 浅海/海岸
        r = Math.round(30 + it * 30)
        g = Math.round(70 + (1 - ss) * 40)
        b = Math.round(100 + ed * 60)
      } else if (h < 0.3) {
        // 平原/草地 — extraversion 越高越明亮
        r = Math.round(40  + ex * 60  + cr * 30)
        g = Math.round(80  + ex * 50  + (1 - ss) * 40)
        b = Math.round(20  + it * 40)
      } else {
        // 山地/高原
        const ht = (h - 0.3) / 0.7
        if (ss > 0.6 && ht > 0.4) {
          // 火山 — sensation_seeking 高
          r = Math.round(180 + ht * 60)
          g = Math.round(40  + ht * 20)
          b = 15
        } else if (cr > 0.6) {
          // 晶体高地 — creativity 高
          r = Math.round(100 + ht * 80)
          g = Math.round(20  + ht * 30)
          b = Math.round(150 + ht * 80)
        } else if (ms > 0.6) {
          // 古城遗迹 — memory_strength 高（灰褐色）
          r = Math.round(120 + ht * 60)
          g = Math.round(100 + ht * 45)
          b = Math.round(80  + ht * 30)
        } else {
          // 普通山脉
          r = Math.round(90  + ht * 50)
          g = Math.round(80  + ht * 45)
          b = Math.round(65  + ht * 35)
        }
      }

      // 极地冰盖 — independence 越高冰盖越小
      const poleFactor = Math.max(0, Math.abs(lat) / (Math.PI * 0.5) - (0.75 + ind * 0.15))
      if (poleFactor > 0) {
        const ice = Math.min(1, poleFactor * 5)
        r = Math.round(r + (220 - r) * ice)
        g = Math.round(g + (235 - g) * ice)
        b = Math.round(b + (255 - b) * ice)
      }

      // 语言敏感度：全球轻微增加"光晕"纹路
      if (ls > 0.6) {
        const pattern = Math.abs(Math.sin(lon * 18)) * 0.08 * (ls - 0.5)
        r = Math.min(255, Math.round(r + r * pattern))
        g = Math.min(255, Math.round(g + g * pattern))
      }

      // 唤醒效果：未回答时灰暗，越答越彩色
      if (awaken < 1) {
        const gray = r * 0.299 + g * 0.587 + b * 0.114
        r = Math.round(r * awaken + gray * (1 - awaken))
        g = Math.round(g * awaken + gray * (1 - awaken))
        b = Math.round(b * awaken + gray * (1 - awaken))
        const dark = 0.15 + awaken * 0.85
        r = Math.round(r * dark); g = Math.round(g * dark); b = Math.round(b * dark)
      }

      const i = (y * W + x) * 4
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(offscreen)
}

function PlanetVisual({ traits, questionCount, latestChanges, onClick }) {

  const mountRef = useRef(null)
  const sceneRef = useRef(null)   // { sphere, THREE, renderer }

  // ── 初始化 Three.js（只跑一次，空 deps）──────────────────────────────────
  useEffect(() => {
    let animId, renderer, cancelled = false

    import('three').then((THREE) => {
      if (cancelled || !mountRef.current) return
      const container = mountRef.current
      const S = container.clientWidth || 340

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(S, S)
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
      camera.position.set(0, 0.8, 2.6)
      camera.lookAt(0, 0, 0)

      // 星空背景
      const starPos = new Float32Array(1800)
      for (let i = 0; i < 1800; i += 3) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = 40 + Math.random() * 20
        starPos[i] = r*Math.sin(ph)*Math.cos(th); starPos[i+1] = r*Math.sin(ph)*Math.sin(th); starPos[i+2] = r*Math.cos(ph)
      }
      const starGeo = new THREE.BufferGeometry()
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff5e0, size: 0.12, transparent: true, opacity: 0.8 })))

      // 星球球体
      const geo = new THREE.SphereGeometry(1, 64, 64)
      const mat = new THREE.MeshPhongMaterial({ shininess: 18, specular: new THREE.Color(0x222244) })
      const sphere = new THREE.Mesh(geo, mat)
      scene.add(sphere)

      // 大气层
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.04, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x4466ff, transparent: true, opacity: 0.06 })
      ))

      // 光照
      scene.add(new THREE.AmbientLight(0x223355, 0.6))
      const sun = new THREE.DirectionalLight(0xffd090, 1.4)
      sun.position.set(5, 3, 4); scene.add(sun)

      // 初始纹理
      const tex = buildPlanetTexture(THREE, traits, questionCount)
      mat.map = tex; mat.needsUpdate = true

      // 存入 ref，供纹理更新 effect 使用
      sceneRef.current = { sphere, mat, THREE, renderer, scene, camera }

      // 拖拽 + 缩放
      let isDragging = false, prevX = 0, prevY = 0, velX = 0, velY = 0
      const el = renderer.domElement
      const onDown = e => { isDragging = true; prevX = e.clientX ?? e.touches?.[0]?.clientX; prevY = e.clientY ?? e.touches?.[0]?.clientY; velX = velY = 0 }
      const onMove = e => {
        if (!isDragging) return
        const cx = e.clientX ?? e.touches?.[0]?.clientX, cy = e.clientY ?? e.touches?.[0]?.clientY
        velX = (cx - prevX) * 0.005; velY = (cy - prevY) * 0.005
        sphere.rotation.y += velX
        sphere.rotation.x = Math.max(-1.2, Math.min(1.2, sphere.rotation.x + velY))
        prevX = cx; prevY = cy
      }
      const onUp = () => { isDragging = false }
      el.addEventListener('mousedown', onDown); el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseup', onUp);     el.addEventListener('mouseleave', onUp)
      el.addEventListener('touchstart', onDown, { passive: true })
      el.addEventListener('touchmove',  onMove, { passive: true })
      el.addEventListener('touchend',   onUp)
      el.addEventListener('wheel', e => {
        camera.position.z = Math.max(1.4, Math.min(5, camera.position.z + e.deltaY * 0.003))
      }, { passive: true })

      function animate() {
        animId = requestAnimationFrame(animate)
        if (!isDragging) { sphere.rotation.y += 0.0015 + velX * 0.1; velX *= 0.94; velY *= 0.94 }
        renderer.render(scene, camera)
      }
      animate()
    })

    return () => {
      cancelled = true
      if (animId) cancelAnimationFrame(animId)
      renderer?.dispose()
      try { if (mountRef.current && renderer?.domElement) mountRef.current.removeChild(renderer.domElement) } catch {}
      sceneRef.current = null
    }
  }, [])   // ← 空 deps，只初始化一次

  // ── traits / questionCount 变化时单独更新纹理 ──────────────────────────────
  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return
    const { mat, THREE } = ref
    const tex = buildPlanetTexture(THREE, traits, questionCount)
    mat.map = tex
    mat.needsUpdate = true
    tex.needsUpdate = true
  }, [JSON.stringify(traits), questionCount])

  const depthLabel = questionCount === 0
    ? '等待第一道光…'
    : questionCount <= 20 ? `已探索 ${questionCount} 题 · 地表`
    : questionCount <= 50 ? `已探索 ${questionCount} 题 · 深层`
    : `已探索 ${questionCount} 题 · 精微`

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-slate-950 group"
      style={{ aspectRatio: '1 / 1' }}
      onClick={onClick}
    >
      <div ref={mountRef} className="absolute inset-0" style={{ cursor: onClick ? 'pointer' : 'grab' }}
        onClick={e => { if (!onClick) return; e.stopPropagation() }}
      />
      <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none">
        <p className="text-xs text-slate-500">{depthLabel}</p>
        {onClick && (
          <p className="text-[10px] text-amber-400/50 group-hover:text-amber-400/80 transition-colors">
            点击进入星球 →
          </p>
        )}
      </div>
    </div>
  )
}



// ── TraitDebugPanel ──────────────────────────────────────────────────────────

// ── PortraitModal（用户画像全屏弹窗）────────────────────────────────────────

function PortraitModal({ traits, history, onClose }) {
  const [portrait, setPortrait] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [genKey, setGenKey]     = useState(0)  // 递增触发重新生成

  useEffect(() => {
    setPortrait(null)
    setLoading(true)
    setError(null)
    async function fetch_portrait() {
      try {
        const res = await fetch(`${API_BASE}/pet/summary`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traits, history }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail ?? `后端错误 ${res.status}`)
        }
        setPortrait(await res.json())
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetch_portrait()
  }, [genKey])

  // 点击遮罩关闭
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const DIMENSION_COLORS = [
    'border-violet-500/30 bg-violet-500/5',
    'border-blue-500/30 bg-blue-500/5',
    'border-emerald-500/30 bg-emerald-500/5',
    'border-amber-500/30 bg-amber-500/5',
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-8 px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-lg space-y-5" onClick={e => e.stopPropagation()}>

        {/* 顶部关闭 */}
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-500">你的星球画像</p>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            关闭 ×
          </button>
        </div>

        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
            <p className="text-slate-500 animate-pulse text-sm">星球正在向你开口…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-5 text-sm text-red-300">
            ⚠ {error}
          </div>
        )}

        {portrait && (
          <>
            {/* 标题卡 */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
              <p className="text-amber-400 text-xs font-medium tracking-widest uppercase">你是</p>
              <h2 className="text-2xl font-bold text-white">{portrait.title}</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{portrait.core}</p>
            </div>

            {/* 四维度 */}
            {portrait.dimensions.map((dim, i) => (
              <div key={i} className={`border rounded-2xl p-5 space-y-2 ${DIMENSION_COLORS[i % 4]}`}>
                <p className="text-xs font-medium text-slate-400">{dim.title}</p>
                <p className="text-slate-200 text-sm leading-relaxed">{dim.content}</p>
              </div>
            ))}

            {/* 盲区 */}
            <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-5 space-y-2">
              <p className="text-xs font-medium text-red-400">你可能还没发现的</p>
              <p className="text-slate-200 text-sm leading-relaxed">{portrait.blind_spot}</p>
            </div>

            {/* 寄语 */}
            <div className="border border-amber-500/30 bg-amber-500/8 rounded-2xl p-5 text-center">
              <p className="text-amber-300 text-base italic">"{portrait.message}"</p>
            </div>

            {/* 重新生成 */}
            <button
              onClick={() => setGenKey(k => k + 1)}
              className="w-full text-xs text-slate-600 hover:text-slate-400 py-2 transition-colors"
            >
              重新生成画像
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── InsightCard（带复制 + 收藏按钮）────────────────────────────────────────

function InsightCard({ insight, question, userId, onSaved }) {
  const [copied, setCopied]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saving, setSaving]   = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(insight)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级：选中文字
    }
  }

  async function handleSave() {
    if (saved || saving) return
    setSaving(true)
    try {
      await supabase.from('saved_insights').insert({
        user_id:  userId,
        text:     insight,
        question: question ?? null,
      })
      setSaved(true)
      onSaved?.()   // 通知父组件刷新收藏面板
    } catch (e) {
      console.error('Save insight failed:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-amber-500/30 bg-amber-500/10 rounded-2xl p-5 space-y-3">
      <p className="text-amber-300 text-sm leading-relaxed italic">"{insight}"</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleCopy}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            copied
              ? 'bg-slate-600 text-slate-300'
              : 'bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {copied ? '已复制 ✓' : '复制'}
        </button>
        <button
          onClick={handleSave}
          disabled={saved || saving}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            saved
              ? 'bg-amber-500/25 text-amber-400 cursor-default'
              : 'bg-slate-700/60 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300'
          }`}
        >
          {saving ? '收藏中…' : saved ? '已收藏 ✦' : '✦ 收藏'}
        </button>
      </div>
    </div>
  )
}

// ── SavedInsightsPanel（我的收藏）──────────────────────────────────────────

function SavedInsightsPanel({ userId, refreshKey }) {
  const [open, setOpen]         = useState(false)
  const [insights, setInsights] = useState([])
  const [loading, setLoading]   = useState(false)
  const [loaded, setLoaded]     = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('saved_insights')
      .select('id, text, question, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setInsights(data)
    setLoading(false)
    setLoaded(true)
  }

  // 每次有新收藏（refreshKey 变化）时重新拉取，不管面板是否打开
  useEffect(() => {
    if (refreshKey === 0) return  // 初始不触发
    setOpen(true)   // 自动展开面板
    load()
  }, [refreshKey])

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && !loaded) load()
  }

  async function handleDelete(id) {
    await supabase.from('saved_insights').delete().eq('id', id)
    setInsights(prev => prev.filter(ins => ins.id !== id))
  }

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex justify-between items-center px-4 py-3 text-xs text-slate-500 hover:text-slate-400"
      >
        <span>✦ 我的收藏</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {loading && (
            <p className="text-xs text-slate-600 animate-pulse">加载中…</p>
          )}
          {loaded && insights.length === 0 && (
            <p className="text-xs text-slate-600">还没有收藏。回答问题后点「✦ 收藏」，句子会保存在这里。</p>
          )}
          {insights.map(ins => (
            <div key={ins.id} className="group relative border border-amber-500/20 bg-amber-500/5 rounded-xl p-3">
              <p className="text-amber-300/90 text-xs leading-relaxed italic pr-6">"{ins.text}"</p>
              {ins.question && (
                <p className="text-slate-600 text-xs mt-1.5 truncate">问：{ins.question}</p>
              )}
              <button
                onClick={() => handleDelete(ins.id)}
                title="取消收藏"
                className="absolute top-2 right-2.5 text-slate-700 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TraitDebugPanel ──────────────────────────────────────────────────────────

function TraitDebugPanel({ traits }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-xs text-slate-500 hover:text-slate-400"
      >
        <span>性格向量（开发调试）</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {Object.entries(traits).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-20 shrink-0">{TRAIT_LABELS[key]}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${val * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right">{val.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── WelcomeScreen（新用户引导）──────────────────────────────────────────────

function WelcomeScreen({ onStart }) {
  return (
    <div
      className="relative flex flex-col justify-end"
      style={{
        minHeight: 'calc(100vh - 64px)',
        backgroundImage: "url('/planet-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* 渐变遮罩：顶部透明 → 底部深黑，保证文字可读 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(2,6,23,0.92) 75%, rgb(2,6,23) 100%)',
        }}
      />

      {/* 内容区：浮在图片底部 */}
      <div className="relative z-10 px-6 pb-10 pt-8 max-w-lg mx-auto w-full space-y-6">

        {/* 标题 */}
        <div className="text-center space-y-3">
          <p className="text-amber-300/70 text-xs tracking-[0.3em] uppercase font-medium">
            ThinkForge
          </p>
          <h2 className="text-4xl font-bold text-white leading-snug drop-shadow-lg">
            你有一颗<br />
            <span className="text-amber-300">专属星球</span>
          </h2>
          <p className="text-slate-300/90 text-sm leading-relaxed drop-shadow">
            它会随着你的每一个回答，慢慢生长成<br />只属于你的样子
          </p>
        </div>

        {/* 特性 pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            '没有对错，只有真实',
            '积累问答，发现自己',
            '云端保存，随时继续',
          ].map((text, i) => (
            <span
              key={i}
              className="text-xs text-amber-200/80 bg-black/40 backdrop-blur-sm border border-amber-400/25 rounded-full px-3 py-1"
            >
              {text}
            </span>
          ))}
        </div>

        {/* CTA 按钮 */}
        <button
          onClick={onStart}
          className="w-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-bold py-4 rounded-2xl transition-all text-base shadow-xl shadow-amber-500/30"
        >
          开始探索我的星球 →
        </button>

        <p className="text-center text-xs text-slate-500">
          已有进度？登录后自动恢复
        </p>
      </div>
    </div>
  )
}

// ── FollowUpCard（深度追问卡）───────────────────────────────────────────────

function FollowUpCard({ followUp, onAccept, onSkip }) {
  return (
    <div className="border border-violet-500/40 bg-violet-500/8 rounded-2xl p-5 space-y-4">
      {/* 标签 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tracking-widest text-violet-400 uppercase bg-violet-500/15 px-2 py-0.5 rounded-full">
          深度追问
        </span>
        <span className="text-xs text-slate-500">星球想多问一句</span>
      </div>

      {/* 追问内容 */}
      <p className="text-slate-200 text-base leading-relaxed font-medium">
        {followUp}
      </p>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white text-sm font-medium py-2.5 rounded-xl transition-all"
        >
          回应这个 →
        </button>
        <button
          onClick={onSkip}
          className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm py-2.5 rounded-xl transition-colors"
        >
          跳过
        </button>
      </div>
    </div>
  )
}

// ── ExploreTab（探索星球）────────────────────────────────────────────────────

const PLANET_FEATURES = [
  { id: 'ocean',   name: '情感之海',   emoji: '🌊', trait: 'emotional_depth',     hi: true,  threshold: 3,  desc: v => `覆盖星球 ${Math.round(v*100)}% 的表面，随你的情绪涨落。`         },
  { id: 'volcano', name: '觉醒火山',   emoji: '🌋', trait: 'sensation_seeking',   hi: true,  threshold: 5,  desc: v => `活跃度 ${Math.round(v*100)}%，是你对刺激与突破渴望的具象。`     },
  { id: 'crystal', name: '创造晶体',   emoji: '💎', trait: 'creativity',          hi: true,  threshold: 5,  desc: v => `覆盖 ${Math.round(v*100)}% 高地，每块都是未实现的奇思妙想。`    },
  { id: 'forest',  name: '语言森林',   emoji: '🌿', trait: 'language_sensitivity',hi: true,  threshold: 6,  desc: v => `密度 ${Math.round(v*100)}%，每棵树是一个让你心动的句子。`        },
  { id: 'city',    name: '聚落广场',   emoji: '🏘️', trait: 'extraversion',        hi: true,  threshold: 6,  desc: v => `${Math.round(v*100)}% 的表面有人居住，热闹而明亮。`             },
  { id: 'ruins',   name: '古城遗迹',   emoji: '🏛️', trait: 'memory_strength',     hi: true,  threshold: 8,  desc: v => `保存度 ${Math.round(v*100)}%，你的星球从不真正遗忘。`           },
  { id: 'tower',   name: '孤独灯塔',   emoji: '🗼', trait: 'independence',         hi: true,  threshold: 8,  desc: v => `照亮半径 ${Math.round(v*100)}%，黑暗中你倾向独自找方向。`       },
  { id: 'cave',    name: '直觉洞穴',   emoji: '🌀', trait: 'intuitive',            hi: true,  threshold: 5,  desc: v => `深度 ${Math.round(v*100)}%，感觉总比逻辑先一步到达。`           },
  { id: 'desert',  name: '冷静沙漠',   emoji: '🏜️', trait: 'sensation_seeking',   hi: false, threshold: 8,  desc: v => `覆盖 ${Math.round((1-v)*100)}% 的土地，安静而稳定。`           },
  { id: 'library', name: '星际图书馆', emoji: '📚', trait: 'language_sensitivity', hi: false, threshold: 10, desc: v => `藏书 ${Math.round((1-v)*100)}% 页，理性与文字并肩而行。`       },
]

function ExploreTab({ user }) {
  const [traits, setTraits]       = useState(INITIAL_TRAITS)
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [shareMsg, setShareMsg]   = useState(null)
  const [visitTraits, setVisitTraits]   = useState(null)  // 访客模式
  const [visitHistory, setVisitHistory] = useState([])

  // 从 URL 读取 ?visit=userId
  const visitId = new URLSearchParams(window.location.search).get('visit')

  useEffect(() => {
    async function load() {
      // 先加载自己的数据
      const { data: myState } = await supabase
        .from('planet_states').select('traits, question_count').eq('user_id', user.id).maybeSingle()
      if (myState) setTraits(myState.traits)
      const { data: myHist } = await supabase
        .from('question_history').select('question,answer').eq('user_id', user.id).order('created_at')
      if (myHist) setHistory(myHist)

      // 如果 URL 有 visit 参数，再加载访客星球
      if (visitId && visitId !== user.id) {
        const { data: vs } = await supabase
          .from('planet_states').select('traits, question_count').eq('user_id', visitId).maybeSingle()
        const { data: vh } = await supabase
          .from('question_history').select('question,answer').eq('user_id', visitId).order('created_at')
        if (vs) { setVisitTraits(vs.traits); setVisitHistory(vh ?? []) }
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  const displayTraits  = visitTraits ?? traits
  const displayHistory = visitTraits ? visitHistory : history
  const isVisiting     = !!visitTraits

  // 已解锁地标（trait 明显偏离 0.5 且 questionCount 达到）
  const unlocked = PLANET_FEATURES.filter(f => {
    const val = displayTraits[f.trait] ?? 0.5
    const triggered = f.hi ? val >= 0.58 : val <= 0.42
    return triggered && displayHistory.length >= f.threshold
  })

  function handleShare() {
    const url = `${window.location.origin}/?visit=${user.id}`
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg('链接已复制！发给朋友，让他们来拜访你的星球 🪐')
      setTimeout(() => setShareMsg(null), 3000)
    }).catch(() => setShareMsg(url))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-slate-500 text-sm animate-pulse">加载星球数据…</p>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-6 py-8 space-y-6">

      {isVisiting && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300">
          🌍 你正在拜访这颗星球（只读模式）
        </div>
      )}

      {/* 大星球 */}
      <PlanetVisual
        traits={displayTraits}
        questionCount={displayHistory.length}
        latestChanges={[]}
      />

      {/* 分享 */}
      {!isVisiting && (
        <div className="space-y-2">
          <button
            onClick={handleShare}
            className="w-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-sm font-medium py-3 rounded-xl transition-colors"
          >
            🔗 分享我的星球给朋友
          </button>
          {shareMsg && (
            <p className="text-xs text-center text-amber-300/80 break-all">{shareMsg}</p>
          )}
        </div>
      )}

      {/* 已解锁地标 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">已发现的地标</p>
          <p className="text-xs text-slate-500">{unlocked.length} / {PLANET_FEATURES.length} 个</p>
        </div>

        {unlocked.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-3">🌑</p>
            <p className="text-slate-400 text-sm">还没有解锁任何地标</p>
            <p className="text-slate-600 text-xs mt-1">继续回答问题，星球会逐渐苏醒</p>
          </div>
        )}

        {unlocked.map(f => {
          const val = displayTraits[f.trait] ?? 0.5
          return (
            <div key={f.id} className="flex items-start gap-4 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
              <span className="text-3xl shrink-0">{f.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 mb-1">{f.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc(val)}</p>
                {/* 进度条 */}
                <div className="mt-2 bg-slate-800 rounded-full h-1">
                  <div
                    className="bg-amber-400 h-1 rounded-full transition-all duration-700"
                    style={{ width: `${(f.hi ? val : 1 - val) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* 未解锁的（用锁图标显示有多少隐藏） */}
        {PLANET_FEATURES.length - unlocked.length > 0 && displayHistory.length > 0 && (
          <p className="text-center text-xs text-slate-600 py-2">
            还有 {PLANET_FEATURES.length - unlocked.length} 个地标等待被发现……
          </p>
        )}
      </div>

      {/* 探索进度 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 space-y-3">
        <p className="text-xs font-medium text-slate-400">星球探索进度</p>
        {Object.entries(TRAIT_LABELS).map(([key, label]) => {
          const val = displayTraits[key] ?? 0.5
          const deviation = Math.abs(val - 0.5) * 2  // 0=中性 1=极端
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-px h-full bg-slate-700" />
                </div>
                {val >= 0.5
                  ? <div className="absolute left-1/2 bg-amber-400 h-1.5 rounded-r-full transition-all duration-500" style={{ width: `${(val - 0.5) * 100}%` }} />
                  : <div className="absolute right-1/2 bg-violet-400 h-1.5 rounded-l-full transition-all duration-500" style={{ width: `${(0.5 - val) * 100}%` }} />
                }
              </div>
              <span className="text-xs text-slate-600 w-8 text-right">{deviation < 0.1 ? '—' : val > 0.5 ? '↑' : '↓'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── ArenaTab ─────────────────────────────────────────────────────────────────

const PERSPECTIVE_CONFIG = {
  counter: {
    label: '最强反驳',
    icon: '⚔️',
    border: 'border-red-500/30',
    bg: 'bg-red-500/8',
    title: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300',
  },
  support: {
    label: '支撑论据',
    icon: '🛡️',
    border: 'border-green-500/30',
    bg: 'bg-green-500/8',
    title: 'text-green-400',
    badge: 'bg-green-500/20 text-green-300',
  },
  socratic: {
    label: '苏格拉底追问',
    icon: '🔍',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/8',
    title: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-300',
  },
}

function ArenaTab({ onSwitchToPlanet }) {
  const [argument, setArgument]       = useState('')
  const [context, setContext]         = useState('')
  const [showContext, setShowContext]  = useState(false)
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState(null)
  const [deepenIdx, setDeepenIdx]     = useState(null)
  const [deepenResult, setDeepenResult] = useState(null)
  const [planetLinked, setPlanetLinked] = useState(false)
  const textareaRef = useRef(null)

  async function handleAnalyze() {
    if (!argument.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    setDeepenIdx(null)
    setDeepenResult(null)
    setPlanetLinked(false)

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          argument: argument.trim(),
          context:  context.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `后端错误 ${res.status}`)
      }
      setResult(await res.json())
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeepen(idx) {
    if (!result) return
    const p = result.perspectives[idx]
    setDeepenIdx(idx)
    setDeepenResult(null)

    try {
      const deepenArg = `原始论点：${result.argument}\n\n针对「${p.title}」进一步展开：${p.content}`
      const res = await fetch(`${API_BASE}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ argument: deepenArg }),
      })
      if (!res.ok) throw new Error(`后端错误 ${res.status}`)
      setDeepenResult(await res.json())
    } catch (e) {
      setError(e.message)
      setDeepenIdx(null)
    }
  }

  function linkToPlanet() {
    if (!result?.arena_event) return
    saveArenaEvent(result.arena_event)
    setPlanetLinked(true)
    setTimeout(() => onSwitchToPlanet(), 800)
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8 space-y-6">

      <div>
        <h2 className="text-lg font-semibold text-white">思维道场</h2>
        <p className="text-slate-500 text-sm mt-1">输入你的论点，AI 从三个角度帮你拆解它。</p>
      </div>

      {/* 输入区 */}
      <div className="space-y-3">
        <textarea
          ref={textareaRef}
          value={argument}
          onChange={e => setArgument(e.target.value)}
          rows={4}
          placeholder={'输入你想分析的论点或观点…\n例如：「短视频正在摧毁年轻人的专注力」'}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze()
          }}
        />
        <button
          onClick={() => setShowContext(o => !o)}
          className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          {showContext ? '▲ 收起背景信息' : '▼ 添加背景信息（可选）'}
        </button>
        {showContext && (
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            rows={2}
            placeholder="例如：这是一篇社会学论文的论点，受众是大学生…"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
          />
        )}
        <button
          onClick={handleAnalyze}
          disabled={loading || !argument.trim()}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? '思维拆解中…' : '开始分析 ⌘↵'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
          ⚠ {error}
        </div>
      )}

      {/* 分析结果 */}
      {result && (
        <div className="space-y-5">

          {/* 论点摘要 */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
            <p className="text-xs text-slate-500 mb-1 font-medium">论点理解</p>
            <p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p>
          </div>

          {/* 三角度卡片 */}
          {result.perspectives.map((p, i) => {
            const cfg = PERSPECTIVE_CONFIG[p.type] ?? PERSPECTIVE_CONFIG.socratic
            const isDeepening = deepenIdx === i && !deepenResult
            return (
              <div key={i} className={`border ${cfg.border} ${cfg.bg} rounded-2xl p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <span className={`text-sm font-semibold ${cfg.title}`}>{p.title}</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{p.content}</p>

                {deepenIdx !== i && (
                  <button
                    onClick={() => handleDeepen(i)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    深化这个角度 →
                  </button>
                )}
                {isDeepening && (
                  <p className="text-xs text-slate-600 animate-pulse">深化分析中…</p>
                )}
                {deepenIdx === i && deepenResult && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">深化展开</p>
                    {deepenResult.perspectives.map((dp, di) => (
                      <div key={di} className="text-sm text-slate-300 leading-relaxed">
                        <span className={`text-xs font-medium mr-2 ${PERSPECTIVE_CONFIG[dp.type]?.title ?? 'text-slate-400'}`}>
                          {dp.title}
                        </span>
                        {dp.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* 星球联动 */}
          {result.arena_event && (
            <div className={`border rounded-2xl p-4 space-y-3 transition-all duration-500 ${
              planetLinked
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-slate-700 bg-slate-800/40'
            }`}>
              <p className="text-xs text-slate-500">道场收获</p>
              <p className="text-slate-300 text-sm leading-relaxed italic">"{result.arena_event}"</p>
              {!planetLinked ? (
                <button
                  onClick={linkToPlanet}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  🪐 让这次思考影响我的星球
                </button>
              ) : (
                <p className="text-center text-amber-400 text-sm animate-pulse">正在跳转到星球…</p>
              )}
            </div>
          )}

          {/* 再来一次 */}
          <button
            onClick={() => {
              setResult(null)
              setArgument('')
              setContext('')
              setDeepenIdx(null)
              setDeepenResult(null)
              setPlanetLinked(false)
              setTimeout(() => textareaRef.current?.focus(), 100)
            }}
            className="w-full text-xs text-slate-600 hover:text-slate-400 py-2 transition-colors"
          >
            分析新论点
          </button>
        </div>
      )}
    </div>
  )
}

// ── VoiceButton ──────────────────────────────────────────────────────────────
/**
 * 语音输入按钮，使用浏览器原生 Web Speech API（无需付费）。
 * Chrome / Edge / Safari 均支持。
 * 识别到结果后调用 onResult(transcript)，由父组件决定如何使用文字。
 */
function VoiceButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false)
  const [supported]               = useState(
    () => typeof window !== 'undefined' &&
          ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const recognitionRef = useRef(null)

  if (!supported) return null

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang           = 'zh-CN'
    rec.continuous     = false
    rec.interimResults = false   // 只取最终结果，避免重复追加中间状态

    rec.onstart = () => setListening(true)
    rec.onend   = () => setListening(false)
    rec.onerror = () => setListening(false)

    rec.onresult = (event) => {
      // event.results 是 SpeechRecognitionResultList，取最后一条最终结果
      const finalResult = Array.from(event.results)
        .filter(r => r.isFinal)
        .map(r => r[0].transcript.trim())
        .join('')
      if (finalResult) onResult(finalResult)
    }

    recognitionRef.current = rec
    rec.start()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? '点击停止录音' : '语音输入（普通话）'}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
        listening
          ? 'bg-red-500/25 text-red-400 animate-pulse'
          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {listening ? (
        // 录音中：实心圆圈
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="7" cy="7" r="5" />
        </svg>
      ) : (
        // 麦克风图标
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8"  y1="23" x2="16" y2="23"/>
        </svg>
      )}
    </button>
  )
}
