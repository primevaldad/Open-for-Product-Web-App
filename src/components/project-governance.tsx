
import React from 'react';
import type { Governance } from '@/lib/types';

interface ProjectGovernanceProps {
    governance: Governance | undefined;
}

const ProjectGovernance: React.FC<ProjectGovernanceProps> = ({ governance }) => {
    if (!governance) {
        return <p>No governance model defined for this project.</p>;
    }

    const { contributorsShare, communityShare, sustainabilityShare } = governance;

    return (
        <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Governance Model</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold">{contributorsShare}%</p>
                    <p className="text-sm text-gray-600">Contributors</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{communityShare}%</p>
                    <p className="text-sm text-gray-600">Community</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{sustainabilityShare}%</p>
                    <p className="text-sm text-gray-600">Sustainability</p>
                </div>
            </div>
        </div>
    );
};

export default ProjectGovernance;
