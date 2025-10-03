/**
 * Hybrid Co-Agent Mode
 * 
 * Intelligent input handling that adapts to different user input types:
 * 1. PRD Document → Parse and generate based on detailed specs
 * 2. Simple Prompt → Analyze, recommend structure, get approval
 * 3. Detailed Prompt → Generate directly
 * 4. Template Request → Use official ERPNext templates
 */

import {
    IAIProvider,
    AIMessage,
} from '../ai/types';
import { BaseCoAgent } from './base';
import {
    CoAgentMode,
    CoAgentConfig,
    CoAgentResponse,
    ArtifactType,
    HybridGenerationRequest,
    InputAnalysis,
    InputType,
    RecommendedPrompt,
} from './types';

/**
 * Official ERPNext templates database
 */
const OFFICIAL_TEMPLATES = {
    healthcare: {
        name: 'Healthcare',
        description: 'Patient management, appointments, and medical records',
        docTypes: ['Patient', 'Patient Appointment', 'Clinical Procedure', 'Lab Test'],
        url: 'https://erpnext.com/docs/user/manual/en/healthcare',
    },
    education: {
        name: 'Education',
        description: 'Student enrollment, courses, and fee management',
        docTypes: ['Student', 'Program', 'Course', 'Fee Structure', 'Student Attendance'],
        url: 'https://erpnext.com/docs/user/manual/en/education',
    },
    manufacturing: {
        name: 'Manufacturing',
        description: 'Production planning, BOM, and work orders',
        docTypes: ['BOM', 'Work Order', 'Job Card', 'Production Plan'],
        url: 'https://erpnext.com/docs/user/manual/en/manufacturing',
    },
    retail: {
        name: 'Retail',
        description: 'Point of Sale, inventory, and customer management',
        docTypes: ['POS Profile', 'POS Invoice', 'Item', 'Stock Entry'],
        url: 'https://erpnext.com/docs/user/manual/en/accounts/pos-invoice',
    },
    hospitality: {
        name: 'Hospitality',
        description: 'Hotel management, bookings, and restaurant operations',
        docTypes: ['Hotel Room', 'Hotel Room Reservation', 'Restaurant', 'Restaurant Menu'],
        url: 'https://erpnext.com/docs/user/manual/en/hospitality',
    },
    agriculture: {
        name: 'Agriculture',
        description: 'Crop management, land records, and farm operations',
        docTypes: ['Crop', 'Crop Cycle', 'Land Unit', 'Weather', 'Soil Analysis'],
        url: 'https://erpnext.com/docs/user/manual/en/agriculture',
    },
    nonprofit: {
        name: 'Non-Profit',
        description: 'Donor management, grants, and volunteers',
        docTypes: ['Member', 'Membership', 'Donor', 'Grant Application', 'Volunteer'],
        url: 'https://erpnext.com/docs/user/manual/en/non_profit',
    },
};

/**
 * Hybrid Co-Agent with intelligent input handling
 */
export class HybridCoAgent extends BaseCoAgent {
    constructor(
        provider: IAIProvider,
        customConfig?: Partial<CoAgentConfig>
    ) {
        super(CoAgentMode.DEVELOPER, provider, customConfig);
    }

    /**
     * Main entry point - intelligently handles different input types
     */
    async generateResponse(
        request: HybridGenerationRequest
    ): Promise<CoAgentResponse> {
        // Step 1: Analyze input type if not already analyzed
        if (request.analyzeFirst || !request.inputAnalysis) {
            const analysis = await this.analyzeInput(request.prompt);
            request.inputAnalysis = analysis;

            // If simple prompt, return recommendation instead of generating
            if (analysis.type === InputType.SIMPLE_PROMPT) {
                return await this.recommendStructure(request, analysis);
            }

            // If template request detected, return template options
            if (analysis.type === InputType.TEMPLATE_REQUEST) {
                return await this.suggestTemplates(request, analysis);
            }
        }

        // Step 2: Handle based on input type
        switch (request.inputAnalysis?.type) {
            case InputType.PRD:
                return await this.generateFromPRD(request);

            case InputType.DETAILED_PROMPT:
                return await this.generateFromDetailedPrompt(request);

            case InputType.TEMPLATE_REQUEST:
                return await this.generateFromTemplate(request);

            default:
                // Fallback to detailed prompt generation
                return await this.generateFromDetailedPrompt(request);
        }
    }

    /**
     * Analyze user input to determine type and extract key information
     */
    private async analyzeInput(prompt: string): Promise<InputAnalysis> {
        const analysisPrompt = `Analyze this user input for ERPNext app generation and classify it:

User Input: "${prompt}"

Determine:
1. Input Type: Is it a PRD (detailed requirements doc), simple prompt (vague/brief), detailed prompt (clear requirements), or template request (asking for existing ERPNext module)?
2. Domain: What industry/domain is this for? (healthcare, education, retail, manufacturing, etc.)
3. Key Entities: What main entities/DocTypes would be needed?
4. Missing Info: What critical information is missing?
5. Confidence: How confident are you in the detection (0-1)?

Respond in JSON format:
{
  "type": "prd|simple_prompt|detailed_prompt|template_request",
  "domain": "detected domain",
  "confidence": 0.0-1.0,
  "entities": ["entity1", "entity2"],
  "missingInfo": ["info1", "info2"],
  "clarificationQuestions": ["question1", "question2"]
}`;

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: 'You are an expert at analyzing requirements for ERPNext applications. Respond ONLY with valid JSON.',
            },
            {
                role: 'user',
                content: analysisPrompt,
            },
        ];

        const completion = await this.provider.complete(messages, {
            maxTokens: 1000,
            temperature: 0.3, // Lower temperature for consistent analysis
        });

        const responseText = this.contentToString(completion.content);

        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);

            return {
                type: this.normalizeInputType(analysis.type),
                domain: analysis.domain,
                confidence: analysis.confidence || 0.7,
                entities: analysis.entities || [],
                missingInfo: analysis.missingInfo || [],
                clarificationQuestions: analysis.clarificationQuestions || [],
            };
        } catch (error) {
            // Fallback: simple heuristic detection
            return this.fallbackAnalysis(prompt);
        }
    }

    /**
     * Normalize input type string to enum
     */
    private normalizeInputType(type: string): InputType {
        const lowerType = type.toLowerCase().replace(/[_-]/g, '');

        if (lowerType.includes('prd') || lowerType.includes('document')) {
            return InputType.PRD;
        }
        if (lowerType.includes('simple') || lowerType.includes('vague')) {
            return InputType.SIMPLE_PROMPT;
        }
        if (lowerType.includes('template') || lowerType.includes('official')) {
            return InputType.TEMPLATE_REQUEST;
        }

        return InputType.DETAILED_PROMPT;
    }

    /**
     * Fallback analysis using simple heuristics
     */
    private fallbackAnalysis(prompt: string): InputAnalysis {
        const lowerPrompt = prompt.toLowerCase();

        // Check for template request keywords
        if (
            lowerPrompt.includes('official') ||
            lowerPrompt.includes('template') ||
            lowerPrompt.includes('existing') ||
            lowerPrompt.includes('standard')
        ) {
            return {
                type: InputType.TEMPLATE_REQUEST,
                domain: this.detectDomain(prompt),
                confidence: 0.7,
                entities: [],
            };
        }

        // Check for PRD indicators
        if (
            prompt.length > 500 ||
            lowerPrompt.includes('requirements') ||
            lowerPrompt.includes('specification')
        ) {
            return {
                type: InputType.PRD,
                domain: this.detectDomain(prompt),
                confidence: 0.8,
                entities: [],
            };
        }

        // Check for simple/vague prompts
        if (prompt.split(' ').length < 10 || !lowerPrompt.includes('with')) {
            return {
                type: InputType.SIMPLE_PROMPT,
                domain: this.detectDomain(prompt),
                confidence: 0.6,
                entities: [],
                missingInfo: ['DocTypes needed', 'Key features', 'Workflows'],
                clarificationQuestions: [
                    'What are the main entities you want to manage?',
                    'What workflows do you need?',
                    'What reports and dashboards would be helpful?',
                ],
            };
        }

        return {
            type: InputType.DETAILED_PROMPT,
            domain: this.detectDomain(prompt),
            confidence: 0.7,
            entities: [],
        };
    }

    /**
     * Detect domain from prompt
     */
    private detectDomain(prompt: string): string {
        const lowerPrompt = prompt.toLowerCase();

        const domainKeywords: Record<string, string[]> = {
            healthcare: ['clinic', 'hospital', 'patient', 'doctor', 'medical', 'health'],
            education: ['school', 'student', 'course', 'university', 'college', 'education'],
            retail: ['pos', 'shop', 'store', 'retail', 'sales', 'customer'],
            manufacturing: ['production', 'manufacturing', 'factory', 'bom', 'work order'],
            hospitality: ['hotel', 'restaurant', 'booking', 'reservation', 'room'],
            agriculture: ['farm', 'crop', 'agriculture', 'livestock', 'harvest'],
            nonprofit: ['donor', 'volunteer', 'member', 'grant', 'nonprofit', 'ngo'],
            warehouse: ['warehouse', 'inventory', 'stock', 'logistics'],
        };

        for (const [domain, keywords] of Object.entries(domainKeywords)) {
            if (keywords.some((keyword) => lowerPrompt.includes(keyword))) {
                return domain;
            }
        }

        return 'general';
    }

    /**
     * Generate recommended structure for simple prompts
     */
    private async recommendStructure(
        request: HybridGenerationRequest,
        analysis: InputAnalysis
    ): Promise<CoAgentResponse> {
        const recommendationPrompt = `The user provided this simple prompt: "${request.prompt}"

Domain detected: ${analysis.domain}

Based on ERPNext best practices, recommend a comprehensive structure for this application.

Include:
1. Enhanced prompt that includes all necessary details
2. Suggested DocTypes with descriptions and key fields
3. Suggested workflows with states
4. Suggested features
5. Relevant official ERPNext templates if applicable

Provide recommendations that would make a production-ready ERPNext application.`;

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an ERPNext expert helping users define their application requirements. 
Provide comprehensive, production-ready recommendations.`,
            },
            {
                role: 'user',
                content: recommendationPrompt,
            },
        ];

        const completion = await this.provider.complete(messages, {
            maxTokens: 2000,
            temperature: 0.7,
        });

        const responseText = this.contentToString(completion.content);

        // Create recommendation artifact
        const recommendationArtifact = this.createArtifact(
            ArtifactType.MARKDOWN,
            'Recommended Application Structure',
            `Comprehensive recommendations for: ${request.prompt}`,
            responseText
        );

        return {
            mode: CoAgentMode.DEVELOPER,
            explanation: `I've analyzed your request and created a comprehensive recommendation. Please review the suggested structure and let me know if you'd like to:
1. **Proceed with generation** using this recommendation
2. **Modify** the recommendation before generation
3. **Use an official ERPNext template** as a starting point`,
            artifacts: [recommendationArtifact],
            followUpQuestions: [
                'Would you like me to generate the application based on this recommendation?',
                'Should I modify any of the suggested DocTypes or workflows?',
                'Would you prefer to start with an official ERPNext template?',
            ],
            timestamp: new Date(),
            threadId: request.threadId,
        };
    }

    /**
     * Suggest relevant official ERPNext templates
     */
    private async suggestTemplates(
        request: HybridGenerationRequest,
        analysis: InputAnalysis
    ): Promise<CoAgentResponse> {
        // Find relevant templates
        const relevantTemplates = Object.entries(OFFICIAL_TEMPLATES)
            .filter(([key]) => key === analysis.domain || analysis.entities.some(e => 
                OFFICIAL_TEMPLATES[key as keyof typeof OFFICIAL_TEMPLATES]?.docTypes
                    .some((dt: string) => dt.toLowerCase().includes(e.toLowerCase()))
            ))
            .map(([_, template]) => template);

        let explanation = `I detected you're looking for **${analysis.domain}** functionality. `;

        if (relevantTemplates.length > 0) {
            explanation += `ERPNext has official templates for this domain:\n\n`;
            relevantTemplates.forEach((template) => {
                explanation += `### ${template.name}\n`;
                explanation += `${template.description}\n`;
                explanation += `**Includes:** ${template.docTypes.join(', ')}\n`;
                explanation += `[Documentation](${template.url})\n\n`;
            });
            explanation += `\nWould you like to:\n`;
            explanation += `1. **Use official template** as starting point and customize\n`;
            explanation += `2. **Generate custom solution** from scratch\n`;
            explanation += `3. **Combine** official template with custom requirements`;
        } else {
            explanation += `I don't see an exact official ERPNext template match, but I can generate a custom solution for you.`;
        }

        const templateArtifact = this.createArtifact(
            ArtifactType.MARKDOWN,
            'Official ERPNext Templates',
            `Relevant templates for ${analysis.domain}`,
            JSON.stringify(relevantTemplates, null, 2)
        );

        return {
            mode: CoAgentMode.DEVELOPER,
            explanation,
            artifacts: [templateArtifact],
            followUpQuestions: [
                'Would you like to use an official template?',
                'Should I generate a custom solution instead?',
                'Do you want to combine template with custom requirements?',
            ],
            timestamp: new Date(),
            threadId: request.threadId,
        };
    }

    /**
     * Generate from PRD document
     */
    private async generateFromPRD(
        request: HybridGenerationRequest
    ): Promise<CoAgentResponse> {
        // Enhanced prompt with PRD context
        const enhancedPrompt = `Generate ERPNext application based on this Product Requirements Document:

${request.prdDocument || request.prompt}

Parse the requirements and generate:
1. All necessary DocTypes with proper field definitions
2. Workflows for business processes
3. Forms and list views
4. Reports and dashboards
5. Server and client scripts as needed

Follow ERPNext best practices and ensure production-ready code.`;

        // Delegate to detailed prompt generation
        return await this.generateFromDetailedPrompt({
            ...request,
            prompt: enhancedPrompt,
        });
    }

    /**
     * Generate from detailed prompt (core generation logic)
     */
    private async generateFromDetailedPrompt(
        request: HybridGenerationRequest
    ): Promise<CoAgentResponse> {
        // Build ERPNext-focused system prompt
        const systemPrompt = this.buildERPNextSystemPrompt(request);

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: systemPrompt,
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

        let artifact;
        if (extractedArtifacts.length > 0) {
            const extracted = extractedArtifacts[0];
            artifact = this.createArtifact(
                request.artifactType,
                extracted.title || this.generateDefaultTitle(request.artifactType),
                extracted.description || 'ERPNext best-practice solution',
                extracted.content
            );
        } else {
            // No code block found, use entire response as artifact
            artifact = this.createArtifact(
                request.artifactType,
                this.generateDefaultTitle(request.artifactType),
                'ERPNext best-practice solution',
                responseText
            );
        }

        // Validate artifact
        this.validateArtifact(artifact);

        // Build response
        return {
            mode: CoAgentMode.DEVELOPER,
            explanation: this.extractExplanation(responseText),
            artifacts: [artifact],
            followUpQuestions: [
                'Would you like me to add more features?',
                'Should I generate additional components?',
                'Do you want me to explain any part in detail?',
            ],
            timestamp: new Date(),
            threadId: request.threadId,
        };
    }

    /**
     * Build ERPNext system prompt
     */
    private buildERPNextSystemPrompt(request: HybridGenerationRequest): string {
        let prompt = `You are an expert ERPNext developer co-agent.\n\n`;
        prompt += `Generate production-ready ERPNext applications following best practices.\n\n`;

        if (request.inputAnalysis?.domain) {
            prompt += `Domain: ${request.inputAnalysis.domain}\n\n`;
        }

        prompt += `Follow ERPNext conventions:\n`;
        prompt += `- TitleCase for DocTypes, snake_case for fields\n`;
        prompt += `- Use Frappe framework APIs\n`;
        prompt += `- Include proper validation and permissions\n`;
        prompt += `- Add client and server scripts as needed\n`;
        prompt += `- Consider mobile responsiveness\n\n`;

        return prompt;
    }

    /**
     * Generate default title for artifact type
     */
    private generateDefaultTitle(artifactType: ArtifactType): string {
        const titles: Record<string, string> = {
            [ArtifactType.ERPNEXT_DOCTYPE]: 'ERPNext DocType',
            [ArtifactType.ERPNEXT_APP]: 'ERPNext Application',
            [ArtifactType.ERPNEXT_FORM_UI]: 'Form Interface',
            [ArtifactType.ERPNEXT_REPORT]: 'ERPNext Report',
        };
        return titles[artifactType] || 'ERPNext Artifact';
    }

    /**
     * Extract explanation from response
     */
    private extractExplanation(response: string): string {
        const codeBlockIndex = response.indexOf('```');
        if (codeBlockIndex > 0) {
            return response.substring(0, codeBlockIndex).trim();
        }
        return response.split('\n\n').slice(0, 2).join('\n\n').trim();
    }

    /**
     * Refine artifact (required by BaseCoAgent)
     */
    async refineArtifact(): Promise<any> {
        throw new Error('Use refiner mode for artifact refinement');
    }

    /**
     * Generate from official ERPNext template
     */
    private async generateFromTemplate(
        request: HybridGenerationRequest
    ): Promise<CoAgentResponse> {
        const templateName = request.templateName || request.inputAnalysis?.domain;
        const template = templateName ? OFFICIAL_TEMPLATES[templateName as keyof typeof OFFICIAL_TEMPLATES] : null;

        if (!template) {
            return await this.suggestTemplates(request, request.inputAnalysis!);
        }

        const enhancedPrompt = `Generate ERPNext application based on the official ${template.name} template.

Official template includes: ${template.docTypes.join(', ')}

User's additional requirements: ${request.prompt}

Extend the official template with:
1. Custom fields and validations as needed
2. Additional DocTypes for specific requirements
3. Enhanced workflows
4. Custom reports and dashboards
5. Integration scripts

Reference: ${template.url}

Ensure compatibility with ERPNext's official ${template.name} module while adding custom functionality.`;

        return await this.generateFromDetailedPrompt({
            ...request,
            prompt: enhancedPrompt,
        });
    }

    /**
     * Helper to continue generation after user approval
     */
    async continueWithApprovedRecommendation(
        request: HybridGenerationRequest,
        approvedPrompt: string
    ): Promise<CoAgentResponse> {
        return await this.generateFromDetailedPrompt({
            ...request,
            prompt: approvedPrompt,
            approvedRecommendation: true,
        });
    }
}
