import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign } from '@/core/context/CampaignContext';
import { useCharacters } from '../hooks/useCharacters';
import { useCharacter } from '../hooks/useCharacter';
import { CharacterList } from './CharacterList';
import { CharacterSheet } from './CharacterSheet';
import { CharacterEditor } from './CharacterEditor';
import type { Character } from '../types';

interface CharacterDashboardProps {
  mode?: 'list' | 'detail' | 'edit' | 'new';
}

export function CharacterDashboard({ mode = 'list' }: CharacterDashboardProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const { id } = useParams<{ id: string }>();

  const { characters, loading: listLoading } = useCharacters(currentCampaign?.id || null);
  const {
    character,
    loading: charLoading,
    updateCharacter,
    deleteCharacter,
  } = useCharacter(currentCampaign?.id || null, id || null);

  async function handleSave(data: Partial<Character>): Promise<boolean> {
    if (!currentCampaign) return false;

    try {
      if (mode === 'new') {
        // Create new character
        const response = await fetch(
          `/api/campaigns/${currentCampaign.id}/character`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create character');
        }

        return true;
      } else {
        // Update existing
        return await updateCharacter(data);
      }
    } catch (error) {
      console.error('Error saving character:', error);
      return false;
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this character?')) {
      return;
    }

    const success = await deleteCharacter();
    if (success) {
      navigate('/characters');
    }
  }

  if (!currentCampaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a campaign first</p>
      </div>
    );
  }

  if (mode === 'list') {
    if (listLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return <CharacterList characters={characters} />;
  }

  if (mode === 'new') {
    return <CharacterEditor onSave={handleSave} />;
  }

  if (mode === 'edit') {
    if (charLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!character) {
      return <div className="flex items-center justify-center h-64">Character not found</div>;
    }

    return <CharacterEditor character={character} onSave={handleSave} />;
  }

  if (mode === 'detail') {
    if (charLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!character) {
      return <div className="flex items-center justify-center h-64">Character not found</div>;
    }

    return <CharacterSheet character={character} onDelete={handleDelete} />;
  }

  return null;
}
