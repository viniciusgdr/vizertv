import { type Player } from '../models/player'

export interface GetPlayerEpisode {
  load: (dataEpisodeId: string) => Promise<GetPlayerEpisode.Result[]>
}

export namespace GetPlayerEpisode {
  export type Result = Player
}
