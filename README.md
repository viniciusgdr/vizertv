
# Vizer TV - Filmes, Séries e Animes

O Projeto consegue capturar os players e resultados de filmes, séries e animes do site https://vizer.tv, pelo provedor WarezCDN.




## Instalação

Instale vizertv com npm

```bash
  npm install github:viniciusgdr/vizertv
```
    
## Funcionalidades

Procurar Filmes, animes e séries.
```ts
let vizer = new Vizer()
let search = await vizer.search({ 
    query: "Velozes e Furiosos", 
    type: 'movie' | 'serie'
})
console.log(search)
```

Pegar informações sobre determinado filme, anime ou série.
```ts
let vizer = new Vizer()
let info = await vizer.getInfo({ url: 'url' })
console.log(info)
```
Conseguir todas as temporadas e episódios
```ts
let temporadas = await vizer.listSerieEpisodes({
   url: search[0].url
})
/*
 {
    "number": 1,
    "episodes": [
      {
        "id": "43521",
        "name": "1",
        "title": "Burnt Food"
      },
      {
        "id": "43522",
        "name": "2",
        "title": "Mount Rushmore"
      },
      ...
   ]
*/
```
Conseguir o Player (WarezCDN, etc)
```ts
let player = await vizer.getPlayer({ 
    url: search[0].url, 
    imdbTT: info.imdbTT, 
    language: 'pt' 
})
console.log(player)
```

Conseguir Player de Séries e animes
```ts
let player = await vizer.getPlayerSerie({
        id: player[0].episodes[0].id,
        language: 'pt',
        imdbTT: info.imdbTT
})
```
