# VizerTV - Filmes, Series e Animes

Biblioteca para buscar, obter informacoes e players de filmes, series e animes. Dois provedores disponiveis: **WarezCDN** (filmes + series) e **CineGratisTV** (filmes).

## Instalacao

```bash
npm install github:viniciusgdr/vizertv
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
