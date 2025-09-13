export type TypeAudio = 'dub' | 'leg'

export interface DataPlayers {
  mixdrop: 0 | 3
  streamtape: 0 | 3
  warezcdn: 0 | 3
}

export interface Player {
  dataLoadPlayer: string
  typeAudio: TypeAudio
  players: string[]
  m3u8Players?: string[]
}

export interface Season {
  number: number
  dataSeasonId: string
}

export type MovieType = 'filme' | 'serie'
