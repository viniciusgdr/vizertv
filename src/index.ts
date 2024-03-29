import cheerio, { load } from 'cheerio';
import got from 'got';
import { getstr } from "./utils/getstr";
import { ICasts } from "./interfaces/Vizer";
import { publicFunctionsVizer } from './functions/publicFunctionsVizer';

export class Vizer {
    constructor() { }
    public async search({
        quantity,
        query,
        type
    }: Vizer.SearchOptions): Promise<Vizer.SearchResult[]> {
        let { body: html } = await got.get('https://vizer.tv/pesquisar/' + query, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
            }
        })
        let $ = cheerio.load(html)

        let results: Vizer.SearchResult[] = []
        $('div.listItems > a').each((i, elem) => {
            let url = $(elem).attr('href')
            if (
                (!quantity || i < quantity) &&
                (type == 'serie' ? url.includes('serie') ? true : false : type == 'movie' ? url.includes('filme') ? true : false : true)
            ) results.push({
                title: $(elem).find('div.infos > span').text().trim(),
                url: 'https://vizer.tv/' + url,
                image: 'https://vizer.tv' + $(elem).find('picture > img').attr('src') || null,
                yearFilm: $(elem).find('div.y').text().trim() || null,
                rateFilm: $(elem).find('div.r').text().trim() || null
            })
        })
        return results
    }
    public async getInfo({
        url
    }: Vizer.GetInfoOptions): Promise<Vizer.GetInfoResult> {
        let { body: html } = await got.get(url, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
            }
        })
        let $ = cheerio.load(html)
        let result: Vizer.GetInfoResult = {
            title: $('#ms > div:nth-child(1) > section > h2').text().trim(),
            imdb: $('#ms > div:nth-child(1) > section > div.infos > a').attr('href') || null,
            imdbTT: $('#ms > div:nth-child(1) > section > div.infos > a').attr('href').trim().split('/')[4] || null,
            film: {
                year: $('#ms > div:nth-child(1) > section > div.infos > div.year').text().trim() || null,
                rate: $('#ms > div:nth-child(1) > section > div.infos > a').text().trim() + '/10' || null,
                time: $('#ms > div:nth-child(1) > section > div.infos > div.dur > div.tm').text().trim() || null,
                image: 'https://vizer.tv' + $('#ms > div:nth-child(1) > div > picture > img').attr('src') || null,
                casts: $('#castList > a').map((i, elem) => {
                    return {
                        name: $(elem).find('span').text().trim(),
                        picture: 'https://vizer.tv/' + $(elem).find('img').attr('src') || null
                    }
                }).toArray() as unknown as ICasts[] || null,
                description: $('#ms > div:nth-child(1) > section > span').text().trim() || null,
            }
        }
        return result
    }
    public async listSerieEpisodes({
        url
    }: Vizer.ListSerieEpisodesOptions): Promise<Vizer.ListSerieEpisodesResult[]> {
        let { body: html } = await got.get(url, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
            }
        })
        let $ = cheerio.load(html)
        let ids: { id: string; number: string }[] = []
        $('#seasons > .wrap > #seasonsList > div').each((i, elem) => {
            ids.push({
                id: $(elem).attr('data-season-id'),
                number: $(elem).text().trim()
            })
        })
        let result: Vizer.ListSerieEpisodesResult[] = []
        for (let i = 0; i < ids.length; i++) {
            let results: Vizer.ResultAPI.ResultEpisodes[] = []
            let epsode = await this.getEpisodes({ id: ids[i].id })
            for (let i2 = 0; i2 < epsode.length; i2++) {
                results.push(epsode[i2])
            }
            result.push({
                number: Number(ids[i].number),
                episodes: results
            })
        }
        return result
    }
    public async getPlayerSerie({
        id,
        imdbTT,
        language,
        temporada,
        episode
    }: Omit<Vizer.GetPlayerOptions, 'url'> & {
        id: string,
        temporada?: number,
        episode?: number
    }) {
        let html = await publicFunctionsVizer({
            getEpisodeLanguages: id
        })
        let obj: Vizer.ResultAPI.ObjID = JSON.parse(html)
        let list: Vizer.ResultAPI.List[] = Object.keys(obj.list).map(key => obj.list[key])

        if (language == 'pt') {
            let result = list.find(item => item.lang == '2')
            //console.log(list)
            if (result) {
                let player = await this.getEmbed({ id: result.id, data: JSON.parse(result.players) })
                //console.log(player)
                return {
                    isLanguageSelected: true,
                    warezcdn: episode && temporada ? `https://embed.warezcdn.net/serie/${imdbTT}/${temporada}/${episode}` : temporada ? `https://embed.warezcdn.net/serie/${imdbTT}/${temporada}` : `https://embed.warezcdn.net/serie/${imdbTT}`,
                    players: player,
                    id: Number(result.id)
                }
            } else {
                let player = await this.getEmbed({ id: list[0].id, data: JSON.parse(list[0].players) })
                return {
                    isLanguageSelected: false,
                    warezcdn: episode && temporada ? `https://embed.warezcdn.net/serie/${imdbTT}/${temporada}/${episode}` : temporada ? `https://embed.warezcdn.net/serie/${imdbTT}/${temporada}` : `https://embed.warezcdn.net/serie/${imdbTT}`,
                    players: player,
                    id: Number(list[0].id)
                }
            }
        }
    }
    public async getPlayer({
        url,
        imdbTT,
        language
    }: Vizer.GetPlayerOptions): Promise<Vizer.GetPlayerResult> {
        if (url.includes('serie')) throw new Error('The url is not a movie, use the getPlayerSerie method instead')
        let { body: html } = await got.get(url, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
            }
        })
        const $ = load(html)
        const audios = $('.area.audios > div').toArray().map((elem) => {
            return {
                playerId: $(elem).attr('data-load-player'),
                dataPlayers: $(elem).attr('data-players'),
                dataAudio: $(elem).attr('data-audio')
            }
        })

        if (language == 'pt') {
            let result = audios.find(item => item.dataAudio == 'dublado')
            if (result) {
                let player = await this.getEmbed({ id: result.playerId, data: JSON.parse(result.dataPlayers) })
                return {
                    isLanguageSelected: true,
                    warezcdn: 'https://embed.warezcdn.net/filme/' + imdbTT,
                    players: player,
                    id: Number(result.playerId)
                }
            } else {
                let player = await this.getEmbed({ id: audios[0].playerId, data: JSON.parse(audios[0].dataPlayers) })
                return {
                    isLanguageSelected: false,
                    warezcdn: 'https://embed.warezcdn.net/filme/' + imdbTT,
                    players: player,
                    id: Number(audios[0].playerId)
                }
            }
        }
    }
    private async getEpisodes({
        id
    }: Vizer.GetEmbedOptions): Promise<Vizer.ResultAPI.ResultEpisodes[]> {
        let html = await publicFunctionsVizer({
            getEpisodes: id
        })
        let obj: Vizer.ResultAPI.ObjID = JSON.parse(html)
        let list: Vizer.ResultAPI.ListEpisodes[] = Object.keys(obj.list).map(key => obj.list[key])
        return list.map(item => {
            return {
                id: item.id,
                name: item.name,
                title: item.title,
            }
        })
    }
    public async getDownload({
        id,
        player
    }: {
        id: number,
        player: string
    }): Promise<string> {
        if (player.includes('https://')) player = player.split('=')[2]
        let body = await publicFunctionsVizer({
            downloadVideo: id,
            player
        })
        let url = 'https://vizer.tv/' + JSON.parse(body)?.url
        try {
            let { body: body2 } = await got.get(url)
            let urlReal = getstr(body2, 'window.location.href="', '"', 0)
            return urlReal
        } catch (err) {
            return url
        }
    }
    private async getEmbed({
        id,
        data
    }: Vizer.GetEmbedOptions & {
        data: Vizer.ResultAPI.EmbedResult;
    }): Promise<string[]> {
        let players: string[] = []
        if (data.mixdrop == "3") {
            players.push(`https://vizer.tv/embed/getEmbed.php?id=${id}&sv=mixdrop`)
        }
        if (data.streamtape == "3") {
            players.push(`https://vizer.tv/embed/getEmbed.php?id=${id}&sv=streamtape`)
        }
        if (data.warezcdn == "3") {
            players.push(`https://vizer.tv/embed/getEmbed.php?id=${id}&sv=warezcdn`)
        }
        if (data.fembed == "3") {
            players.push(`https://vizer.tv/embed/getEmbed.php?id=${id}&sv=fembed`)
        }
        return players
    }
};

export namespace Vizer {
    export interface ListSerieEpisodesResult {
        number: number;
        episodes: ResultAPI.ResultEpisodes[];
    }
    export interface ListSerieEpisodesOptions {
        url: string
    }
    export interface GetEmbedOptions {
        id: string;
    }
    export namespace ResultAPI {
        export interface ResultEpisodes {
            id: string;
            name: string;
            title: string;
        }
        export interface ObjID {
            status: string;
            count: number;
            list: any;
        }
        export interface List {
            id: string;
            lang: string;
            players: string;
        }
        export interface ListEpisodes extends Omit<List, 'lang'> {
            img: string;
            name: string;
            released: boolean;
            seen: boolean;
            title: string;
        }
        export interface EmbedResult {
            fembed: "0" | "3";
            id: string;
            mixdrop: "0" | "3"
            status: "success"
            streamtape: "0" | "3"
            verified: "0" | "3"
            warezcdn: "0" | "3"
        }
    }
    export interface SearchOptions {
        query: string;
        quantity?: number;
        type: 'movie' | 'serie' | 'all';
    }
    export interface SearchResult {
        title: string;
        url: string;
        image: string | null;
        yearFilm: string | null;
        rateFilm: string | null;
    }
    export interface GetInfoOptions {
        url: string;
    }
    export interface GetInfoResult {
        title: string;
        imdb: string | null;
        imdbTT: string | null;
        film: {
            year: string | null;
            rate: string | null;
            time: string | null;
            image: string | null;
            casts: ICasts[] | null;
            description: string | null;
        }
    }
    export interface GetPlayerOptions {
        url: string;
        imdbTT: string | null;
        language: 'pt' | 'en';
    }
    export interface GetPlayerResult {
        isLanguageSelected: boolean;
        warezcdn: string;
        players: string[];
        id: number;
    }
}
