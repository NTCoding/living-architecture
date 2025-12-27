module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid generic names (Utils, Helper, Service, Handler, etc) in filenames, class names, and exports',
      recommended: true,
    },
  },
  create(context) {
    const filename = context.getFilename()

    const forbiddenWordsWithSuggestions = {
      'utils': 'Use domain-specific name describing what it does',
      'helpers': 'Try "fixtures" for test data, or name by purpose',
      'helper': 'Try "fixtures" for test data, or name by purpose',
      'service': 'Name by domain action (e.g., OrderSubmitter, PaymentGateway)',
      'services': 'Name by domain action (e.g., OrderSubmitter, PaymentGateway)',
      'manager': 'Name by responsibility (e.g., ConnectionPool, SessionStore)',
      'managers': 'Name by responsibility (e.g., ConnectionPool, SessionStore)',
      'processor': 'Name by what it processes (e.g., OrderFulfiller, EventDispatcher)',
      'processors': 'Name by what it processes (e.g., OrderFulfiller, EventDispatcher)',
      'data': 'Name by domain concept (e.g., OrderDetails, CustomerProfile)',
    }

    const forbiddenWords = Object.keys(forbiddenWordsWithSuggestions)
    const forbiddenPattern = new RegExp(
      `(^|/|-)(${ forbiddenWords.join('|') })(-|[.]ts$|[.]tsx$|/|$)`,
      'i'
    )

    const findForbiddenWord = (text) => {
      const lowerText = text.toLowerCase()
      return forbiddenWords.find(word => lowerText.includes(word))
    }

    const isForbiddenName = (name) => {
      if (!name) return false

      return forbiddenWords.some(word => {
        const lowerName = name.toLowerCase()
        return (
          lowerName === word ||
          lowerName.startsWith(word) ||
          lowerName.endsWith(word)
        )
      })
    }

    const getFilenameMessage = (filepath) => {
      const matchedWord = findForbiddenWord(filepath)
      if (matchedWord) {
        const suggestion = forbiddenWordsWithSuggestions[matchedWord]
        return `Generic word "${matchedWord}" in filename. ${suggestion}`
      }
      return 'Generic filename. Use domain-specific naming.'
    }

    const getClassMessage = (className) => {
      const matchedWord = findForbiddenWord(className)
      if (matchedWord) {
        const suggestion = forbiddenWordsWithSuggestions[matchedWord]
        return `Generic word "${matchedWord}" in class "${className}". ${suggestion}`
      }
      return `Generic class name "${className}". Use domain-specific naming.`
    }

    return {
      ClassDeclaration(node) {
        if (node.id && isForbiddenName(node.id.name)) {
          context.report({
            node: node.id,
            message: getClassMessage(node.id.name),
          })
        }
      },

      Program(node) {
        if (forbiddenPattern.test(filename)) {
          context.report({
            node,
            message: getFilenameMessage(filename),
          })
        }
      },
    }
  },
}
