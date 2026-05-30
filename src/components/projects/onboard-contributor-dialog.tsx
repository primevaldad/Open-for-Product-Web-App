'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { submitOnboardingAction } from '@/app/actions/queen';
import { Loader2, Send, Sparkles } from 'lucide-react';

// Firebase AI
import { app } from '@/lib/firebase';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface OnboardContributorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
    projectMission?: string;
    isQueenEnabled?: boolean;
    onJoinManually?: () => void;
}

const ai = getAI(app, { backend: new GoogleAIBackend() });

const systemInstruction = `You are Queen, the AI project manager. 
Your goal is to quickly interview a new contributor joining the project.
Ask 2-3 brief questions to understand:
1. Their goals (why they are joining)
2. Their primary skills
3. How many hours a week they can contribute.

Keep your messages very short and conversational. One question at a time.
Once you have enough information, say exactly: "INTERVIEW_COMPLETE".`;

const finalSummaryInstruction = `Based on the previous conversation, extract the user's profile and recommend 1-2 initial tasks they could do. 
Respond ONLY with a valid JSON object matching this schema, no markdown blocks:
{
  "profile": {
    "goals": "string summary of goals",
    "skills": ["skill1", "skill2"],
    "hoursPerWeek": number,
    "contributionStyle": "string"
  },
  "actions": [
    {
      "type": "task_recommendation",
      "payload": {
        "title": "Proposed task title",
        "description": "Why this fits their skills"
      }
    }
  ]
}`;

export function OnboardContributorDialog({ isOpen, onClose, projectId, projectName, projectMission, isQueenEnabled, onJoinManually }: OnboardContributorDialogProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const chatRef = useRef<any>(null);
    const { toast } = useToast();

    const [mockStep, setMockStep] = useState(0);

    // Initialize chat session
    useEffect(() => {
        if (isOpen && isQueenEnabled && messages.length === 0) {
            const initChat = async () => {
                setIsThinking(true);
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                setMessages([{ role: 'model', text: "Hello! I'm Queen. What brings you to this project?" }]);
                setIsThinking(false);
            };
            initChat();
        }
    }, [isOpen, isQueenEnabled, messages.length]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setInput('');
        setIsThinking(true);

        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            let modelText = "";
            const nextStep = mockStep + 1;
            
            if (nextStep === 1) {
                modelText = "That's wonderful! What are your primary skills that you'd like to use here?";
            } else if (nextStep === 2) {
                modelText = "Great skills. Roughly how many hours a week do you think you can contribute?";
            } else {
                modelText = "INTERVIEW_COMPLETE";
            }
            
            setMockStep(nextStep);

            if (modelText.includes('INTERVIEW_COMPLETE')) {
                await finalizeInterview();
            } else {
                setMessages(prev => [...prev, { role: 'model', text: modelText }]);
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to communicate with Queen.', variant: 'destructive' });
        } finally {
            setIsThinking(false);
        }
    };

    const finalizeInterview = async () => {
        setIsSaving(true);
        setMessages(prev => [...prev, { role: 'model', text: 'Thank you! I am setting up your profile and recommending your first tasks...' }]);
        
        try {
            // Simulate AI JSON generation delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Hardcoded mock data
            const dataStr = JSON.stringify({
                profile: {
                    goals: "Learn new skills and contribute to a cool project.",
                    skills: ["React", "TypeScript", "Design"],
                    hoursPerWeek: 5,
                    contributionStyle: "Async and self-directed"
                },
                actions: [
                    {
                        type: "task_recommendation",
                        payload: {
                            title: "Review the current design system",
                            description: "Since you have design skills, it would be great to get your eyes on our current components."
                        }
                    },
                    {
                        type: "task_recommendation",
                        payload: {
                            title: "Fix open TypeScript warnings",
                            description: "A good first issue to get familiar with the codebase."
                        }
                    }
                ]
            });
            const data = JSON.parse(dataStr);

            // Save to Firestore
            const saveRes = await submitOnboardingAction(projectId, data.profile, data.actions);
            if (saveRes.success) {
                toast({ title: 'Welcome aboard!', description: 'Your profile has been created and Queen has queued up some recommendations for the Lead.' });
                onClose();
            } else {
                toast({ title: 'Save Failed', description: saveRes.error, variant: 'destructive' });
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Error processing interview', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        {isQueenEnabled ? 'Chat with Queen' : 'Session Queen Disabled'}
                    </DialogTitle>
                    <DialogDescription>
                        {isQueenEnabled 
                            ? 'Queen wants to get to know you to recommend the best ways to contribute.'
                            : 'Session Queen wants to help you onboard, but she is currently deactivated. Ask the administrator to turn her on!'}
                    </DialogDescription>
                </DialogHeader>

                {!isQueenEnabled ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <p className="text-muted-foreground text-center">
                            You can still join the project manually and introduce yourself to the team in the discussions tab.
                        </p>
                        <Button onClick={onJoinManually}>
                            Continue without Queen
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-md bg-muted/20">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${
                                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Queen is typing...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="mt-4 sm:justify-start flex-col gap-2">
                            <form 
                                className="flex w-full gap-2"
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            >
                                <Input 
                                    value={input} 
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your answer..."
                                    disabled={isThinking || isSaving}
                                    className="flex-1"
                                />
                                <Button type="submit" disabled={!input.trim() || isThinking || isSaving}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
