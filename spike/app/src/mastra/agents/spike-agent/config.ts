import { agentConfig } from '@mastra/core/agent'

export default agentConfig({
  model: 'openai/gpt-5.6-sol',
  description: 'A spike agent, used to check the file based layout.',
})
