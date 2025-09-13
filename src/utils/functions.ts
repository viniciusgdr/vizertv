export const getstr = (string: string, start: string, end: string, i: number): string => {
  i++
  let str = string.split(start)
  str = str[i].split(end)
  return str[0]
}
