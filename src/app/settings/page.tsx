
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Save } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const [apiKey, setApiKey] = React.useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
    }, []);

    const handleSave = () => {
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
            toast({
                title: 'API Key Saved!',
                description: 'Your Google AI API key has been saved locally.',
            });
            // Optional: force a reload to make sure all parts of the app use the new key
            window.location.reload();
        } else {
            localStorage.removeItem('gemini_api_key');
            toast({
                title: 'API Key Removed',
                description: 'Your API key has been removed from local storage.',
            });
        }
    };

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-background to-slate-900 p-4">
            <Card className="w-full max-w-lg bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline tracking-wider flex items-center gap-3"><KeyRound className="h-6 w-6 text-primary" /> API Key Settings</CardTitle>
                    <CardDescription>
                        Your Google AI API key is stored securely in your browser&apos;s local storage and is never sent to our servers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="api-key">Your Google AI API Key</Label>
                            <Input
                                id="api-key"
                                type="password"
                                placeholder="Enter your API key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                You can get a free API key from {' '}
                                <Link href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary underline">
                                    Google AI Studio
                                </Link>.
                            </p>
                        </div>
                        <Button onClick={handleSave} className="w-full font-bold">
                            <Save className="me-2" /> Save Key
                        </Button>
                         <Link href="/" passHref className='block w-full'>
                            <Button variant="outline" className="w-full">Go Back to Planner</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
