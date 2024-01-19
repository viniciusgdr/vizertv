import { type Info } from '../models/info'

export interface GetInfo {
  get: (idOrUrl: string) => Promise<Info>
}
