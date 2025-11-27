'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/_components/ui/button';

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/_components/ui/command';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/_components/ui/popover';

import { useAgents } from '@/hooks/react-query/agents/use-agents';

interface AgentSelectorProps {
    selectedAgentId?: string;
    onAgentSelect: (agentId: string | undefined) => void;
    disabled?: boolean;
    className?: string;
}

export function AgentSelector({
    selectedAgentId,
    onAgentSelect,
    disabled = false,
    className,
}: AgentSelectorProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const { data: agentsResponse, isLoading } = useAgents();

    // Safe array
    const agents = Array.isArray(agentsResponse) ? agentsResponse : [];

    // Selectors
    const selectedAgent = agents.find((a) => a.agent_id === selectedAgentId);

    // FIX HERE — use `isDefault` not `is_default`
    const defaultAgent = agents.find((a) => a.is_default);

    useEffect(() => {
        // Auto-select default agent
        if (!selectedAgentId && defaultAgent && !isLoading) {
            onAgentSelect(defaultAgent.agent_id);
        }
    }, [selectedAgentId, defaultAgent, isLoading, onAgentSelect]);

    const handleCreateNew = () => {
        setOpen(false);
        router.push('/agents');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'h-7 px-2 text-[12px] text-gray-300 bg-[#1f1f1f]/40 border border-[#3a3a3a] rounded-md flex items-center justify-between gap-1 shadow-none transition-all duration-150 hover:bg-[#2a2a2a] focus-visible:ring-0 focus-visible:outline-none',
                        !selectedAgent && 'text-muted-foreground',
                        className
                    )}
                >
                    <span className="truncate">
                        {isLoading
                            ? 'Loading…'
                            : selectedAgent?.name || 'Select agent'}
                    </span>

                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="ml-1 h-3 w-3 opacity-60"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                    </svg>
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                sideOffset={6}
                className="w-64 p-0 bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg shadow-lg !backdrop-blur-none !bg-opacity-100 !bg-[#2f2f2f] !text-gray-100"
                style={{
                    backgroundColor: '#2f2f2f',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                }}
            >
                <Command>
                    <CommandInput
                        placeholder="Search agents..."
                        className="h-8 text-xs bg-[#1f1f1f] border-0 placeholder-gray-500 text-gray-200 focus:ring-0"
                    />

                    <CommandList className="max-h-[240px] overflow-y-auto">
                        <CommandEmpty className="text-gray-400 px-3 py-2">
                            No agents found
                        </CommandEmpty>

                        {/* AGENT LIST */}
                        <CommandGroup
                            heading={
                                <span className="text-xs font-medium text-gray-400 tracking-wide">
                                    Available agents
                                </span>
                            }
                            className="px-1 py-1"
                        >
                            {agents.map((agent, index) => (
                                <CommandItem
                                    key={agent.agent_id || `${agent.name}-${index}`}
                                    value={agent.agent_id}
                                    onSelect={() => {
                                        onAgentSelect(agent.agent_id);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'flex items-center justify-between text-[13px] text-gray-200 px-2 py-1.5 rounded-md hover:bg-[#3a3a3a]',
                                        selectedAgentId === agent.agent_id && 'bg-[#3a3a3a]'
                                    )}
                                >
                                    <span className="truncate">{agent.name}</span>

                                    {selectedAgentId === agent.agent_id && (
                                        <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>

                        {/* ACTIONS */}
                        <CommandGroup
                            heading={
                                <span className="text-xs font-medium text-gray-400 tracking-wide">
                                    Actions
                                </span>
                            }
                            className="px-1 py-1 border-t border-[#3a3a3a] mt-1"
                        >
                            <CommandItem
                                onSelect={handleCreateNew}
                                className="text-gray-400 text-[13px] hover:text-white flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4 text-gray-400" />
                                Create new agent
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
