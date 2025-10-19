
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const popularInterests = [
  'React',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Python',
  'Data Science',
  'Machine Learning',
  'UI/UX Design',
];

interface InterestSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function InterestSelector({ value, onChange }: InterestSelectorProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddInterest = (interest: string) => {
    const newInterest = interest.trim();
    if (newInterest && !value.includes(newInterest)) {
      onChange([...value, newInterest]);
      setInputValue('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    onChange(value.filter(i => i !== interest));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {value.map(interest => (
          <Badge key={interest} variant="secondary">
            {interest}
            <button
              type="button"
              className="ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => handleRemoveInterest(interest)}
            >
              &times;
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddInterest(inputValue);
            }
          }}
          placeholder="Add an interest..."
        />
        <Button type="button" variant="outline" size="icon" onClick={() => handleAddInterest(inputValue)}>
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
       <div className="mt-4 flex flex-wrap gap-2">
        {popularInterests.map(interest => (
          <Button
            key={interest}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddInterest(interest)}
            disabled={value.includes(interest)}
          >
            {interest}
          </Button>
        ))}
      </div>
    </div>
  );
}
