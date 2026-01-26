import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';
import { fileStore } from '../../core/file-store.js';
import { campaignManager } from '../../core/campaign-manager.js';
import type { GeneratedNPC, NPCGenerateInput } from '../../../shared/schemas/npc.js';

const client = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

async function getLoreContext(campaignId: string): Promise<string> {
  try {
    const loreFiles = await fileStore.list(campaignId, 'lore');
    if (loreFiles.length === 0) {
      return '';
    }

    // Get full content of world and faction lore (most relevant for NPC generation)
    const relevantTypes = ['world', 'faction', 'religion', 'other'];
    const contextParts: string[] = [];

    for (const loreMeta of loreFiles) {
      if (relevantTypes.includes(loreMeta.type as string)) {
        const lore = await fileStore.get(campaignId, 'lore', loreMeta.id);
        if (lore) {
          contextParts.push(`## ${lore.frontmatter.name} (${loreMeta.type})\n${lore.content}`);
        }
      }
    }

    if (contextParts.length === 0) {
      return '';
    }

    return `# Campaign Setting & Lore\n\n${contextParts.join('\n\n')}`;
  } catch (error) {
    console.error('Error fetching lore context:', error);
    return '';
  }
}

export async function generateNPC(input: NPCGenerateInput): Promise<GeneratedNPC> {
  const campaign = campaignManager.getActive();
  if (!campaign) {
    throw new Error('No active campaign');
  }

  if (!config.anthropic.apiKey) {
    throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY in your environment.');
  }

  const loreContext = await getLoreContext(campaign.id);

  const systemPrompt = `You are a creative assistant helping a tabletop RPG game master create NPCs (non-player characters) for their campaign.

${loreContext ? `The following is the campaign setting and lore. Use this context to make the NPC fit naturally into the world:\n\n${loreContext}\n\n---\n\n` : ''}

When creating an NPC, you must respond with a valid JSON object (no markdown code blocks, just the raw JSON) containing these fields:
- name (string, required): A fitting name for the character
- occupation (string): Their role or profession
- location (string): Where they can typically be found
- appearance (string): Physical description (2-3 sentences)
- personality (string): Key personality traits and demeanor (2-3 sentences)
- goals (string): What they want or are working toward
- dmOnly (object with optional fields):
  - secrets (string): Hidden information only the DM should know
  - voice (string): How they speak, mannerisms, accent suggestions
- content (string): Additional backstory or notes (can be longer, use \\n for line breaks)
- tags (array of strings): 3-5 relevant tags for categorization

Make the character interesting, memorable, and useful for gameplay. Include specific details that could become plot hooks.`;

  const message = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Create an NPC based on this description: ${input.prompt}${input.includeSecrets === false ? '\n\nNote: Do not include any secrets or DM-only information.' : ''}`,
      },
    ],
  });

  // Extract text content from response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  try {
    // Remove any markdown code blocks if present
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const generated = JSON.parse(jsonText) as GeneratedNPC;

    // Validate required fields
    if (!generated.name) {
      throw new Error('Generated NPC missing required name field');
    }

    return generated;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', textBlock.text);
    throw new Error('Failed to parse NPC data from Claude response');
  }
}
