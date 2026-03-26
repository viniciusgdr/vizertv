import got from 'got'
import { load } from 'cheerio'
import { type LoadSearchRepository } from '../../../data/protocols'
import { type GetInfoRepository } from '../../../data/protocols/get-info-repository'
import { type GetDownloadsRepository } from '../../../data/protocols/get-downloads-repository'
import { type GetSeasonEpisodesRepository } from '../../../data/protocols/get-season-episodes'
import { type GetPlayerEpisodeRepository } from '../../../data/protocols/get-player-episode-repository'
import { type MovieType } from '../../../domain/models/player'
import { HlsDownloader } from '../hls/downloader'

const BASE_URL = 'https://pobreflix.codes'
const SEARCH_URL = `${BASE_URL}/buscar`
const XPASS_BASE = 'https://play.xpass.top'

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
}

interface StreamResult {
  securedLink: string
  videoSource: string
  hls: boolean
}

type SeasonEpisodes = Record<string, { name: string, time: number, img: string, desc: string }>
type SeasonsData = Record<string, number | SeasonEpisodes> & { tmdb: number }

function buildXpassPlaylistUrls (tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): string[] {
  if (type === 'movie') {
    return [
      `${XPASS_BASE}/mov/${tmdbId}/0/0/0/playlist.json`,
      `${XPASS_BASE}/vrk/movie/${tmdbId}/playlist.json`,
      `${XPASS_BASE}/vsr/movie/${tmdbId}/playlist.json`,
      `${XPASS_BASE}/meg/movie/${tmdbId}/0/0/playlist.json`,
      `${XPASS_BASE}/vxr/movie/${tmdbId}/playlist.json`
    ]
  }
  const s = season ?? 1
  const e = episode ?? 1
  return [
    `${XPASS_BASE}/mov/${tmdbId}/${s}/${e}/0/playlist.json`,
    `${XPASS_BASE}/vrk/tv/${tmdbId}/${s}/${e}/playlist.json`,
    `${XPASS_BASE}/vsr/tv/${tmdbId}/${s}/${e}/playlist.json`,
    `${XPASS_BASE}/meg/tv/${tmdbId}/${s}/${e}/playlist.json`,
    `${XPASS_BASE}/vxr/tv/${tmdbId}/${s}/${e}/playlist.json`
  ]
}

async function resolveViaXpass (tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResult | null> {
  const urls = buildXpassPlaylistUrls(tmdbId, type, season, episode)

  for (const url of urls) {
    try {
      const resp = await got.get(url, {
        headers: {
          ...DEFAULT_HEADERS,
          accept: 'application/json, */*',
          referer: `${XPASS_BASE}/`
        },
        followRedirect: true,
        throwHttpErrors: false,
        timeout: { request: 10000 },
        responseType: 'json'
      }) as { body: { playlist?: Array<{ sources?: Array<{ file?: string, type?: string }> }> }, statusCode: number }

      if (resp.statusCode !== 200) continue

      const file = resp.body?.playlist?.[0]?.sources?.[0]?.file
      if (file) {
        return { securedLink: file, videoSource: url, hls: true }
      }
    } catch {
      continue
    }
  }

  return null
}

async function fetchPage (url: string): Promise<string> {
  const { body } = await got.get(url, { headers: DEFAULT_HEADERS })
  return body
}

function extractJsonFromAssignment (source: string, varName: string): Record<string, unknown> | null {
  const pattern = new RegExp(`(?:window\\.)?${varName}\\s*=\\s*`)
  const match = source.match(pattern)
  if (!match?.index && match?.index !== 0) return null

  const startIdx = match.index + match[0].length
  if (source[startIdx] !== '{') return null

  let depth = 0
  let endIdx = startIdx
  for (let i = startIdx; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') { depth--; if (depth === 0) { endIdx = i + 1; break } }
  }
  if (depth !== 0) return null

  try { return JSON.parse(source.substring(startIdx, endIdx)) } catch { return null }
}

function extractSeasonsData (html: string): SeasonsData | null {
  return extractJsonFromAssignment(html, 'seasonsData') as SeasonsData | null
}

async function fetchSeasonsDataFromBundle (html: string): Promise<SeasonsData | null> {
  const directMatch = extractSeasonsData(html)
  if (directMatch) return directMatch

  const bundleMatch = html.match(/src="([^"]*litespeed\/js\/[^"]+)"/)
  if (!bundleMatch) return null

  try {
    const bundleUrl = bundleMatch[1].startsWith('http') ? bundleMatch[1] : `${BASE_URL}${bundleMatch[1]}`
    const bundleBody = await fetchPage(bundleUrl)
    const result = extractJsonFromAssignment(bundleBody, 'seasonsData') as SeasonsData | null
    if (result) return result
  } catch {}

  return null
}

function detectType (url: string): MovieType {
  if (url.includes('/serie/') || url.includes('/anime/') || url.includes('/dorama/')) return 'serie'
  return 'filme'
}

export class PobreflixRepository implements LoadSearchRepository, GetInfoRepository, GetDownloadsRepository, GetSeasonEpisodesRepository {
  async search (query: string, options?: LoadSearchRepository.Options): Promise<LoadSearchRepository.Result> {
    const html = await fetchPage(`${SEARCH_URL}?search=${encodeURIComponent(query)}`)
    const $ = load(html)
    const results: LoadSearchRepository.Result = []
    const seen = new Set<string>()

    $('div.item').each((_, card) => {
      const $card = $(card)
      const linkEl = $card.find('a[href*="/assistir/"]').first()
      const url = linkEl.attr('href') ?? ''
      if (!url) return

      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
      if (seen.has(fullUrl)) return
      seen.add(fullUrl)

      if (options?.limit && results.length >= options.limit) return false

      const title = $card.find('span.truncate').first().text().trim()
      if (!title) return

      const img = $card.find('img[data-src]').first().attr('data-src') ?? null

      const isMovie = url.includes('/filme/')
      const isSeries = url.includes('/serie/')

      if (options?.type === 'movie' && !isMovie) return
      if (options?.type === 'series' && !isSeries) return

      results.push({
        title,
        url: fullUrl,
        image: img,
        yearFilm: null,
        rateFilm: null
      })
    })

    return results
  }

  async info (url: string): Promise<GetInfoRepository.Result> {
    const html = await fetchPage(url)
    const $ = load(html)
    const type = detectType(url)

    const ogTitle = $('meta[property="og:title"]').attr('content') ?? ''
    const name = ogTitle.replace(/\s*-\s*Pobreflix\s*$/, '').trim()

    const description = $('div.overview').first().text().trim() ||
      ($('meta[property="og:description"]').attr('content') ?? '')

    const posterImg = $('div.poster img[data-src]').first().attr('data-src') ?? ''
    const image = posterImg || ($('div.backdrop img[data-src]').first().attr('data-src') ?? '')

    const lineTexts = $('div.line > p').toArray().map(el => $(el).text().trim())
    const yearFilm = lineTexts.find(t => /^\d{4}$/.test(t)) ?? ''
    const duration = lineTexts.find(t => /\d+\s*(?:h|min)/.test(t)) ?? ''

    const starsSpan = $('div.stars span[style]').first().attr('style') ?? ''
    const rateMatch = starsSpan.match(/width:\s*(\d+)%/)
    const rateFilm = rateMatch ? `${rateMatch[1]}%` : ''

    const tmdbAttr = $('button.player[data-tmdb]').first().attr('data-tmdb') ?? ''

    if (type === 'filme') {
      const tmdbId = tmdbAttr

      return {
        id: tmdbId,
        name,
        rateFilm,
        yearFilm,
        duration,
        description,
        image,
        warezcdn: '',
        movieId: tmdbId,
        movieType: 'filme',
        players: [{
          dataLoadPlayer: tmdbId,
          typeAudio: 'dub' as const,
          players: []
        }],
        _extra: { tmdbId }
      }
    }

    const seasonButtons = $('button[data-season]').toArray()
    const seasonNumbers = [...new Set(
      seasonButtons
        .map(el => parseInt($(el).attr('data-season') ?? '0', 10))
        .filter(n => n > 0)
    )].sort((a, b) => a - b)

    const seasonsData = await fetchSeasonsDataFromBundle(html)
    const tmdbId = seasonsData?.tmdb?.toString() ?? tmdbAttr

    const slug = url.replace(/\/$/, '').split('/').pop() ?? ''

    const seasons = seasonNumbers.map(n => ({
      number: n,
      dataSeasonId: `pobreflix:${tmdbId}:${slug}:${n}`
    }))

    return {
      id: tmdbId,
      name,
      rateFilm,
      yearFilm,
      duration,
      description,
      image,
      warezcdn: '',
      movieId: tmdbId,
      movieType: 'serie',
      seasons,
      _extra: { tmdbId, seasonsData }
    }
  }

  async get (movieId: string, movieType: MovieType): Promise<GetDownloadsRepository.Result[]> {
    const xpassType = movieType === 'serie' ? 'tv' : 'movie'
    const hlsDownloader = new HlsDownloader()

    const stream = await resolveViaXpass(movieId, xpassType)
    if (stream?.securedLink) {
      let urlDownload: Response | null = null
      try {
        urlDownload = await hlsDownloader.get(stream.securedLink)
      } catch {}
      return [{
        url: stream.securedLink,
        urlDownload,
        type: 'dub'
      }]
    }

    return [{
      url: `${BASE_URL}/assistir/${movieType === 'serie' ? 'serie' : 'filme'}/${movieId}/`,
      urlDownload: null,
      type: 'dub'
    }]
  }

  async load (dataSeasonId: string): Promise<GetSeasonEpisodesRepository.Result[]> {
    const parts = dataSeasonId.split(':')
    if (parts[0] !== 'pobreflix' || parts.length < 4) return []

    const tmdbId = parts[1]
    const slug = parts[2]
    const seasonNum = parseInt(parts[3], 10)
    if (!tmdbId || isNaN(seasonNum)) return []

    const pageHtml = await fetchPage(`${BASE_URL}/assistir/serie/${slug}/`)
    const seasonsData = await fetchSeasonsDataFromBundle(pageHtml)

    const seasonData = seasonsData?.[String(seasonNum)]
    if (!seasonData || typeof seasonData !== 'object') return []

    return Object.entries(seasonData).map(([epNum, ep]) => {
      const episode = ep as { name: string, time: number, img: string, desc: string }
      return {
        id: `pobreflix:${tmdbId}:${seasonNum}:${epNum}`,
        title: episode.name,
        released: true,
        name: `${seasonNum}x${epNum}`,
        runtime: `${episode.time} min`,
        rating: ''
      }
    })
  }
}

export class PobreflixEpisodeRepository implements GetPlayerEpisodeRepository {
  async load (dataEpisodeId: string): Promise<GetPlayerEpisodeRepository.Result[]> {
    const parts = dataEpisodeId.split(':')
    if (parts[0] !== 'pobreflix' || parts.length < 4) return []

    const tmdbId = parts[1]
    const season = parseInt(parts[2], 10) || 1
    const episode = parseInt(parts[3], 10) || 1

    const stream = await resolveViaXpass(tmdbId, 'tv', season, episode)
    if (stream?.securedLink) {
      return [{
        dataLoadPlayer: `pobreflix:${tmdbId}:${season}:${episode}`,
        typeAudio: 'dub' as const,
        players: [stream.securedLink]
      }]
    }

    return [{
      dataLoadPlayer: `pobreflix:${tmdbId}:${season}:${episode}`,
      typeAudio: 'dub' as const,
      players: []
    }]
  }
}
