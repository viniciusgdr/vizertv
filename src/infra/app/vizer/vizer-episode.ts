import { type GetPlayerEpisodeRepository } from '../../../data/protocols/get-player-episode-repository'
import { getEmbeds, sendRequestAPI } from './vizer'

export class VizerEpisodeRepository implements GetPlayerEpisodeRepository {
  async load (id: string): Promise<GetPlayerEpisodeRepository.Result[]> {
    const episode = await sendRequestAPI({
      getEpisodeData: id
    })

    const list = Object.keys(episode.list)
    return list.map((key) => {
      const players = JSON.parse(episode.list[key].players)
      return {
        dataLoadPlayer: episode.list[key].id,
        typeAudio: episode.list[key].lang === '1' ? 'leg' : 'dub',
        players: getEmbeds(episode.list[key].id, players)
      }
    })
  }
}
