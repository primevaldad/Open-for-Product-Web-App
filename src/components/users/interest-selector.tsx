
'use client';

import * as React from 'react';
import TagSelector from '@/components/tags/tag-selector';
import type { GlobalTag, ProfileTag } from '@/lib/types';

interface InterestSelectorProps {
  availableTags: GlobalTag[];
  value: ProfileTag[];
  onChange: (value: ProfileTag[]) => void;
}

const interestTagFactory = (tag: { id: string; display: string }): ProfileTag => {
  return {
    id: tag.id,
    display: tag.display,
  };
};

export function InterestSelector({ availableTags, value, onChange }: InterestSelectorProps) {
  return (
    <TagSelector<ProfileTag>
      id="interest-selector"
      availableTags={availableTags}
      value={value}
      onChange={onChange}
      tagFactory={interestTagFactory}
    />
  );
}
