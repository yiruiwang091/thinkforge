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
        <TabBtn active={tab === 'planet'} onClick={() => setTab('planet')} label="我的星球" icon="🪐" />
        <TabBtn active={tab === 'arena'} onClick={() => setTab('arena')} label="思维道场" icon="⚔️" />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {tab === 'planet'
          ? <PlanetTab user={user} />
          : <ArenaTab onSwitchToPlanet={() => setTab('planet')} />
        }
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
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? '设置密码（至少 6 位）' : '密码'}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />

          {error   && <p className="text-red-400   text-xs px-1">{error}</p>}
          {message && <p className="text-green-400 text-xs px-1">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
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
          ? 'border-indigo-400 text-indigo-300'
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

function PlanetTab({ user }) {
  const [traits, setTraits]           = useState(INITIAL_TRAITS)
  const [history, setHistory]         = useState([])
  const [currentQ, setCurrentQ]       = useState(null)
  const [answer, setAnswer]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [planetChanges, setPlanetChanges] = useState([])
  const [insight, setInsight]         = useState(null)
  const [phase, setPhase]             = useState('loading') // loading|idle|questioning|result|dormant
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

      // 4. 消费道场事件，然后拿第一题
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
  return (
    <div className="max-w-lg mx-auto px-6 py-8 space-y-8">

      <PlanetVisual traits={traits} questionCount={history.length} />

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
              className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
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
                <span className="text-xs text-indigo-400 font-medium mb-2 block">{currentQ.hint}</span>
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
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:text-slate-100'
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
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
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
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
            <button
              onClick={() => fetchNextQuestion()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 rounded-xl transition-colors"
            >
              继续探索 →
            </button>
          </div>
        )}

        {phase === 'idle' && (
          <button
            onClick={() => fetchNextQuestion()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors"
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
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors"
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

      {history.length > 0 && <TraitDebugPanel traits={traits} />}

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

// ── 星球可视化（Canvas）──────────────────────────────────────────────────────

function PlanetVisual({ traits, questionCount }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const tRef      = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const pr = 88, pcx = W / 2, pcy = H * 0.44

    const reveal = (threshold) => Math.min(1, Math.max(0, (questionCount - threshold) / 5))

    function drawStars(t) {
      const stars = [
        [22,18],[65,10],[115,28],[175,8],[235,22],[285,6],[308,32],
        [45,48],[158,38],[268,42],[320,18],[95,12],[215,35],[42,72],[290,65]
      ]
      stars.forEach(([sx, sy], i) => {
        const flicker = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.1 + i * 0.7))
        ctx.globalAlpha = flicker
        ctx.fillStyle = i % 3 === 0 ? '#f5c97a' : '#e8d5ff'
        ctx.beginPath()
        ctx.arc(sx, sy, i % 4 === 0 ? 1.2 : 0.7, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    function drawPlanetBase(t) {
      const s = traits.sensation_seeking
      const baseR = Math.round(18 + s * 45)
      const baseG = Math.round(8  + s * 12)
      const baseB = Math.round(55 + (1 - s) * 25)
      ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`
      ctx.fillRect(pcx - pr, pcy - pr, pr * 2, pr * 2)

      ctx.fillStyle = `rgba(35,18,65,0.7)`
      ctx.beginPath()
      ctx.moveTo(pcx - 30, pcy - 60)
      ctx.bezierCurveTo(pcx + 40, pcy - 75, pcx + 70, pcy - 20, pcx + 60, pcy + 25)
      ctx.bezierCurveTo(pcx + 40, pcy + 60, pcx - 10, pcy + 50, pcx - 35, pcy + 20)
      ctx.bezierCurveTo(pcx - 65, pcy - 10, pcx - 55, pcy - 45, pcx - 30, pcy - 60)
      ctx.fill()
    }

    function drawWater(t) {
      const alpha = traits.emotional_depth * 0.75 * reveal(5)
      if (alpha < 0.02) return
      const wave = Math.sin(t * 0.8) * 2
      ctx.fillStyle = `rgba(28,95,180,${alpha})`
      ctx.beginPath()
      ctx.ellipse(pcx - 28, pcy + 18 + wave, 28 + traits.emotional_depth * 12, 16, 0.25, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(40,130,200,${alpha * 0.6})`
      ctx.beginPath()
      ctx.ellipse(pcx + 38, pcy + 32 + wave * 0.7, 14, 9, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(120,200,255,${alpha * 0.4})`
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(pcx - 28, pcy + 15 + wave, 12, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
    }

    function drawVolcanic(t) {
      const intensity = (traits.sensation_seeking - 0.5) * 2
      const alpha = Math.max(0, intensity) * reveal(8)
      if (alpha < 0.02) return
      ctx.strokeStyle = `rgba(220,80,20,${alpha * 0.8})`
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      const cracks = [
        [[pcx + 20, pcy - 30], [pcx + 35, pcy - 10], [pcx + 28, pcy + 8]],
        [[pcx + 35, pcy - 10], [pcx + 50, pcy - 18]],
        [[pcx + 28, pcy + 8],  [pcx + 42, pcy + 20]],
      ]
      cracks.forEach(pts => {
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]))
        ctx.stroke()
      })
      const lava = 0.4 + 0.4 * Math.abs(Math.sin(t * 2))
      ctx.fillStyle = `rgba(255,120,30,${alpha * lava})`
      ctx.beginPath(); ctx.arc(pcx + 35, pcy - 10, 3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(pcx + 28, pcy + 8,  2, 0, Math.PI * 2); ctx.fill()
    }

    function drawVegetation(t) {
      const alpha = (traits.extraversion - 0.3) * 1.4 * reveal(3)
      if (alpha < 0.02) return
      ctx.fillStyle = `rgba(35,110,55,${Math.min(alpha, 0.7)})`
      ctx.beginPath()
      ctx.ellipse(pcx - 15, pcy - 32, 22 + traits.extraversion * 10, 14, 0.2, 0, Math.PI * 2)
      ctx.fill()
      if (traits.extraversion > 0.6 && reveal(10) > 0.5) {
        const trees = [[pcx - 22, pcy - 42], [pcx - 8, pcy - 46], [pcx + 5, pcy - 40]]
        trees.forEach(([tx, ty]) => {
          ctx.fillStyle = `rgba(25,85,40,${alpha * 0.9})`
          ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill()
          ctx.fillRect(tx - 1, ty, 2, 7)
        })
      }
    }

    function drawCrystals(t) {
      const rationality = 1 - traits.intuitive
      const alpha = (rationality - 0.3) * 1.4 * reveal(12)
      if (alpha < 0.02) return
      const crystals = [[pcx - 50, pcy - 20, 8, 18], [pcx - 42, pcy - 28, 6, 14], [pcx - 56, pcy - 14, 5, 12]]
      crystals.forEach(([cx2, cy2, w, h]) => {
        ctx.fillStyle = `rgba(160,120,255,${alpha * 0.6})`
        ctx.beginPath()
        ctx.moveTo(cx2, cy2 - h)
        ctx.lineTo(cx2 + w, cy2)
        ctx.lineTo(cx2, cy2 + h * 0.3)
        ctx.lineTo(cx2 - w, cy2)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = `rgba(200,180,255,${alpha * 0.4})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      })
    }

    function drawCreativeTerrain(t) {
      const alpha = (traits.creativity - 0.4) * 1.6 * reveal(15)
      if (alpha < 0.02) return
      const spots = [
        [pcx - 5,  pcy + 38, 10, 6, `rgba(180,60,160,${alpha * 0.5})`],
        [pcx + 20, pcy - 50, 7,  4, `rgba(60,180,160,${alpha * 0.6})`],
        [pcx - 40, pcy + 10, 8,  5, `rgba(200,160,40,${alpha * 0.4})`],
      ]
      spots.forEach(([x, y, rx, ry, color]) => {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.ellipse(x, y, rx, ry, Math.sin(t * 0.3), 0, Math.PI * 2)
        ctx.fill()
      })
    }

    function drawMemoryWalls(t) {
      const alpha = (traits.memory_strength - 0.4) * 1.6 * reveal(18)
      if (alpha < 0.02) return
      ctx.strokeStyle = `rgba(140,100,60,${alpha * 0.8})`
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      const wallY = pcy + 42
      ctx.beginPath()
      ctx.moveTo(pcx - 35, wallY)
      for (let i = 0; i < 5; i++) {
        const x = pcx - 35 + i * 12
        ctx.lineTo(x, wallY)
        ctx.lineTo(x + 4, wallY - 6)
        ctx.lineTo(x + 8, wallY - 6)
        ctx.lineTo(x + 8, wallY)
      }
      ctx.stroke()
      ctx.strokeStyle = `rgba(80,50,30,${alpha * 0.5})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pcx + 15, pcy + 15)
      ctx.bezierCurveTo(pcx + 25, pcy + 30, pcx + 30, pcy + 45, pcx + 22, pcy + 55)
      ctx.stroke()
    }

    function drawLanguageFeatures(t) {
      const alpha = Math.abs(traits.language_sensitivity - 0.5) * 2 * reveal(20)
      if (alpha < 0.02) return
      if (traits.language_sensitivity > 0.5) {
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.5))
        ctx.fillStyle = `rgba(200,170,100,${alpha * pulse * 0.7})`
        ctx.fillRect(pcx + 45, pcy - 45, 6, 18)
        ctx.fillRect(pcx + 52, pcy - 40, 5, 14)
        ctx.fillStyle = `rgba(245,220,150,${alpha * pulse * 0.4})`
        ctx.fillRect(pcx + 46, pcy - 43, 4, 1)
        ctx.fillRect(pcx + 46, pcy - 40, 4, 1)
        ctx.fillRect(pcx + 46, pcy - 37, 4, 1)
      } else {
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.5)
        ctx.fillStyle = `rgba(100,200,180,${alpha * pulse * 0.7})`
        ctx.beginPath(); ctx.arc(pcx + 48, pcy - 38, 5, 0, Math.PI * 2); ctx.fill()
        ctx.fillRect(pcx + 52, pcy - 38, 2, 12)
        ctx.beginPath(); ctx.arc(pcx + 58, pcy - 30, 4, 0, Math.PI * 2); ctx.fill()
        ctx.fillRect(pcx + 61, pcy - 30, 2, 10)
      }
    }

    function drawIndependenceFeature(t) {
      const alpha = reveal(25)
      if (alpha < 0.02) return
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 1.2))
      if (traits.independence > 0.55) {
        ctx.fillStyle = `rgba(220,210,180,${alpha * 0.8})`
        ctx.fillRect(pcx - 72, pcy - 55, 5, 22)
        ctx.beginPath()
        ctx.moveTo(pcx - 76, pcy - 55)
        ctx.lineTo(pcx - 67, pcy - 55)
        ctx.lineTo(pcx - 70, pcy - 65)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = `rgba(255,240,150,${alpha * pulse * 0.9})`
        ctx.beginPath(); ctx.arc(pcx - 70, pcy - 62, 3, 0, Math.PI * 2); ctx.fill()
      } else {
        const village = [[pcx - 68, pcy + 30], [pcx - 58, pcy + 35], [pcx - 72, pcy + 40]]
        village.forEach(([vx, vy], i) => {
          ctx.fillStyle = `rgba(255,200,80,${alpha * (0.5 + 0.4 * Math.sin(t + i)) * 0.8})`
          ctx.beginPath(); ctx.arc(vx, vy, 2, 0, Math.PI * 2); ctx.fill()
        })
      }
    }

    function drawArrivalSymbols(t) {
      const base = 0.12 + reveal(0) * 0.25
      const circles = [
        { x: pcx - 18, y: pcy - 12, r: 24, speed:  0.007, gap: 0.5 },
        { x: pcx + 20, y: pcy + 14, r: 16, speed: -0.006, gap: 0.4 },
        { x: pcx - 5,  y: pcy + 36, r: 10, speed:  0.009, gap: 0.8 },
      ]
      circles.forEach((c, i) => {
        const visible = reveal(i * 8)
        if (visible < 0.01) return
        const pulse = 0.7 + 0.3 * Math.abs(Math.sin(t * 0.7 + i))
        ctx.strokeStyle = `rgba(245,201,122,${base * pulse * visible})`
        ctx.lineWidth = 1.2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(c.x + Math.sin(t * 0.2 + i) * 1.5, c.y + Math.cos(t * 0.25 + i) * 1.5,
          c.r, c.gap + t * c.speed, Math.PI * 2 - c.gap * 0.6 + t * c.speed)
        ctx.stroke()
      })
    }

    function drawFog() {
      const revealed = Math.min(1, questionCount / 50)
      if (revealed >= 1) return
      const fogAlpha = (1 - revealed) * 0.82
      const fogGrad = ctx.createLinearGradient(pcx, pcy - pr, pcx, pcy + pr)
      fogGrad.addColorStop(0, `rgba(5,8,20,0)`)
      fogGrad.addColorStop(revealed * 0.8,           `rgba(5,8,20,0)`)
      fogGrad.addColorStop(Math.min(revealed + 0.2, 1), `rgba(5,8,20,${fogAlpha * 0.5})`)
      fogGrad.addColorStop(1, `rgba(5,8,20,${fogAlpha})`)
      ctx.fillStyle = fogGrad
      ctx.fillRect(pcx - pr, pcy - pr, pr * 2, pr * 2)
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const t = tRef.current

      ctx.fillStyle = '#020917'
      ctx.fillRect(0, 0, W, H)

      const horizon = ctx.createRadialGradient(pcx, H * 0.88, 0, pcx, H * 0.88, W * 0.55)
      horizon.addColorStop(0, 'rgba(120,50,20,0.25)')
      horizon.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = horizon
      ctx.fillRect(0, 0, W, H)

      drawStars(t)

      ctx.save()
      ctx.beginPath()
      ctx.arc(pcx, pcy, pr, 0, Math.PI * 2)
      ctx.clip()

      drawPlanetBase(t)
      drawWater(t)
      drawVegetation(t)
      drawVolcanic(t)
      drawCrystals(t)
      drawCreativeTerrain(t)
      drawMemoryWalls(t)
      drawLanguageFeatures(t)
      drawIndependenceFeature(t)
      drawArrivalSymbols(t)
      drawFog()

      ctx.restore()

      // 大气光晕
      const atmo = ctx.createRadialGradient(pcx, pcy, pr - 4, pcx, pcy, pr + 20)
      atmo.addColorStop(0, 'rgba(0,0,0,0)')
      const s = traits.sensation_seeking
      atmo.addColorStop(0.5, `rgba(${Math.round(100+s*80)},${Math.round(40+s*20)},${Math.round(180-s*60)},0.08)`)
      atmo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = atmo
      ctx.beginPath(); ctx.arc(pcx, pcy, pr + 20, 0, Math.PI * 2); ctx.fill()

      ctx.strokeStyle = 'rgba(245,201,122,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, Math.PI * 2); ctx.stroke()

      // 轨道环 + 月亮
      ctx.save()
      ctx.translate(pcx, pcy)
      ctx.rotate(0.28)
      ctx.strokeStyle = 'rgba(245,201,122,0.14)'
      ctx.lineWidth = 0.8
      ctx.setLineDash([5, 9])
      ctx.beginPath()
      ctx.ellipse(0, 0, pr + 26, 10, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      const ma = t * 0.32
      ctx.fillStyle = 'rgba(240,232,208,0.88)'
      ctx.beginPath()
      ctx.arc(Math.cos(ma) * (pr + 26), Math.sin(ma) * 10, 3.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 底部人影
      ctx.fillStyle = 'rgba(2,9,23,0.9)'
      ctx.beginPath()
      ctx.ellipse(pcx, H * 0.94, W * 0.45, H * 0.08, 0, 0, Math.PI * 2)
      ctx.fill()
      const fx = pcx - 22, fy = H * 0.875
      ctx.fillStyle = 'rgba(5,12,28,0.95)'
      ctx.beginPath(); ctx.ellipse(fx, fy + 13, 5, 10, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(fx, fy + 2, 4, 0, Math.PI * 2); ctx.fill()

      // 进度文字
      const depth = questionCount <= 20
        ? Math.round(questionCount / 20 * 100) + '% 地表'
        : questionCount <= 50
          ? Math.round((questionCount - 20) / 30 * 100) + '% 深层'
          : Math.round((questionCount - 50) / 50 * 100) + '% 精微'
      ctx.fillStyle = 'rgba(148,163,184,0.65)'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`已探索 ${questionCount} 题 · ${depth}`, pcx, pcy + pr + 22)

      tRef.current += 0.011
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [traits, questionCount])

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={280}
      className="w-full rounded-2xl"
    />
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
            <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-center space-y-3">
              <p className="text-indigo-400 text-xs font-medium tracking-widest uppercase">你是</p>
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
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
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
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
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
