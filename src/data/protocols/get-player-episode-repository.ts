import { type Player } from '../../domain/models/player'

export interface GetPlayerEpisodeRepository {
  load: (dataEpisodeId: string) => Promise<GetPlayerEpisodeRepository.Result[]>
}

export namespace GetPlayerEpisodeRepository {
  export type Result = Player
}
