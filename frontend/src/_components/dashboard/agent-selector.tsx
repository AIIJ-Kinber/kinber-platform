'use client';

import React, { useState } from 'react';
import { ChevronDown, Plus, Star, Bot, Edit, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/lib/feature-flags';

interface AgentRecord {
  agent_id: string;
  name: string;
  description?: string;
  model_name?: string;
  persona?: string;
  avatar?: any;
  is_default?: boolean;
  isDefault?: boolean;
}

interface AgentSelectorProps {
  onAgentSelect?: (agentId: string | undefined) => void;
  selectedAgentId?: string;
  className?: string;
  variant?: 'default' | 'heading';
}

export function AgentSelector({
  onAgentSelect,
  selectedAgentId,
  className,
  variant = 'default',
}: AgentSelectorProps) {
  const { data: agentsResponse, isLoading, refetch: loadAgents } = useAgents();
  const { flags } = useFeatureFlags(['custom_agents']);
  const customAgentsEnabled = (flags as Record<string, boolean>)?.custom_agents;
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // --- Normalize agent list consistently ---
  const rawAgents =
    Array.isArray(agentsResponse)
      ? agentsResponse
      : agentsResponse && typeof agentsResponse === 'object' && 'agents' in agentsResponse
      ? (agentsResponse as any).agents
      : [];

  const agents: AgentRecord[] = rawAgents.map((a: any) => ({
    ...a,
    isDefault: a.is_default ?? a.isDefault ?? false,
  }));

  const defaultAgent = agents.find((a) => a.isDefault);
  const currentAgent = selectedAgentId
    ? agents.find((a) => a.agent_id === selectedAgentId)
    : null;

  const displayName = currentAgent?.name || defaultAgent?.name || 'Kinber';
  const agentAvatar = currentAgent?.avatar;
  const isUsingKinber = !currentAgent && !defaultAgent;

  const handleAgentSelect = (agentId: string | undefined) => {
    onAgentSelect?.(agentId);
    setIsOpen(false);
  };

  const handleCreateAgent = () => {
    setCreateDialogOpen(true);
    setIsOpen(false);
  };

  const handleManageAgents = () => {
    router.push('/agents');
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onAgentSelect?.(undefined);
    setIsOpen(false);
  };

  // ---------------------
  // Render: HEADING MODE
  // ---------------------
  if (!customAgentsEnabled) {
    if (variant === 'heading') {
      return (
        <div className={cn('flex items-center', className)}>
          <span className="tracking-tight text-4xl font-semibold leading-tight text-primary">
            Kinber
          </span>
        </div>
      );
    }
  }

  if (isLoading) {
    if (variant === 'heading') {
      return (
        <div className={cn('flex items-center', className)}>
          <span className="tracking-tight text-4xl font-semibold leading-tight text-muted-foreground">
            Loading...
          </span>
        </div>
      );
    }

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading agents...</span>
        </div>
      </div>
    );
  }

  if (variant === 'heading') {
    return (
      <div className={cn('flex items-center', className)}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 px-2 py-1 h-auto hover:bg-transparent hover:text-primary transition-colors group"
            >
              <span className="underline decoration-dashed underline-offset-6 decoration-muted-foreground/50 tracking-tight text-4xl font-semibold leading-tight text-primary">
                {displayName}
                <span className="text-muted-foreground ml-2">
                  {agentAvatar && agentAvatar}
                </span>
              </span>
              <div className="flex items-center opacity-60 group-hover:opacity-100 transition-opacity">
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                <Edit className="h-4 w-4 text-muted-foreground ml-1" />
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[320px]">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">Select an agent</p>
              <p className="text-xs text-muted-foreground">You can create your own agent</p>
            </div>

            <DropdownMenuSeparator />

            {/* Kinber default */}
            <DropdownMenuItem
              onClick={() => handleClearSelection()}
              className="flex flex-col items-start gap-1 p-3 cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="font-medium truncate">Kinber</span>
                  <Badge variant="secondary" className="text-xs px-1 py-0 flex-shrink-0">
                    Default
                  </Badge>
                </div>
                {isUsingKinber && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <span className="text-xs text-muted-foreground pl-6 line-clamp-2">
                Your personal AI employee
              </span>
            </DropdownMenuItem>

            {/* Custom Agents */}
            {agents.length > 0 &&
              agents.map((agent) => (
                <DropdownMenuItem
                  key={agent.agent_id}
                  onClick={() => handleAgentSelect(agent.agent_id)}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    {agent.avatar ? agent.avatar : <Bot className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="font-medium truncate">{agent.name}</span>
                      {agent.isDefault && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                          System
                        </Badge>
                      )}
                    </div>
                    {currentAgent?.agent_id === agent.agent_id && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>

                  {agent.description && (
                    <span className="text-xs text-muted-foreground pl-6 line-clamp-2">
                      {agent.description}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleCreateAgent}>Agents</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // ---------------------
  // Render: DEFAULT MODE
  // ---------------------
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="flex items-center gap-2 px-3 py-2 h-auto min-w-[200px] justify-between"
          >
            <div className="flex items-center gap-2">
              {isUsingKinber ? (
                <User className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Bot className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{displayName}</span>

                  {isUsingKinber && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Default
                    </Badge>
                  )}

                  {currentAgent?.isDefault && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                      System
                    </Badge>
                  )}
                </div>

                {currentAgent?.description ? (
                  <span className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]">
                    {currentAgent.description}
                  </span>
                ) : isUsingKinber ? (
                  <span className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]">
                    Your personal AI employee
                  </span>
                ) : null}
              </div>
            </div>

            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px]">
          {/* Kinber option */}
          <DropdownMenuItem
            onClick={() => handleClearSelection()}
            className="flex flex-col items-start gap-1 p-3 cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1 flex-1">
                <span className="font-medium">Kinber</span>
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  Default
                </Badge>
              </div>
              {isUsingKinber && <div className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <span className="text-xs text-muted-foreground pl-6 line-clamp-2">
              Your personal AI employee
            </span>
          </DropdownMenuItem>

          {/* Custom agents */}
          {agents.length > 0 &&
            agents.map((agent) => (
              <DropdownMenuItem
                key={agent.agent_id}
                onClick={() => handleAgentSelect(agent.agent_id)}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-1 flex-1">
                    <span className="font-medium">{agent.name}</span>
                    {agent.isDefault && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                        System
                      </Badge>
                    )}
                  </div>

                  {currentAgent?.agent_id === agent.agent_id && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>

                {agent.description && (
                  <span className="text-xs text-muted-foreground pl-6 line-clamp-2">
                    {agent.description}
                  </span>
                )}
              </DropdownMenuItem>
            ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleCreateAgent} className="cursor-pointer">
            <Plus className="h-4 w-4" />
            Create New Agent
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleManageAgents} className="cursor-pointer">
            <Bot className="h-4 w-4" />
            Manage All Agents
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
