# VizerTV - Filmes, Séries e Animes

O Projeto consegue capturar os players e resultados de filmes, séries e animes do site https://vizer.tv, pelo provedor WarezCDN.

Você também pode oferecer suporte a outras plataformas.



## Instalação

Instale o projeto com:

```bash
  npm install github:viniciusgdr/vizertv
```

## Aviso

Depois de uma atualização no WarezCDN em relação a bloqueio de acesso de fora do site, o player de séries e animes está sem funcionar no momento. Estou trabalhando para driblar isso e trazer de volta o player de séries e animes. 

Atualmente, o player de filmes está funcionando normalmente porque consegui driblar o bloqueio usando o Puppeteer.

O de séries e animes está em desenvolvimento, pois requer cliques em botões e inputs para conseguir o link do player.

**Caso não queira usar os players, o download está funcionando normalmente para filmes, séries e animes.**

## Uso

#### Buscar Filmes/Séries/Animes

```typescript
import { VizerTV } from "vizertv-v2";
const vizer = makeFilmProvider("vizer");

const search = await vizer.getSearch.get("greys anatomy");
console.log(search);
```

#### Buscar Detalhes de um Filme/Série/Anime
```typescript
const result = await vizer.getInfo.get(
  "https://vizertv.in/serie/online/greys-anatomy"
);
console.log(result);
/*
{
  name: string
  year: string
  rate: string
  duration: string
  description: string
  image: string
  players: Player[]
  warezcdn: string
  movieId: string
  movieType: 'filme'
} | {
  name: string
  year: string
  rate: string
  duration: string
  description: string
  image: string
  warezcdn: string
  movieId: string
  movieType: 'serie'
  seasons: Season[]
}
*/
```
####  Buscar Episódios de uma Série
```typescript
import { VizerTV } from "vizertv-v2";
const episodes = await vizer.seasonEpisodes.load(
  result.seasons[0].dataSeasonId
);
console.log(episodes);
```
#### Buscar Player de uma Série/Anime
```typescript
import { VizerTV } from "vizertv-v2";
const player = await vizer.getPlayerEpisode.load(episodes[0].id);
console.log(player);
```

#### Download de Filmes/Séries/Animes
```typescript
import { VizerTV } from "vizertv-v2";
const download = await vizer.getDownloads.get(result.movieId, result.movieType);
console.log(download);
```

Retorno:

```typescript
{
  url: string;
  // Response é o fetch do video, você pode baixar usando (await urlDownload.buffer())
  urlDownload: Response | null; // Se não for encontrado o download ou deu erro, retorna null
  type: TypeAudio;
}
```
