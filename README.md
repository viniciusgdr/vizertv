# VizerTV - Filmes, Series e Animes

Biblioteca para buscar, obter informacoes e players de filmes, series e animes. Tres provedores disponiveis: **WarezCDN** (filmes + series), **Pobreflix** (filmes + series) e **CineGratisTV** (filmes). Suporta busca agregada em todos os provedores via `'all'`.

## Instalacao

```bash
npm install github:viniciusgdr/vizertv
```

## Multi-Provider (Todos de uma vez)

Busca em todos os provedores (exceto CineGratisTV) e retorna resultados combinados com o campo `provider` indicando a origem.

```typescript
import { makeFilmProvider } from 'vizertv-v2'

const provider = makeFilmProvider('all')
```

#### Buscar em todos

```typescript
const results = await provider.getSearch.get('harry potter')
// Cada resultado tem provider: 'warezcdn' | 'pobreflix'
results.forEach(r => console.log(`[${r.provider}] ${r.title}`))
```

#### Info, Episodes, Player e Download

As operacoes de info, episodios, player e download roteiam automaticamente para o provider correto baseado na URL ou ID:

```typescript
// Info de um resultado do pobreflix
const info = await provider.getInfo.get(results[0].url)
console.log(info.provider) // 'pobreflix'

// Episodios, player e download funcionam igual ao provider individual
if (info.movieType === 'serie') {
  const episodes = await provider.seasonEpisodes.load(info.seasons[0].dataSeasonId)
  const player = await provider.getPlayerEpisode.load(episodes[0].id)
}

const download = await provider.getDownloads.get(info.movieId, info.movieType)
```

## Provedores

### WarezCDN (via BoraflixHD)

Provedor principal. Retorna streams HLS (m3u8) para filmes e series, com fallback via XPASS.

```typescript
import { makeFilmProvider } from 'vizertv-v2'

const provider = makeFilmProvider('warezcdn')
```

#### Buscar

```typescript
const results = await provider.getSearch.get('breaking bad')
console.log(results)
```

#### Obter Detalhes (Info)

```typescript
const info = await provider.getInfo.get(results[0].url)
console.log(info)
```

Retorno para filmes:

```typescript
{
  name: string
  year: string
  rate: string
  duration: string
  description: string
  image: string
  players: Player[]
  movieId: string
  movieType: 'filme'
}
```

Retorno para series:

```typescript
{
  name: string
  year: string
  rate: string
  duration: string
  description: string
  image: string
  movieId: string
  movieType: 'serie'
  seasons: Season[]
}
```

#### Episodios de uma Temporada

```typescript
const episodes = await provider.seasonEpisodes.load(info.seasons[0].dataSeasonId)
console.log(episodes)
```

#### Player de um Episodio

```typescript
const player = await provider.getPlayerEpisode.load(episodes[0].id)
console.log(player)
```

#### Download

```typescript
const download = await provider.getDownloads.get(info.movieId, info.movieType)
console.log(download)
```

Retorno:

```typescript
{
  url: string
  urlDownload: Response | null
  type: TypeAudio
}
```

### Pobreflix

Provedor alternativo para filmes e series. Resolve streams via XPASS, retornando URLs HLS.

```typescript
import { makeFilmProvider } from 'vizertv-v2'

const provider = makeFilmProvider('pobreflix')
```

Mesma API do WarezCDN: `getSearch`, `getInfo`, `getDownloads`, `seasonEpisodes`, `getPlayerEpisode`.

Os IDs de temporadas seguem o formato `pobreflix:tmdbId:slug:season` e de episodios `pobreflix:tmdbId:season:episode`.

### CineGratisTV

Provedor alternativo somente para filmes. Retorna players com URLs diretas e streams m3u8 via brplayer.cc.

Disponivel no subpacote `vizertv/`:

```typescript
import { makeFilmProvider } from 'vizertv/vizertv'

const provider = makeFilmProvider('cinegratistv')
```

#### Buscar Filmes

```typescript
const results = await provider.getSearch.get('vingadores')
console.log(results)
```

#### Obter Detalhes e Players

```typescript
const info = await provider.getInfo.get(results[0].url)
console.log(info)
// info.players contem URLs de player e m3u8Players com streams HLS
```

## Notas

- Os players do WarezCDN retornam URLs HLS (`master.m3u8`) com TTL de ~2 horas
- O CDN (`llanfairpwllgwyngy.com`) nao envia headers CORS; para uso em browser, e necessario um proxy
- Para download server-side, use o `HlsDownloader` que ja faz parse do m3u8 e download dos segmentos
- CineGratisTV nao suporta series, episodios ou downloads
- Pobreflix resolve streams via XPASS, retornando URLs HLS com proxies (asiaflix, smashystream)
- O provider `'all'` roda buscas em paralelo com `Promise.allSettled`, sem bloquear se um provider falhar
