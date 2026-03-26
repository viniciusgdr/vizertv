export type TypeAudio = 'dub' | 'leg'

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
