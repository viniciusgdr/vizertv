import got from 'got'
import { load } from 'cheerio'
import { CookieJar } from 'tough-cookie'
import { type LoadSearchRepository } from '../../../data/protocols'
import { type GetInfoRepository } from '../../../data/protocols/get-info-repository'
import { type GetDownloadsRepository } from '../../../data/protocols/get-downloads-repository'
import { type GetSeasonEpisodesRepository } from '../../../data/protocols/get-season-episodes'
import { type GetPlayerEpisodeRepository } from '../../../data/protocols/get-player-episode-repository'
import { type MovieType, type TypeAudio } from '../../../domain/models/player'
import { HlsDownloader } from '../hls/downloader'

const BASE_URL = 'https://boraflixhd.lat'
const SEARCH_URL = `${BASE_URL}/pesquisar`
const PLAYER_APIS = ['warezcdn.site', 'superflixapi.rest']

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
}

interface StreamResult {
  securedLink: string
  videoSource: string
  videoImage: string
  hls: boolean
  langType: 1 | 2
}

interface BoraflixEpisode {
  season: number
  epi_num: number
  title: string
  sinopse: string
  thumb_url: string
  duration: number
  air_date: string
  id: number
  has_dub: boolean
  has_leg: boolean
}

const XPASS_BASE = 'https://play.xpass.top'

function detectType (url: string): MovieType {
  if (url.includes('/serie/') || url.includes('/anime/') || url.includes('/dorama/')) return 'serie'
  return 'filme'
}

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
        return { securedLink: file, videoSource: url, videoImage: '', hls: true, langType: 1 }
      }
    } catch {
      continue
    }
  }

  return null
}

function langTypeToAudio (langType: number): TypeAudio {
  return langType === 2 ? 'leg' : 'dub'
}

async function fetchPage (url: string): Promise<string> {
  const { body } = await got.get(url, { headers: DEFAULT_HEADERS })
  return body
}

function extractAllEpisodes (html: string): Record<string, BoraflixEpisode[]> {
  const match = html.match(/window\.allEpisodes\s*=\s*(\{[\s\S]*?\});/)
  if (!match) return {}
  return JSON.parse(match[1])
}

function extractPlayerApis (html: string): string[] {
  const match = html.match(/window\.__PLAYER_APIS__\s*=\s*(\[.*?\]);/)
  if (!match) return PLAYER_APIS
  try { return JSON.parse(match[1]) } catch { return PLAYER_APIS }
}

interface PlayerPageContext {
  csrf: string
  pageToken: string
  contentId: string
  contentType: string
  apiHost: string
  playerUrl: string
  cookieJar: CookieJar
}

async function loadPlayerPage (playerUrl: string): Promise<PlayerPageContext | null> {
  const cookieJar = new CookieJar()

  const playerPage = await got.get(playerUrl, {
    headers: {
      ...DEFAULT_HEADERS,
      referer: `${BASE_URL}/`,
      origin: BASE_URL,
      'sec-fetch-dest': 'iframe',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'cross-site'
    },
    cookieJar,
    followRedirect: true
  })

  const html = playerPage.body
  if (html.length < 10000) return null

  const csrfMatch = html.match(/CSRF_TOKEN\s*=\s*['"]([^'"]+)['"]/)
  const pageTokenMatch = html.match(/PAGE_TOKEN\s*=\s*['"]([^'"]+)['"]/)
  const contentIdMatch = html.match(/INITIAL_CONTENT_ID\s*=\s*(\d+)/)
  if (!csrfMatch || !pageTokenMatch || !contentIdMatch) return null

  const typeMatch = playerUrl.match(/\/(serie|filme)\//)

  return {
    csrf: csrfMatch[1],
    pageToken: pageTokenMatch[1],
    contentId: contentIdMatch[1],
    contentType: typeMatch ? typeMatch[1] : 'serie',
    apiHost: new URL(playerUrl).origin,
    playerUrl,
    cookieJar
  }
}

async function fetchPlayerOptions (ctx: PlayerPageContext): Promise<Array<{ ID: number, type: number }>> {
  const optionsResp = await got.post(`${ctx.apiHost}/player/options`, {
    headers: {
      ...DEFAULT_HEADERS,
      referer: ctx.playerUrl,
      'x-csrf-token': ctx.csrf,
      'content-type': 'application/x-www-form-urlencoded'
    },
    cookieJar: ctx.cookieJar,
    body: `contentid=${ctx.contentId}&type=${ctx.contentType}&page_token=${encodeURIComponent(ctx.pageToken)}&_token=${encodeURIComponent(ctx.csrf)}`,
    responseType: 'json'
  }) as { body: { data: { options: Array<{ ID: number, type: number }> } } }

  return optionsResp.body?.data?.options ?? []
}

async function resolveOptionToStream (option: { ID: number, type: number }, ctx: PlayerPageContext): Promise<StreamResult | null> {
  const sourceResp = await got.post(`${ctx.apiHost}/player/source`, {
    headers: {
      ...DEFAULT_HEADERS,
      referer: ctx.playerUrl,
      'x-csrf-token': ctx.csrf,
      'content-type': 'application/x-www-form-urlencoded'
    },
    cookieJar: ctx.cookieJar,
    body: `video_id=${option.ID}&page_token=${encodeURIComponent(ctx.pageToken)}&_token=${encodeURIComponent(ctx.csrf)}`,
    responseType: 'json'
  }) as { body: { data: { video_url: string } } }

  const redirectUrl = sourceResp.body?.data?.video_url
  if (!redirectUrl) return null

  const redirectResp = await got.get(redirectUrl, {
    headers: { ...DEFAULT_HEADERS, referer: ctx.playerUrl },
    cookieJar: ctx.cookieJar,
    followRedirect: false
  })

  const finalLocation = redirectResp.headers.location
  if (!finalLocation) return null

  const hashMatch = finalLocation.match(/\/video\/([a-f0-9]{32})/)
  if (!hashMatch) {
    return {
      securedLink: finalLocation,
      videoSource: finalLocation,
      videoImage: '',
      hls: false,
      langType: (option.type === 2 ? 2 : 1)
    }
  }
  const videoHash = hashMatch[1]

  const finalCookieJar = new CookieJar()

  await got.get(finalLocation, {
    headers: { ...DEFAULT_HEADERS, referer: `${ctx.apiHost}/` },
    cookieJar: finalCookieJar,
    followRedirect: true
  })

  const finalOrigin = new URL(finalLocation).origin

  const videoResp = await got.post(`${finalOrigin}/player/index.php?data=${videoHash}&do=getVideo`, {
    headers: {
      ...DEFAULT_HEADERS,
      referer: finalLocation,
      'content-type': 'application/x-www-form-urlencoded',
      'x-requested-with': 'XMLHttpRequest'
    },
    cookieJar: finalCookieJar,
    body: `hash=${videoHash}&r=${encodeURIComponent(`${ctx.apiHost}/`)}`,
    responseType: 'json'
  }) as { body: { securedLink?: string, videoSource?: string, videoImage?: string, hls?: boolean } }

  const data = videoResp.body
  if (!data.securedLink && !data.videoSource) return null

  return {
    securedLink: data.securedLink ?? data.videoSource ?? '',
    videoSource: data.videoSource ?? '',
    videoImage: data.videoImage ?? '',
    hls: data.hls ?? false,
    langType: (option.type === 2 ? 2 : 1)
  }
}

async function resolveAllStreams (playerUrl: string, tmdbId?: string): Promise<StreamResult[]> {
  const ctx = await loadPlayerPage(playerUrl)
  if (!ctx) return []

  const options = await fetchPlayerOptions(ctx)

  if (options.length === 0) {
    if (tmdbId) {
      const xpassType = ctx.contentType === 'filme' ? 'movie' : 'tv'
      const seasonEpMatch = playerUrl.match(/\/serie\/\d+\/(\d+)\/(\d+)/)
      const season = seasonEpMatch ? parseInt(seasonEpMatch[1], 10) : undefined
      const episode = seasonEpMatch ? parseInt(seasonEpMatch[2], 10) : undefined
      const xpassResult = await resolveViaXpass(tmdbId, xpassType, season, episode)
      if (xpassResult) return [xpassResult]
    }
    return []
  }

  const dubFirst = [...options].sort((a, b) => a.type - b.type)

  const results: StreamResult[] = []
  for (const opt of dubFirst) {
    try {
      const stream = await resolveOptionToStream(opt, ctx)
      if (stream) results.push(stream)
    } catch {
      continue
    }
  }

  return results
}

export class WarezcdnRepository implements LoadSearchRepository, GetInfoRepository, GetDownloadsRepository, GetSeasonEpisodesRepository {
  async search (query: string, options?: LoadSearchRepository.Options): Promise<LoadSearchRepository.Result> {
    const html = await fetchPage(`${SEARCH_URL}?s=${encodeURIComponent(query)}`)
    const $ = load(html)

    const results: LoadSearchRepository.Result = []

    $('div.grid > article, div.grid > div').each((i, card) => {
      if (options?.limit && i >= options.limit) return false

      const $card = $(card)
      const title = $card.find('h3').first().text().trim()
      if (!title) return

      const linkEl = $card.find('a[href*="/serie/"], a[href*="/filme/"], a[href*="/anime/"], a[href*="/dorama/"]').first()
      const url = linkEl.attr('href') ?? ''

      const img = $card.find('img').first().attr('src') ?? null

      const metaContainer = $card.find('div.mt-3 div.flex')
      const year = metaContainer.find('span').first().text().trim() || null
      const typeBadge = metaContainer.find('span').last().text().trim().toLowerCase()

      if (options?.type === 'movie' && typeBadge !== 'filme') return
      if (options?.type === 'series' && typeBadge !== 'série') return

      const rateText = $card.find('svg text').first().text().trim().replace('%', '') || null

      results.push({
        title,
        url,
        image: img,
        yearFilm: year,
        rateFilm: rateText ? `${rateText}%` : null
      })
    })

    return results
  }

  async info (url: string): Promise<GetInfoRepository.Result> {
    const html = await fetchPage(url)
    const $ = load(html)
    const type = detectType(url)

    const name = $('h1').first().text().trim()

    const rateFilm = $('div.font-extrabold.leading-none').first().text().trim() ||
      (() => {
        const rateMatch = html.match(/TMDB\s*<span[^>]*class="text-lead"[^>]*>([\d.]+)<\/span>/)
        return rateMatch ? rateMatch[1] : ''
      })()

    const yearBadges = $('span.text-xs.font-semibold').toArray().map(el => $(el).text().trim())
    let yearFilm = yearBadges.find(b => /^\d{4}$/.test(b)) ?? ''
    if (!yearFilm) {
      const metaSpans = $('header span, header + div span, div.flex.gap-2 > span').toArray().map(el => $(el).text().trim())
      yearFilm = metaSpans.find(t => /^\d{4}$/.test(t)) ?? ''
    }

    const durationMatch = html.match(/(\d+\s*min)/)
    const duration = durationMatch ? durationMatch[1] : ''

    const description = $('div.leading-relaxed p').first().text().trim() ||
      $('div.text-slate-700 p').first().text().trim() ||
      $('div.md\\:text-lg p').first().text().trim()

    const ogImage = $('meta[property="og:image"]').attr('content') ?? ''
    const image = ogImage.startsWith('http') ? ogImage : ogImage ? `https://image.tmdb.org/t/p/w500${ogImage}` : ''

    const contentId = $('[data-contentid]').first().attr('data-contentid') ?? ''
    const apiContentId = $('[data-apicontentid]').first().attr('data-apicontentid') ?? contentId

    const apis = extractPlayerApis(html)
    const primaryApi = apis[0] ?? PLAYER_APIS[0]

    if (type === 'filme') {
      const warezcdn = `https://${primaryApi}/filme/${apiContentId}`

      const players = [{
        dataLoadPlayer: apiContentId,
        typeAudio: 'dub' as const,
        players: apis.map(api => `https://${api}/filme/${apiContentId}`)
      }]

      return {
        id: contentId || apiContentId,
        name,
        rateFilm,
        yearFilm,
        duration,
        description,
        image,
        warezcdn,
        movieId: apiContentId,
        movieType: 'filme',
        players,
        _extra: { apis, contentId, apiContentId }
      }
    }

    const seasonButtons = $('button.seasonLoaderBtn, [data-season]').toArray()
    const seasonNumbers = [...new Set(
      seasonButtons
        .map(el => parseInt($(el).attr('data-season') ?? '0', 10))
        .filter(n => n > 0)
    )].sort((a, b) => a - b)

    const allEpisodes = extractAllEpisodes(html)

    const slug = url.split('/').pop() ?? ''

    const seasons = seasonNumbers.map(n => ({
      number: n,
      dataSeasonId: `${slug}:${n}`
    }))

    const warezcdn = `https://${primaryApi}/serie/${apiContentId || contentId}`

    return {
      id: contentId,
      name,
      rateFilm,
      yearFilm,
      duration,
      description,
      image,
      warezcdn,
      movieId: apiContentId || contentId,
      movieType: 'serie',
      seasons,
      _extra: { apis, contentId, apiContentId, allEpisodes }
    }
  }

  async get (movieId: string, movieType: MovieType): Promise<GetDownloadsRepository.Result[]> {
    const api = PLAYER_APIS[0]
    const path = movieType === 'serie' ? 'serie' : 'filme'
    const playerUrl = `https://${api}/${path}/${movieId}`
    const hlsDownloader = new HlsDownloader()

    const streams = await resolveAllStreams(playerUrl, movieId)
    if (streams.length > 0) {
      const results: GetDownloadsRepository.Result[] = []
      for (const stream of streams) {
        let urlDownload: Response | null = null
        try {
          urlDownload = await hlsDownloader.get(stream.securedLink)
        } catch {}
        results.push({
          url: stream.securedLink,
          urlDownload,
          type: langTypeToAudio(stream.langType)
        })
      }
      return results
    }

    const xpassFallback = await resolveViaXpass(movieId, movieType === 'serie' ? 'tv' : 'movie')
    if (xpassFallback?.securedLink) {
      let urlDownload: Response | null = null
      try {
        urlDownload = await hlsDownloader.get(xpassFallback.securedLink)
      } catch {}
      return [{
        url: xpassFallback.securedLink,
        urlDownload,
        type: langTypeToAudio(xpassFallback.langType)
      }]
    }

    return [{
      url: playerUrl,
      urlDownload: null,
      type: 'dub'
    }]
  }

  async load (dataSeasonId: string): Promise<GetSeasonEpisodesRepository.Result[]> {
    const [slug, seasonStr] = dataSeasonId.split(':')
    const seasonNum = parseInt(seasonStr, 10)
    if (!slug || isNaN(seasonNum)) return []

    const pageHtml = await fetchPage(`${BASE_URL}/serie/${slug}`)
    const $ = load(pageHtml)

    const contentId = $('[data-contentid]').first().attr('data-contentid') ?? ''
    const apiContentId = $('[data-apicontentid]').first().attr('data-apicontentid') ?? contentId

    const allEpisodes = extractAllEpisodes(pageHtml)
    const episodes = allEpisodes[String(seasonNum)] ?? []

    return episodes.map(ep => ({
      id: `${apiContentId}:${seasonNum}:${ep.epi_num}`,
      title: ep.title,
      released: true,
      name: `${seasonNum}x${ep.epi_num}`,
      runtime: `${ep.duration} min`,
      rating: ''
    }))
  }
}

export class WarezcdnEpisodeRepository implements GetPlayerEpisodeRepository {
  async load (dataEpisodeId: string): Promise<GetPlayerEpisodeRepository.Result[]> {
    const [apiContentId, seasonStr, episodeStr] = dataEpisodeId.split(':')
    const season = parseInt(seasonStr, 10) || 1
    const episode = parseInt(episodeStr, 10) || 1

    const primaryApi = PLAYER_APIS[0]
    const playerUrl = `https://${primaryApi}/serie/${apiContentId}/${season}/${episode}`

    const streams = await resolveAllStreams(playerUrl, apiContentId)
    if (streams.length > 0) {
      return streams.map(stream => ({
        dataLoadPlayer: `${primaryApi}:${apiContentId}:${season}:${episode}`,
        typeAudio: langTypeToAudio(stream.langType),
        players: [stream.securedLink]
      }))
    }

    const xpassFallback = await resolveViaXpass(apiContentId, 'tv', season, episode)
    if (xpassFallback?.securedLink) {
      return [{
        dataLoadPlayer: `xpass:${apiContentId}:${season}:${episode}`,
        typeAudio: langTypeToAudio(xpassFallback.langType),
        players: [xpassFallback.securedLink]
      }]
    }

    return PLAYER_APIS.map(api => ({
      dataLoadPlayer: `${api}:${apiContentId}:${season}:${episode}`,
      typeAudio: 'dub' as const,
      players: [`https://${api}/serie/${apiContentId}/${season}/${episode}`]
    }))
  }
}
