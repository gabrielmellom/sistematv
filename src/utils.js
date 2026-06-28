export function getPollMetrics(options = []) {
  const totalVotes = options.reduce((sum, option) => sum + (option.votes || 0), 0)

  return {
    totalVotes,
    rows: options.map((option) => {
      const voteCount = option.votes || 0
      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

      return {
        ...option,
        voteCount,
        percentage,
      }
    }),
  }
}

/** Classe CSS do grid da TV conforme quantidade de opcoes. */
export function getTvOptionsLayoutClass(count) {
  if (count === 1) return 'tv-options-grid--1'
  if (count === 3) return 'tv-options-grid--3'
  if (count === 5) return 'tv-options-grid--5'
  return 'tv-options-grid--pairs'
}
