import { useCallback, useEffect, useMemo, useState } from 'react'
import { getNews, refreshNews, setPinned } from '../services/news'

const FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'pinned',  label: 'Pinned' },
  { id: 'BUY',     label: 'Buy' },
  { id: 'HOLD',    label: 'Hold' },
  { id: 'SELL',    label: 'Sell' },
]

const STANCE_CLASS = { BUY: 'buy', HOLD: 'hold', SELL: 'sell' }
const SENTIMENT_CLASS = { BULLISH: 'buy', BEARISH: 'sell', NEUTRAL: 'hold' }

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function stanceMatches(item, filter) {
  if (filter === 'pinned') return Boolean(item.pinned)
  if (filter === 'all') return true
  return (item.affectedHoldings || []).some(holding => holding.stance === filter)
}

function statusNote(item) {
  switch (item.analysisStatus) {
    case 'NOT_CONFIGURED': return 'AI analysis is not configured. Showing feed summary only.'
    case 'PAYWALLED':      return 'Article is paywalled. Analysis unavailable.'
    case 'FAILED':         return item.errorMessage || 'Article content could not be analyzed.'
    case 'PENDING':        return 'Analysis is queued for the next refresh.'
    default:               return null
  }
}

function NewsCard({ item, onPin, pinning }) {
  const note = statusNote(item)
  return (
    <article className={`card news-card${item.pinned ? ' news-card--pinned' : ''}`}>
      <div className="news-meta">
        <span className="news-source">{item.source}</span>
        <span className="news-dot" aria-hidden="true">·</span>
        <time dateTime={item.publishedAt}>{formatWhen(item.publishedAt)}</time>
        <button
          type="button"
          className={`news-pin${item.pinned ? ' active' : ''}`}
          onClick={() => onPin(item)}
          disabled={pinning === item.id}
          aria-pressed={Boolean(item.pinned)}
          title={item.pinned ? 'Unpin article' : 'Pin article'}
        >
          {item.pinned ? 'Pinned' : 'Pin'}
        </button>
      </div>

      <a className="news-title" href={item.link} target="_blank" rel="noopener noreferrer">
        {item.title}
      </a>

      {item.matchedHoldings?.length > 0 && (
        <div className="news-chips">
          {item.matchedHoldings.slice(0, 4).map(holding => (
            <span key={holding} className="news-chip">{holding}</span>
          ))}
          {item.matchedTopics?.slice(0, 2).map(topic => (
            <span key={topic} className="news-chip news-chip--topic">{topic}</span>
          ))}
        </div>
      )}

      {item.sentiment && (
        <span className={`badge news-sentiment badge--${SENTIMENT_CLASS[item.sentiment] || 'hold'}`}>
          {item.sentiment}
        </span>
      )}

      {item.analysisSummary && <p className="news-summary">{item.analysisSummary}</p>}
      {note && <p className="news-note">{note}</p>}

      {item.affectedHoldings?.length > 0 && (
        <ul className="news-holdings">
          {item.affectedHoldings.map(holding => (
            <li key={`${holding.holding}-${holding.stance}`} className="news-holding">
              <div className="news-holding-head">
                <span className={`badge badge--${STANCE_CLASS[holding.stance] || 'hold'}`}>
                  {holding.stance}
                </span>
                <strong>{holding.holding}</strong>
                <span className="news-horizon">{holding.horizon}</span>
              </div>
              <p>{holding.hypothesis}</p>
            </li>
          ))}
        </ul>
      )}

      {item.evidence?.length > 0 && (
        <details className="news-evidence">
          <summary>Evidence from the article</summary>
          <ul>
            {item.evidence.map((quote, index) => <li key={index}>{quote}</li>)}
          </ul>
        </details>
      )}

      {item.caveats && <p className="news-caveats">{item.caveats}</p>}

      <div className="news-footer">
        <a href={item.link} target="_blank" rel="noopener noreferrer">Read source ↗</a>
      </div>
    </article>
  )
}

export default function NewsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pinning, setPinning] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      setError(null)
      setItems(await getNews())
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError(null)
      await refreshNews()
      window.setTimeout(load, 15000)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handlePin = async (item) => {
    try {
      setPinning(item.id)
      const updated = await setPinned(item.id, !item.pinned)
      setItems(previous => previous.map(entry => entry.id === updated.id ? updated : entry))
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setPinning(null)
    }
  }

  const visible = useMemo(
    () => items.filter(item => stanceMatches(item, filter)),
    [items, filter]
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">News Analyzer</div>
          <div className="page-meta">Portfolio-relevant news, evidence and 1–5 year hypotheses</div>
        </div>
        <div className="investment-actions">
          <button type="button" className="btn btn-ghost" onClick={load}>Reload</button>
          <button type="button" className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Starting…' : 'Refresh news'}
          </button>
        </div>
      </div>

      <div className="news-filters" role="group" aria-label="Filter news">
        {FILTERS.map(option => (
          <button
            key={option.id}
            type="button"
            className={`news-filter${filter === option.id ? ' active' : ''}`}
            onClick={() => setFilter(option.id)}
            aria-pressed={filter === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <div className="empty-state"><div className="empty-desc">Loading news…</div></div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📰</div>
          <div className="empty-title">No relevant news</div>
          <div className="empty-desc">
            Refresh to fetch the latest feeds. Only articles matching your holdings or their macro themes are kept.
          </div>
        </div>
      ) : (
        <div className="news-grid">
          {visible.map(item => (
            <NewsCard key={item.id} item={item} onPin={handlePin} pinning={pinning} />
          ))}
        </div>
      )}
    </>
  )
}
