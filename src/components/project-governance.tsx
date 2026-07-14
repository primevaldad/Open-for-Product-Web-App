
import React from 'react';
import type { Project } from '@/lib/types';

interface ProjectGovernanceProps {
    governance: Project['governance'];
}

const ProjectGovernance: React.FC<ProjectGovernanceProps> = ({ governance }) => {
    if (!governance) {
        return <p className="text-gray-400">No governance model defined for this project.</p>;
    }

    const { contributorsShare, communityShare, sustainabilityShare } = governance;

    return (
        <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-bold mb-4 text-white">Governance Model</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold text-green-400">{contributorsShare}%</p>
                    <p className="text-sm text-gray-400">Contributors</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-blue-400">{communityShare}%</p>
                    <p className="text-sm text-gray-400">Community</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-purple-400">{sustainabilityShare}%</p>
                    <p className="text-sm text-gray-400">Sustainability</p>
                </div>
            </div>
        </div>
    );
};

export default ProjectGovernance;
