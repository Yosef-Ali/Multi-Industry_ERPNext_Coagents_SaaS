/**
 * Co-Agent Mode Implementations
 * 
 * ERPNext-focused implementations of different co-agent modes:
 * - ChatCoAgent: Standard conversational mode
 * - DeveloperCoAgent: Single best-practice ERPNext solution generation
 * - AnalyzerCoAgent: Deep analysis with visualizations
 * - RefinerCoAgent: Iterative refinement
 */

import {
    IAIProvider,
    AIMessage,
    AIToolDefinition,
    MessageContent,
} from '../ai/types';
import { BaseCoAgent } from './base';
import {
    CoAgentMode,
    CoAgentConfig,
    CoAgentResponse,
    Artifact,
    ArtifactType,
    VariantGenerationRequest,
    RefinementRequest,
    VariantStrategy,
    VariantGenerationError,
    ArtifactParsingError,
} from './types';

/**
 * Chat Co-Agent
 * Standard conversational mode with single response
 */
export class ChatCoAgent extends BaseCoAgent {
    constructor(
        provider: IAIProvider,
        customConfig?: Partial<CoAgentConfig>
    ) {
        super(CoAgentMode.CHAT, provider, customConfig);
    }

    async generateResponse(
        request: VariantGenerationRequest
    ): Promise<CoAgentResponse> {
        try {
            // Build conversation history
            const messages: AIMessage[] = [
                {
                    role: 'system',
                    content: this.buildSystemPrompt(request),
                },
                ...(request.conversationHistory || []),
                {
                    role: 'user',
                    content: request.prompt,
                },
            ];

            // Get AI completion
            const completion = await this.provider.complete(messages, {
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
            });

            // Convert content to string
            const responseText = this.contentToString(completion.content);

            // Extract artifact from response
            const extractedArtifacts = this.extractArtifactsFromResponse(
                responseText,
                request.artifactType
            );

            let artifact: Artifact;
            if (extractedArtifacts.length > 0) {
                artifact = this.createArtifact(
                    request.artifactType,
                    extractedArtifacts[0].title || this.generateDefaultTitle(request),
                    extractedArtifacts[0].description || 'Generated solution',
                    extractedArtifacts[0].content
                );
            } else {
                // No code block found, use entire response as artifact
                artifact = this.createArtifact(
                    request.artifactType,
                    this.generateDefaultTitle(request),
                    'Generated solution',
                    responseText
                );
            }

            this.validateArtifact(artifact);

            // Convert usage format
            const usage = completion.usage
                ? {
                    promptTokens: completion.usage.input_tokens,
                    completionTokens: completion.usage.output_tokens,
                    totalTokens:
                        completion.usage.input_tokens + completion.usage.output_tokens,
                }
                : undefined;

            // Build response
            return {
                mode: CoAgentMode.CHAT,
                explanation: this.extractExplanation(responseText),
                artifacts: [artifact],
                followUpQuestions: this.config.suggestFollowUps
                    ? this.generateFollowUpQuestions([artifact], request.prompt)
                    : undefined,
                usage,
                timestamp: new Date(),
                threadId: request.threadId,
            };
        } catch (error) {
            throw new VariantGenerationError(
                `Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { originalError: error, request }
            );
        }
    }

    async refineArtifact(request: RefinementRequest): Promise<Artifact> {
        // For chat mode, refinement is not implemented yet
        throw new Error('Refinement not supported in chat mode. Use refiner mode.');
    }

    private buildSystemPrompt(request: VariantGenerationRequest): string {
        const artifactTypeInstructions = this.getArtifactTypeInstructions(
            request.artifactType
        );

        let prompt = `You are a helpful AI assistant specializing in ${artifactTypeInstructions.domain}.\n\n`;
        prompt += `When generating ${artifactTypeInstructions.name}, follow these guidelines:\n`;
        prompt += artifactTypeInstructions.guidelines.map((g) => `- ${g}`).join('\n');
        prompt += '\n\n';

        if (request.constraints && request.constraints.length > 0) {
            prompt += `Additional constraints:\n`;
            prompt += request.constraints.map((c) => `- ${c}`).join('\n');
            prompt += '\n\n';
        }

        if (request.preferences && request.preferences.length > 0) {
            prompt += `Preferences:\n`;
            prompt += request.preferences.map((p) => `- ${p}`).join('\n');
            prompt += '\n\n';
        }

        prompt += `Always wrap code in markdown code blocks with the appropriate language identifier.`;

        return prompt;
    }

    private extractExplanation(response: string): string {
        // Extract text before first code block
        const codeBlockIndex = response.indexOf('```');
        if (codeBlockIndex > 0) {
            return response.substring(0, codeBlockIndex).trim();
        }

        // If no code block, return first paragraph
        const firstParagraph = response.split('\n\n')[0];
        return firstParagraph.trim();
    }

    private generateDefaultTitle(request: VariantGenerationRequest): string {
        const typeNames: Record<ArtifactType, string> = {
            [ArtifactType.CODE]: 'Generated Code',
            [ArtifactType.REACT_COMPONENT]: 'React Component',
            [ArtifactType.HTML]: 'HTML Page',
            [ArtifactType.PYTHON]: 'Python Script',
            [ArtifactType.SQL]: 'SQL Query',
            [ArtifactType.JSON]: 'JSON Configuration',
            [ArtifactType.MARKDOWN]: 'Documentation',
            [ArtifactType.DIAGRAM]: 'Diagram',
            [ArtifactType.ERPNEXT_DOCTYPE]: 'ERPNext DocType',
            [ArtifactType.FRAPPE_WORKFLOW]: 'Frappe Workflow',
            [ArtifactType.ERPNEXT_FORM_UI]: 'Form Interface',
            [ArtifactType.ERPNEXT_LIST_VIEW]: 'List View',
            [ArtifactType.ERPNEXT_REPORT]: 'ERPNext Report',
            [ArtifactType.ERPNEXT_DASHBOARD]: 'ERPNext Dashboard',
            [ArtifactType.ERPNEXT_APP]: 'ERPNext Application',
            [ArtifactType.ERPNEXT_SERVER_SCRIPT]: 'Server Script',
            [ArtifactType.ERPNEXT_CLIENT_SCRIPT]: 'Client Script',
        };

        return typeNames[request.artifactType] || 'Generated Artifact';
    }

    private getArtifactTypeInstructions(type: ArtifactType): {
        domain: string;
        name: string;
        guidelines: string[];
    } {
        const instructions: Record<
            ArtifactType,
            { domain: string; name: string; guidelines: string[] }
        > = {
            [ArtifactType.CODE]: {
                domain: 'software development',
                name: 'code',
                guidelines: [
                    'Write clean, well-documented code',
                    'Follow industry best practices',
                    'Include helpful comments',
                    'Handle edge cases and errors',
                ],
            },
            [ArtifactType.REACT_COMPONENT]: {
                domain: 'React development',
                name: 'React components',
                guidelines: [
                    'Use functional components with hooks',
                    'Follow React best practices',
                    'Include TypeScript types',
                    'Make components reusable',
                    'Add proper prop validation',
                ],
            },
            [ArtifactType.HTML]: {
                domain: 'web development',
                name: 'HTML',
                guidelines: [
                    'Use semantic HTML5 elements',
                    'Ensure accessibility (ARIA labels)',
                    'Include proper meta tags',
                    'Make it responsive',
                ],
            },
            [ArtifactType.PYTHON]: {
                domain: 'Python programming',
                name: 'Python scripts',
                guidelines: [
                    'Follow PEP 8 style guidelines',
                    'Include docstrings',
                    'Handle exceptions properly',
                    'Use type hints where appropriate',
                ],
            },
            [ArtifactType.SQL]: {
                domain: 'database management',
                name: 'SQL queries',
                guidelines: [
                    'Write efficient queries',
                    'Use proper indexing hints',
                    'Include comments for complex logic',
                    'Consider performance implications',
                ],
            },
            [ArtifactType.JSON]: {
                domain: 'data configuration',
                name: 'JSON',
                guidelines: [
                    'Ensure valid JSON syntax',
                    'Use meaningful key names',
                    'Include comments where supported',
                    'Follow schema best practices',
                ],
            },
            [ArtifactType.MARKDOWN]: {
                domain: 'documentation',
                name: 'documentation',
                guidelines: [
                    'Use clear headings and structure',
                    'Include code examples',
                    'Add tables for comparisons',
                    'Use proper markdown syntax',
                ],
            },
            [ArtifactType.DIAGRAM]: {
                domain: 'visualization',
                name: 'diagrams',
                guidelines: [
                    'Use clear, descriptive labels',
                    'Follow Mermaid syntax',
                    'Keep diagrams focused and readable',
                    'Use appropriate diagram types',
                ],
            },
            [ArtifactType.ERPNEXT_DOCTYPE]: {
                domain: 'ERPNext development',
                name: 'DocType definitions',
                guidelines: [
                    'Follow ERPNext naming conventions',
                    'Include proper field types',
                    'Add permissions and roles',
                    'Consider workflow requirements',
                ],
            },
            [ArtifactType.FRAPPE_WORKFLOW]: {
                domain: 'Frappe framework',
                name: 'workflows',
                guidelines: [
                    'Define clear states and transitions',
                    'Include proper permissions',
                    'Add validation logic',
                    'Document workflow steps',
                ],
            },
            [ArtifactType.ERPNEXT_FORM_UI]: {
                domain: 'ERPNext UI Development',
                name: 'form interface',
                guidelines: [
                    'Create React form component with TypeScript',
                    'Use useCoAgent hook for state management',
                    'Integrate with ERPNext DocType API',
                    'Add real-time validation and error handling',
                    'Include CopilotKit streaming for better UX',
                ],
            },
            [ArtifactType.ERPNEXT_LIST_VIEW]: {
                domain: 'ERPNext UI Development',
                name: 'list view',
                guidelines: [
                    'Create list view with filters and search',
                    'Add sorting and pagination',
                    'Include bulk actions',
                    'Support export to Excel/PDF',
                ],
            },
            [ArtifactType.ERPNEXT_APP]: {
                domain: 'ERPNext Application Development',
                name: 'complete ERPNext application',
                guidelines: [
                    'Generate complete app structure',
                    'Include necessary DocTypes for the domain',
                    'Add workflows for business processes',
                    'Create forms, list views, reports, and dashboards',
                    'Include documentation and setup instructions',
                ],
            },
            [ArtifactType.ERPNEXT_SERVER_SCRIPT]: {
                domain: 'ERPNext Backend Development',
                name: 'server script',
                guidelines: [
                    'Write Python server-side logic',
                    'Use Frappe framework APIs',
                    'Add proper error handling and logging',
                    'Follow Python best practices (PEP 8)',
                ],
            },
            [ArtifactType.ERPNEXT_CLIENT_SCRIPT]: {
                domain: 'ERPNext Frontend Development',
                name: 'client script',
                guidelines: [
                    'Write JavaScript client-side logic',
                    'Use Frappe JavaScript API',
                    'Add form event handlers and validations',
                    'Consider user experience and feedback',
                ],
            },
            [ArtifactType.ERPNEXT_REPORT]: {
                domain: 'ERPNext Reporting',
                name: 'report definitions',
                guidelines: [
                    'Use Report Builder or Script Report as appropriate',
                    'Optimize queries for performance',
                    'Include filters and date ranges',
                    'Export to Excel/PDF support',
                ],
            },
            [ArtifactType.ERPNEXT_DASHBOARD]: {
                domain: 'ERPNext Analytics',
                name: 'dashboard',
                guidelines: [
                    'Use ERPNext Chart and Card components',
                    'Include key metrics and KPIs',
                    'Real-time data updates',
                    'Responsive design for mobile',
                ],
            },
        };

        return instructions[type];
    }
}

/**
 * Developer Co-Agent
 * ERPNext-focused single best-practice solution generation
 */
export class DeveloperCoAgent extends BaseCoAgent {
    constructor(
        provider: IAIProvider,
        customConfig?: Partial<CoAgentConfig>
    ) {
        super(CoAgentMode.DEVELOPER, provider, customConfig);
    }

    async generateResponse(
        request: VariantGenerationRequest
    ): Promise<CoAgentResponse> {
        try {
            // Build ERPNext-focused system prompt
            const messages: AIMessage[] = [
                {
                    role: 'system',
                    content: this.buildERPNextSystemPrompt(request),
                },
                ...(request.conversationHistory || []),
                {
                    role: 'user',
                    content: request.prompt,
                },
            ];

            // Get AI completion
            const completion = await this.provider.complete(messages, {
                maxTokens: this.config.maxTokens || 4000,
                temperature: this.config.temperature || 0.7,
            });

            // Convert content to string
            const responseText = this.contentToString(completion.content);

            // Extract artifacts from response
            const extractedArtifacts = this.extractArtifactsFromResponse(
                responseText,
                request.artifactType
            );

            let artifact: Artifact;
            if (extractedArtifacts.length > 0) {
                const extracted = extractedArtifacts[0];
                artifact = this.createArtifact(
                    request.artifactType,
                    extracted.title || this.generateDefaultTitle(request),
                    extracted.description || 'ERPNext best-practice solution',
                    extracted.content
                );

                // Add ERPNext-specific metadata
                artifact.approach = this.getERPNextApproach(request.artifactType);
                artifact.features = this.extractFeatures(responseText);
            } else {
                // No code block found, use entire response as artifact
                artifact = this.createArtifact(
                    request.artifactType,
                    this.generateDefaultTitle(request),
                    'ERPNext best-practice solution',
                    responseText
                );
                artifact.approach = this.getERPNextApproach(request.artifactType);
            }

            // Validate artifact
            this.validateArtifact(artifact);

            // Extract explanation
            const explanation = this.extractExplanation(responseText);

            // Convert usage format
            const usage = completion.usage
                ? {
                    promptTokens: completion.usage.input_tokens,
                    completionTokens: completion.usage.output_tokens,
                    totalTokens:
                        completion.usage.input_tokens + completion.usage.output_tokens,
                }
                : undefined;

            // Build response
            return {
                mode: CoAgentMode.DEVELOPER,
                explanation,
                artifacts: [artifact],
                followUpQuestions: this.config.suggestFollowUps
                    ? this.generateFollowUpQuestions([artifact], request.prompt)
                    : undefined,
                usage,
                timestamp: new Date(),
                threadId: request.threadId,
            };
        } catch (error) {
            throw new VariantGenerationError(
                `Failed to generate ERPNext solution: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { originalError: error, request }
            );
        }
    }

    async refineArtifact(request: RefinementRequest): Promise<Artifact> {
        // Refinement in developer mode - not implemented yet
        // Will switch to RefinerCoAgent for this
        throw new Error(
            'Refinement not supported in developer mode. Use refiner mode.'
        );
    }

    /**
     * Build ERPNext-focused system prompt with best practices
     */
    private buildERPNextSystemPrompt(request: VariantGenerationRequest): string {
        let prompt = `You are an expert ERPNext developer co-agent with deep knowledge of Frappe framework.\n\n`;
        
        prompt += `Your role is to generate custom ERPNext applications for ANY industry based on user requirements.\n`;
        prompt += `Generate production-ready, best-practice solutions following ERPNext conventions.\n\n`;
        
        prompt += `Examples of what you can generate:\n`;
        prompt += `- "Create detailed clinic management app" → Generate Patient, Appointment, Medical Record DocTypes with workflows\n`;
        prompt += `- "Generate warehouse management app" → Create Item, Stock Movement, Inventory DocTypes with tracking\n`;
        prompt += `- "Build school management system" → Generate Student, Course, Attendance DocTypes with enrollment workflow\n`;
        prompt += `- "Create retail POS system" → Generate Sales, Payment, Customer DocTypes with point-of-sale interface\n\n`;

        // Add artifact-specific ERPNext guidelines
        const erpnextGuidelines = this.getERPNextGuidelines(request.artifactType);
        if (erpnextGuidelines) {
            prompt += `## ERPNext Best Practices for ${request.artifactType}\n\n`;
            prompt += erpnextGuidelines.map((g) => `- ${g}`).join('\n');
            prompt += '\n\n';
        }

        // Add general ERPNext principles
        prompt += `## General ERPNext Principles\n\n`;
        prompt += `- Follow ERPNext naming conventions (TitleCase for DocTypes, snake_case for fields)\n`;
        prompt += `- Use Frappe framework APIs and utilities\n`;
        prompt += `- Implement proper permissions and role-based access\n`;
        prompt += `- Add client-side and server-side validation\n`;
        prompt += `- Consider mobile responsiveness\n`;
        prompt += `- Include proper error handling\n`;
        prompt += `- Write clean, documented code\n`;
        prompt += `- Use CopilotKit hooks for real-time UI updates when appropriate\n\n`;

        // Add technology stack
        prompt += `## Technology Stack\n\n`;
        prompt += `- Frontend: React with TypeScript, Next.js 15, CopilotKit\n`;
        prompt += `- Backend: Frappe/ERPNext Python APIs\n`;
        prompt += `- Styling: Tailwind CSS, shadcn/ui components\n`;
        prompt += `- State: React hooks (useState, useCoAgent)\n`;
        prompt += `- AI: Anthropic SDK with streaming\n\n`;

        if (request.constraints && request.constraints.length > 0) {
            prompt += `## Specific Requirements\n\n`;
            prompt += request.constraints.map((c) => `- ${c}`).join('\n');
            prompt += '\n\n';
        }

        if (request.preferences && request.preferences.length > 0) {
            prompt += `## User Preferences\n\n`;
            prompt += request.preferences.map((p) => `- ${p}`).join('\n');
            prompt += '\n\n';
        }

        prompt += `## Response Format\n\n`;
        prompt += `Provide a clear explanation followed by the implementation in a code block.\n`;
        prompt += `Use appropriate language tags (tsx, python, json, etc.)\n\n`;

        return prompt;
    }

    /**
     * Get ERPNext-specific guidelines for artifact type
     */
    private getERPNextGuidelines(artifactType: ArtifactType): string[] | null {
        const guidelines: Partial<Record<ArtifactType, string[]>> = {
            [ArtifactType.ERPNEXT_DOCTYPE]: [
                'Define DocType with proper field types (Data, Link, Select, Table, etc.)',
                'Add naming series for auto-numbering',
                'Configure permissions for different roles',
                'Write server-side validation in Python',
                'Add client-side scripts for UI behavior',
                'Include workflow states if approval needed',
                'Add custom print format',
                'Consider relationships with existing ERPNext DocTypes',
            ],
            [ArtifactType.FRAPPE_WORKFLOW]: [
                'Define clear workflow states and transitions',
                'Include proper permissions for each state',
                'Add validation logic before state transitions',
                'Document workflow steps and approvals',
                'Consider role-based access control',
                'Add email notifications for state changes',
            ],
            [ArtifactType.ERPNEXT_FORM_UI]: [
                'Create React form component with TypeScript',
                'Use useCoAgent hook for state management',
                'Integrate with ERPNext DocType API',
                'Add real-time validation',
                'Include proper error handling',
                'Support mobile responsive design',
                'Add loading states and user feedback',
            ],
            [ArtifactType.ERPNEXT_LIST_VIEW]: [
                'Create list view with filters and search',
                'Add sorting and pagination',
                'Include bulk actions',
                'Add custom columns based on requirements',
                'Support export to Excel/PDF',
                'Add real-time data updates',
            ],
            [ArtifactType.ERPNEXT_REPORT]: [
                'Use Script Report for complex queries',
                'Add relevant filters based on domain',
                'Optimize SQL queries with proper indexes',
                'Format currency, date, and numeric fields',
                'Support export to Excel/PDF',
                'Include summary rows and totals',
                'Add chart visualization if applicable',
            ],
            [ArtifactType.ERPNEXT_DASHBOARD]: [
                'Use ERPNext Chart and Number Card components',
                'Display key metrics relevant to the domain',
                'Add date range and custom filters',
                'Include drill-down capabilities',
                'Real-time data updates',
                'Mobile-responsive layout',
                'Color-coded indicators for status',
            ],
            [ArtifactType.ERPNEXT_APP]: [
                'Generate complete ERPNext app structure',
                'Include all necessary DocTypes for the domain',
                'Add workflows for business processes',
                'Create forms and list views',
                'Add reports and dashboards',
                'Include documentation and setup instructions',
                'Add demo data and fixtures',
                'Configure app dependencies',
            ],
            [ArtifactType.ERPNEXT_SERVER_SCRIPT]: [
                'Write Python server-side logic',
                'Use Frappe framework APIs',
                'Add proper error handling',
                'Include logging for debugging',
                'Follow Python best practices (PEP 8)',
                'Add docstrings and comments',
                'Consider performance and security',
            ],
            [ArtifactType.ERPNEXT_CLIENT_SCRIPT]: [
                'Write JavaScript client-side logic',
                'Use Frappe JavaScript API',
                'Add form event handlers (refresh, validate, etc.)',
                'Include field-level validations',
                'Add dynamic field behavior',
                'Consider user experience and feedback',
            ],
        };

        return guidelines[artifactType] || null;
    }

    /**
     * Get ERPNext approach description for artifact type
     */
    private getERPNextApproach(artifactType: ArtifactType): string {
        const approaches: Partial<Record<ArtifactType, string>> = {
            [ArtifactType.ERPNEXT_DOCTYPE]: 'Custom DocType with ERPNext conventions and best practices',
            [ArtifactType.FRAPPE_WORKFLOW]: 'Business process workflow with state management and approvals',
            [ArtifactType.ERPNEXT_FORM_UI]: 'React form component with ERPNext integration and real-time updates',
            [ArtifactType.ERPNEXT_LIST_VIEW]: 'List view with filters, sorting, and bulk actions',
            [ArtifactType.ERPNEXT_REPORT]: 'Optimized ERPNext report with filters and exports',
            [ArtifactType.ERPNEXT_DASHBOARD]: 'Interactive dashboard with real-time ERPNext data',
            [ArtifactType.ERPNEXT_APP]: 'Complete ERPNext application with DocTypes, workflows, and UI',
            [ArtifactType.ERPNEXT_SERVER_SCRIPT]: 'Python server-side logic using Frappe framework',
            [ArtifactType.ERPNEXT_CLIENT_SCRIPT]: 'JavaScript client-side logic for forms and UI',
            [ArtifactType.REACT_COMPONENT]: 'ERPNext-integrated React component with TypeScript',
        };

        return approaches[artifactType] || 'ERPNext best-practice implementation';
    }

    /**
     * Extract key features from response text
     */
    private extractFeatures(responseText: string): string[] {
        const features: string[] = [];
        
        // Look for bullet points that describe features
        const featurePatterns = [
            /(?:^|\n)[-*]\s+([^\n]+)/g,
            /(?:Features?|Capabilities?|Includes?):\s*\n((?:[-*]\s+[^\n]+\n?)+)/gi,
        ];

        for (const pattern of featurePatterns) {
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                if (match[1]) {
                    const feature = match[1].trim();
                    if (feature.length > 10 && feature.length < 150) {
                        features.push(feature);
                    }
                }
            }
        }

        // Deduplicate and return top 5
        return [...new Set(features)].slice(0, 5);
    }

    /**
     * Extract explanation from response
     */
    private extractExplanation(response: string): string {
        // Extract text before first code block
        const codeBlockIndex = response.indexOf('```');
        if (codeBlockIndex > 0) {
            return response.substring(0, codeBlockIndex).trim();
        }

        // If no code block, return first 2 paragraphs
        const paragraphs = response.split('\n\n');
        return paragraphs.slice(0, 2).join('\n\n').trim();
    }

    /**
     * Generate default title for ERPNext artifacts
     */
    private generateDefaultTitle(request: VariantGenerationRequest): string {
        const typeNames: Record<ArtifactType, string> = {
            [ArtifactType.CODE]: 'Generated Code',
            [ArtifactType.REACT_COMPONENT]: 'React Component',
            [ArtifactType.HTML]: 'HTML Page',
            [ArtifactType.PYTHON]: 'Python Script',
            [ArtifactType.SQL]: 'SQL Query',
            [ArtifactType.JSON]: 'JSON Configuration',
            [ArtifactType.MARKDOWN]: 'Documentation',
            [ArtifactType.DIAGRAM]: 'Diagram',
            [ArtifactType.ERPNEXT_DOCTYPE]: 'ERPNext DocType',
            [ArtifactType.FRAPPE_WORKFLOW]: 'Frappe Workflow',
            [ArtifactType.ERPNEXT_FORM_UI]: 'Form Interface',
            [ArtifactType.ERPNEXT_LIST_VIEW]: 'List View',
            [ArtifactType.ERPNEXT_REPORT]: 'ERPNext Report',
            [ArtifactType.ERPNEXT_DASHBOARD]: 'ERPNext Dashboard',
            [ArtifactType.ERPNEXT_APP]: 'ERPNext Application',
            [ArtifactType.ERPNEXT_SERVER_SCRIPT]: 'Server Script',
            [ArtifactType.ERPNEXT_CLIENT_SCRIPT]: 'Client Script',
        };

        return typeNames[request.artifactType] || 'ERPNext Artifact';
    }
}

/**
 * Analyzer Co-Agent
 * Deep analysis with visualizations and insights
 */
export class AnalyzerCoAgent extends BaseCoAgent {
    constructor(
        provider: IAIProvider,
        customConfig?: Partial<CoAgentConfig>
    ) {
        super(CoAgentMode.ANALYZER, provider, customConfig);
    }

    async generateResponse(
        request: VariantGenerationRequest
    ): Promise<CoAgentResponse> {
        // Analyzer implementation - to be completed in next iteration
        throw new Error('Analyzer mode not yet implemented');
    }

    async refineArtifact(request: RefinementRequest): Promise<Artifact> {
        throw new Error('Refinement not supported in analyzer mode');
    }
}

/**
 * Refiner Co-Agent
 * Iteratively refines existing artifacts
 */
export class RefinerCoAgent extends BaseCoAgent {
    constructor(
        provider: IAIProvider,
        customConfig?: Partial<CoAgentConfig>
    ) {
        super(CoAgentMode.REFINER, provider, customConfig);
    }

    async generateResponse(
        request: VariantGenerationRequest
    ): Promise<CoAgentResponse> {
        // Refiner works with existing artifacts, not fresh generation
        if (!request.existingArtifact) {
            throw new Error('Refiner mode requires an existing artifact to refine');
        }

        // Convert to refinement request
        const refinementRequest: RefinementRequest = {
            artifactId: request.existingArtifact.id,
            instructions: request.prompt,
            threadId: request.threadId,
        };

        const refinedArtifact = await this.refineArtifact(refinementRequest);

        return {
            mode: CoAgentMode.REFINER,
            explanation: 'Refined artifact based on your feedback',
            artifacts: [refinedArtifact],
            timestamp: new Date(),
            threadId: request.threadId,
        };
    }

    async refineArtifact(request: RefinementRequest): Promise<Artifact> {
        // Refiner implementation - to be completed in next iteration
        throw new Error('Refiner mode not yet fully implemented');
    }
}
