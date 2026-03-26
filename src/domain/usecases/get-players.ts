import { type Player } from '../models/player'

export interface GetPlayers {
  get: () => Promise<Player[]>
}
