const commonMutations = [
  { from: "meta", to: "metaverse" },
  { from: "quantum", to: "quant" },
  { from: "block", to: "blockchain" },
  { from: "token", to: "coin" },
  { from: "wallet", to: "vault" },
  // Additional crypto-related mutations
  { from: "chain", to: "blockchain" },
  { from: "crypto", to: "cryptocurrency" },
  { from: "nft", to: "token" },
  { from: "defi", to: "finance" },
  { from: "dao", to: "organization" },
]

/**
 * Mutates a phrase using various transformation strategies
 * @param {string} phrase - The original phrase to mutate
 * @param {Object} options - Configuration options
 * @param {number} options.mutationRate - Probability of word mutation (0-1)
 * @param {boolean} options.allowCasing - Allow random casing changes
 * @param {boolean} options.allowRemoval - Allow word removal
 * @returns {string} The mutated phrase
 */
function mutatePhrase(phrase, options = {}) {
  const { mutationRate = 0.2, allowCasing = true, allowRemoval = true } = options

  const words = phrase.split(" ")

  // Randomly mutate some words
  let mutatedWords = words.map((word) => {
    if (Math.random() < mutationRate) {
      // Default 20% chance to mutate
      const mutation = commonMutations.find((m) => word.toLowerCase().includes(m.from.toLowerCase()))
      if (mutation) {
        return word.replace(new RegExp(mutation.from, "i"), mutation.to)
      }
    }
    return word
  })

  // Random casing mix (5% chance)
  if (allowCasing && Math.random() < 0.05) {
    mutatedWords = mutatedWords.map((w) => (Math.random() > 0.5 ? w.toUpperCase() : w.toLowerCase()))
  }

  // Word removal (simulate human error, 2% chance)
  if (allowRemoval && mutatedWords.length > 12 && Math.random() < 0.02) {
    const indexToRemove = Math.floor(Math.random() * mutatedWords.length)
    mutatedWords.splice(indexToRemove, 1)
  }

  return mutatedWords.join(" ")
}

/**
 * Generates multiple mutations of a phrase
 * @param {string} phrase - The original phrase
 * @param {number} count - Number of mutations to generate
 * @param {Object} options - Mutation options
 * @returns {string[]} Array of mutated phrases
 */
function generateMutations(phrase, count = 5, options = {}) {
  const mutations = []
  for (let i = 0; i < count; i++) {
    mutations.push(mutatePhrase(phrase, options))
  }
  return mutations
}

/**
 * Applies a specific mutation strategy to a phrase
 * @param {string} phrase - The original phrase
 * @param {string} strategy - The mutation strategy ('substitute', 'case', 'remove')
 * @returns {string} The mutated phrase
 */
function applyMutationStrategy(phrase, strategy) {
  const words = phrase.split(" ")
  let result = [...words]

  switch (strategy) {
    case "substitute":
      result = words.map((word) => {
        const mutation = commonMutations.find((m) => word.toLowerCase().includes(m.from.toLowerCase()))
        return mutation ? word.replace(new RegExp(mutation.from, "i"), mutation.to) : word
      })
      break
    case "case":
      result = words.map((w) => (Math.random() > 0.5 ? w.toUpperCase() : w.toLowerCase()))
      break
    case "remove":
      if (words.length > 12) {
        const indexToRemove = Math.floor(Math.random() * words.length)
        result.splice(indexToRemove, 1)
      }
      break
    default:
      // No mutation
      break
  }

  return result.join(" ")
}

module.exports = {
  mutatePhrase,
  generateMutations,
  applyMutationStrategy,
  commonMutations,
}
