# VizerTV - Filmes, Series e Animes

Biblioteca para buscar, obter informacoes e players de filmes, series e animes via WarezCDN (BoraflixHD).

## Instalacao

```bash
npm install github:viniciusgdr/vizertv
```

## Uso

#### Inicializacao

```typescript
import { makeFilmProvider } from 'vizertv-v2'

const provider = makeFilmProvider('warezcdn')
```

#### Buscar Filmes/Series/Animes

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
  players: Player[]  // URLs de stream HLS resolvidas
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
// Retorna URLs de stream HLS (m3u8)
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

## Provedor

**WarezCDN** (via BoraflixHD) - Unico provedor ativo. Retorna streams HLS (m3u8) para filmes e series, com fallback via XPASS para conteudos sem CDN direto.

## Notas

- Os players retornam URLs HLS (`master.m3u8`) com TTL de ~2 horas
- O CDN (`llanfairpwllgwyngy.com`) nao envia headers CORS; para uso em browser, e necessario um proxy
- Para download server-side, use o `HlsDownloader` que ja faz parse do m3u8 e download dos segmentos
